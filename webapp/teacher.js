import { RESULTS_COLLECTION } from "./firebase-config.js";
import { listDocs } from "./firestore-rest.js";
import { GATES, OPTION_LETTERS } from "./gates.js";

const POLL_INTERVAL_MS = 5000;

const app = document.getElementById("app");
const seenIds = new Set();
let firstLoad = true;

function fmtWhen(ts) {
  if (!ts) return "just now";
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function render(attempts) {
  if (attempts.length === 0) {
    app.innerHTML = `
      <h1 style="font-size:1.7rem;margin:32px 0 6px;">Live results</h1>
      <p style="color:var(--ink-soft)">Waiting for the first completed episode…</p>
      <div class="empty-state">No attempts yet. This page updates the moment a student finishes the quiz — nothing to refresh.</div>
    `;
    return;
  }

  const total = attempts.length;
  const avgScore = attempts.reduce((sum, a) => sum + a.score, 0) / total;
  const mostRecent = attempts[0];
  const skippedCount = attempts.filter((a) => a.skippedWithoutListening).length;
  const relistenedCount = attempts.filter((a) => a.relistened).length;

  // per-gate tallies
  const gateStats = GATES.map((g, gi) => {
    const counts = [0, 0, 0, 0];
    let correctCount = 0;
    attempts.forEach((a) => {
      const rec = a.answers && a.answers[gi];
      if (!rec || rec.selected === null || rec.selected === undefined) return;
      counts[rec.selected]++;
      if (rec.correct) correctCount++;
    });
    const answeredTotal = counts.reduce((s, c) => s + c, 0);
    const accuracyPct = answeredTotal ? Math.round((correctCount / answeredTotal) * 100) : 0;
    // most-picked wrong option
    let topMiss = -1;
    counts.forEach((c, oi) => {
      if (oi === g.correct) return;
      if (topMiss === -1 || c > counts[topMiss]) topMiss = oi;
    });
    if (topMiss !== -1 && counts[topMiss] === 0) topMiss = -1;
    return { counts, answeredTotal, accuracyPct, topMiss };
  });

  app.innerHTML = `
    <h1 style="font-size:1.7rem;margin:32px 0 6px;">Live results</h1>
    <p style="color:var(--ink-soft)">Updates automatically as students complete the episode. No refresh needed.</p>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Completions</div><div class="stat-value accent">${total}</div></div>
      <div class="stat-card"><div class="stat-label">Average score</div><div class="stat-value">${avgScore.toFixed(1)} <span style="font-size:1rem;color:var(--ink-faint)">/ ${GATES.length}</span></div></div>
      <div class="stat-card"><div class="stat-label">Most recent</div><div class="stat-value" style="font-size:1.1rem;">${escapeHtml(mostRecent.studentName)}</div></div>
      <div class="stat-card"><div class="stat-label">Last activity</div><div class="stat-value" style="font-size:1.1rem;">${fmtWhen(mostRecent.completedAt)}</div></div>
      <div class="stat-card"><div class="stat-label">Skipped w/o listening</div><div class="stat-value${skippedCount ? " warn" : ""}">${skippedCount}</div></div>
      <div class="stat-card"><div class="stat-label">Relistened</div><div class="stat-value">${relistenedCount}</div></div>
    </div>

    <div class="section-title">
      <h2>Per-question breakdown</h2>
      <span class="hint">Green = correct answer. Red bar = most-picked wrong answer.</span>
    </div>
    <div class="gate-grid">
      ${GATES.map((g, gi) => {
        const s = gateStats[gi];
        const pillClass = s.accuracyPct >= 70 ? "" : s.accuracyPct >= 40 ? "mid" : "low";
        const diagnostic =
          s.topMiss !== -1 && g.misconceptions[s.topMiss]
            ? `<div class="diagnostic"><strong>${OPTION_LETTERS[s.topMiss]}</strong> is the most-picked wrong answer — ${escapeHtml(g.misconceptions[s.topMiss])}</div>`
            : "";
        return `
        <div class="gate-card">
          <div class="gate-head">
            <div>
              <div class="gate-eyebrow">${g.label} · ${g.type}</div>
              <h3>${escapeHtml(g.question)}</h3>
            </div>
            <span class="acc-pill ${pillClass}">${s.answeredTotal ? s.accuracyPct + "% correct" : "no data"}</span>
          </div>
          ${g.options
            .map((opt, oi) => {
              const count = s.counts[oi];
              const pct = s.answeredTotal ? (count / s.answeredTotal) * 100 : 0;
              const rowClass = oi === g.correct ? "is-correct" : oi === s.topMiss ? "is-top-miss" : "";
              return `
              <div class="bar-row ${rowClass}">
                <span class="bar-letter">${OPTION_LETTERS[oi]}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
                <span class="bar-count num">${count}</span>
              </div>`;
            })
            .join("")}
          ${diagnostic}
        </div>`;
      }).join("")}
    </div>

    <div class="section-title">
      <h2>Roster</h2>
      <span class="hint">${total} completed</span>
    </div>
    <table class="roster">
      <thead><tr><th>Student</th><th>Score</th><th>Completed</th><th>Notes</th></tr></thead>
      <tbody>
        ${attempts
          .map((a) => {
            const isNew = !seenIds.has(a.id) && !firstLoad;
            const notes = [
              a.skippedWithoutListening ? `<span class="chip note-chip warn">Skipped, never listened</span>` : "",
              a.relistened ? `<span class="chip note-chip">Relistened</span>` : "",
            ]
              .filter(Boolean)
              .join(" ");
            return `
            <tr class="${isNew ? "new-row" : ""}">
              <td>${escapeHtml(a.studentName)}</td>
              <td class="score-cell">${a.score} / ${GATES.length}</td>
              <td class="mono">${fmtWhen(a.completedAt)}</td>
              <td>${notes || "—"}</td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  `;

  attempts.forEach((a) => seenIds.add(a.id));
  firstLoad = false;
}

async function poll() {
  try {
    const attempts = await listDocs(RESULTS_COLLECTION);
    attempts.sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0));
    render(attempts);
  } catch (err) {
    app.innerHTML = `<p style="padding-top:60px;color:var(--bad)">Couldn't connect to live results. (${err.message})</p>`;
  }
}

function boot() {
  poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

boot();
