import { RESULTS_COLLECTION } from "./firebase-config.js";
import { createDoc } from "./firestore-rest.js";
import { GATES, OPTION_LETTERS } from "./gates.js";

const AUDIO_SRC = "../lesson-episode/audio.mp3";
const TRANSCRIPT_SRC = "../lesson-episode/transcript.json";
const DEFAULT_VOLUME = 0.7;
const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const PENDING_KEY = "echoclass_pending_results";

// If a result couldn't reach the server (blocked wifi, dead connection), keep
// it in localStorage and try again next time this page loads on this device.
function queuePendingResult(payload) {
  try {
    const queue = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
    queue.push(payload);
    localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
  } catch {
    // localStorage unavailable (private browsing, storage full) — nothing more we can do
  }
}

async function flushPendingResults() {
  let queue;
  try {
    queue = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch {
    return;
  }
  if (queue.length === 0) return;
  const stillPending = [];
  for (const payload of queue) {
    try {
      await createDoc(RESULTS_COLLECTION, { ...payload, completedAt: new Date(payload.completedAt) });
    } catch {
      stillPending.push(payload);
    }
  }
  localStorage.setItem(PENDING_KEY, JSON.stringify(stillPending));
}

const app = document.getElementById("app");
const state = {
  studentName: "",
  transcript: null,
  flatWords: [], // {lineIndex, wordIndex, start, end}
  audio: null,
  answers: new Array(GATES.length).fill(null),
  submitted: false,
  everListened: false, // real playback progress happened at least once
  everSkippedToQuiz: false, // "skip to quiz" was used at least once
  relistenCount: 0,
};

const playIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2.5v11l10-5.5-10-5.5Z" fill="currentColor"/></svg>`;
const pauseIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3.5" y="2.5" width="3" height="11" rx="0.5" fill="currentColor"/><rect x="9.5" y="2.5" width="3" height="11" rx="0.5" fill="currentColor"/></svg>`;

function fmtTime(s) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ---------- Screen 1: intro ----------
function renderIntro() {
  app.innerHTML = `
    <div class="intro">
      <span class="eyebrow">Lesson Episode</span>
      <h1>What's Actually Inside You Right Now</h1>
      <p>A ~7-minute audio lesson on cell theory, walked through by Maya and Sam, with a four-question check-in at the end. Play it through once, no pausing needed — the transcript follows along on its own.</p>
      <label class="field-label" for="name-input">Your name (so your results show up correctly)</label>
      <input id="name-input" class="text-input" type="text" placeholder="e.g. Priya" autocomplete="name" />
      <div style="margin-top:22px;">
        <button id="start-btn" class="btn btn-primary" disabled>Start episode</button>
      </div>
    </div>
  `;
  const input = document.getElementById("name-input");
  const startBtn = document.getElementById("start-btn");
  input.addEventListener("input", () => {
    startBtn.disabled = input.value.trim().length === 0;
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !startBtn.disabled) startBtn.click();
  });
  startBtn.addEventListener("click", () => {
    state.studentName = input.value.trim();
    renderEpisode();
  });
  input.focus();
}

// ---------- Screen 2: player + transcript ----------
function renderEpisode() {
  const lines = state.transcript;
  app.innerHTML = `
    <div class="player-card">
      <div class="player-row">
        <button id="play-btn" class="play-btn" aria-label="Play">${playIcon}</button>
        <div class="seek-wrap">
          <input id="seek" class="seek" type="range" min="0" max="1000" value="0" aria-label="Seek" />
          <div class="time-row"><span id="time-current">0:00</span><span id="time-total">0:00</span></div>
        </div>
      </div>
      <div class="controls-row">
        <div class="control-group">
          <span class="field-label">Speed</span>
          ${[0.75, 1, 1.25, 1.5]
            .map(
              (r) =>
                `<button class="chip speed-chip" data-rate="${r}" aria-pressed="${r === 1}">${r}×</button>`
            )
            .join("")}
        </div>
        <div class="control-group">
          <span class="field-label">Volume</span>
          <input id="volume" class="volume-slider" type="range" min="0" max="100" value="${Math.round(DEFAULT_VOLUME * 100)}" aria-label="Volume" />
          <span class="volume-value" id="volume-value">${Math.round(DEFAULT_VOLUME * 100)}%</span>
        </div>
      </div>
      <p id="audio-error" class="audio-error" hidden>Having trouble loading the audio. Check your connection and try reloading this page — or use "Skip to quiz" below if you need to move on.</p>
    </div>
    <div id="transcript" class="transcript">
      ${lines
        .map(
          (line, li) => `
        <div class="line speaker-${line.speaker}" id="line-${li}" data-start="${line.start}" data-end="${line.end}">
          <div class="who">${line.speaker}</div>
          <p>${line.words
            .map((w, wi) => `<span class="w" id="w-${li}-${wi}">${escapeHtml(w.text)}</span>`)
            .join(" ")}</p>
        </div>`
        )
        .join("")}
    </div>
    <div class="quiz-notice">
      <p>A short 4-question check-in loads automatically once the episode ends.</p>
      <button id="skip-to-quiz-btn" class="btn btn-ghost">Skip to quiz →</button>
    </div>
  `;

  const audio = new Audio(AUDIO_SRC);
  audio.preload = "metadata";
  audio.volume = DEFAULT_VOLUME;
  state.audio = audio;

  audio.addEventListener("error", () => {
    document.getElementById("audio-error").hidden = false;
  });

  const playBtn = document.getElementById("play-btn");
  const seek = document.getElementById("seek");
  const timeCurrent = document.getElementById("time-current");
  const timeTotal = document.getElementById("time-total");
  const volume = document.getElementById("volume");
  const volumeValue = document.getElementById("volume-value");
  let seeking = false;

  volume.addEventListener("input", () => {
    const v = parseInt(volume.value, 10);
    audio.volume = v / 100;
    volumeValue.textContent = `${v}%`;
  });

  audio.addEventListener("loadedmetadata", () => {
    timeTotal.textContent = fmtTime(audio.duration);
  });

  playBtn.addEventListener("click", () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });
  audio.addEventListener("play", () => {
    playBtn.innerHTML = pauseIcon;
    playBtn.setAttribute("aria-label", "Pause");
    requestAnimationFrame(tick);
  });
  audio.addEventListener("pause", () => {
    playBtn.innerHTML = playIcon;
    playBtn.setAttribute("aria-label", "Play");
  });

  seek.addEventListener("input", () => {
    seeking = true;
    const t = (seek.value / 1000) * (audio.duration || 0);
    timeCurrent.textContent = fmtTime(t);
  });
  seek.addEventListener("change", () => {
    const t = (seek.value / 1000) * (audio.duration || 0);
    audio.currentTime = t;
    seeking = false;
    highlightAt(t, true);
  });

  document.querySelectorAll(".speed-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const rate = parseFloat(chip.dataset.rate);
      audio.playbackRate = rate;
      document.querySelectorAll(".speed-chip").forEach((c) => c.setAttribute("aria-pressed", c === chip));
    });
  });

  audio.addEventListener("timeupdate", () => {
    if (!seeking) {
      seek.value = audio.duration ? (audio.currentTime / audio.duration) * 1000 : 0;
      timeCurrent.textContent = fmtTime(audio.currentTime);
    }
    if (audio.currentTime > 2) state.everListened = true;
  });

  audio.addEventListener("ended", () => {
    renderQuiz();
  });

  document.getElementById("skip-to-quiz-btn").addEventListener("click", () => {
    state.everSkippedToQuiz = true;
    audio.pause();
    renderQuiz();
  });

  let lastLineIndex = -1;
  function highlightAt(t, forceScroll) {
    const idx = findWordIndex(t);
    if (idx === -1) return;
    const { lineIndex, wordIndex } = state.flatWords[idx];
    document.querySelectorAll(".w.current").forEach((el) => el.classList.remove("current"));
    document.querySelectorAll(".w.said").forEach((el) => el.classList.remove("said"));
    const line = state.transcript[lineIndex];
    for (let wi = 0; wi < line.words.length; wi++) {
      const el = document.getElementById(`w-${lineIndex}-${wi}`);
      if (!el) continue;
      if (wi < wordIndex) el.classList.add("said");
      if (wi === wordIndex) el.classList.add("current");
    }
    if (lineIndex !== lastLineIndex || forceScroll) {
      document.querySelectorAll(".line.active").forEach((el) => el.classList.remove("active"));
      const lineEl = document.getElementById(`line-${lineIndex}`);
      if (lineEl) {
        lineEl.classList.add("active");
        lineEl.scrollIntoView({ block: "center", behavior: REDUCE_MOTION ? "auto" : "smooth" });
      }
      lastLineIndex = lineIndex;
    }
  }

  function tick() {
    if (audio.paused || audio.ended) return;
    highlightAt(audio.currentTime, false);
    requestAnimationFrame(tick);
  }
}

function findWordIndex(t) {
  const arr = state.flatWords;
  if (arr.length === 0) return -1;
  let lo = 0, hi = arr.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].start <= t) { ans = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return ans;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------- Screen 3: quiz ----------
function renderQuiz() {
  app.innerHTML = `
    <div class="quiz-intro">
      <span class="eyebrow">Check-in</span>
      <h2>Four quick questions</h2>
      <p>Answer all four, then submit — feedback for every question appears together at the end.</p>
      <button id="relisten-btn" class="btn btn-ghost">↺ Relisten to the episode first</button>
    </div>
    <div class="quiz-list">
      ${GATES.map(
        (g, gi) => `
        <div class="q-card" id="q-${gi}">
          <div class="q-eyebrow">${g.label}</div>
          <h3>${g.question}</h3>
          <div class="opt-list" role="group" aria-label="${g.label} options">
            ${g.options
              .map(
                (opt, oi) => `
              <button class="opt" id="opt-${gi}-${oi}" data-gate="${gi}" data-opt="${oi}" aria-pressed="false">
                <span class="letter">${OPTION_LETTERS[oi]}</span><span>${opt}</span>
              </button>`
              )
              .join("")}
          </div>
          <div class="feedback" id="fb-${gi}"></div>
        </div>`
      ).join("")}
    </div>
    <div class="submit-row">
      <button id="submit-btn" class="btn btn-primary" disabled>Submit answers</button>
      <div class="submit-hint" id="submit-hint">0 of ${GATES.length} answered</div>
    </div>
  `;

  document.querySelectorAll(".opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.submitted) return;
      const gi = parseInt(btn.dataset.gate, 10);
      const oi = parseInt(btn.dataset.opt, 10);
      state.answers[gi] = oi;
      document
        .querySelectorAll(`.opt[data-gate="${gi}"]`)
        .forEach((b) => b.setAttribute("aria-pressed", b === btn));
      const answeredCount = state.answers.filter((a) => a !== null).length;
      document.getElementById("submit-hint").textContent = `${answeredCount} of ${GATES.length} answered`;
      document.getElementById("submit-btn").disabled = answeredCount !== GATES.length;
    });
  });

  document.getElementById("submit-btn").addEventListener("click", submitQuiz);

  document.getElementById("relisten-btn").addEventListener("click", () => {
    state.relistenCount++;
    renderEpisode();
  });
}

async function submitQuiz() {
  state.submitted = true;
  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";
  const relistenBtn = document.getElementById("relisten-btn");
  if (relistenBtn) relistenBtn.disabled = true;

  let score = 0;
  const answerRecords = GATES.map((g, gi) => {
    const selected = state.answers[gi];
    const correct = selected === g.correct;
    if (correct) score++;
    return { gate: g.id, selected, correct };
  });

  GATES.forEach((g, gi) => {
    const card = document.getElementById(`q-${gi}`);
    card.classList.add("answered");
    g.options.forEach((_, oi) => {
      const optBtn = document.getElementById(`opt-${gi}-${oi}`);
      optBtn.disabled = true;
      if (oi === g.correct) optBtn.classList.add("reveal-correct");
      else if (oi === state.answers[gi]) optBtn.classList.add("reveal-wrong");
    });
    document.getElementById(`fb-${gi}`).textContent = g.feedback;
  });

  const payload = {
    studentName: state.studentName,
    answers: answerRecords,
    score,
    totalGates: GATES.length,
    skippedWithoutListening: state.everSkippedToQuiz && !state.everListened,
    relistened: state.relistenCount > 0,
    completedAt: new Date().toISOString(),
  };

  const save = createDoc(RESULTS_COLLECTION, { ...payload, completedAt: new Date(payload.completedAt) });
  const timeout = new Promise((resolve) => setTimeout(() => resolve("timeout"), 8000));

  let saveFailed = false;
  try {
    const result = await Promise.race([save, timeout]);
    if (result === "timeout") saveFailed = true;
  } catch (err) {
    console.error("Failed to save result:", err);
    saveFailed = true;
  }
  save.catch(() => {}); // avoid an unhandled-rejection if it loses the race and fails later

  if (saveFailed) queuePendingResult(payload);

  submitBtn.textContent = saveFailed ? "Submitted (offline)" : "Submitted";
  renderResultsBanner(score, saveFailed);
}

function renderResultsBanner(score, saveFailed) {
  const results = document.createElement("div");
  results.className = "results";
  const message = saveFailed
    ? `Nice work, ${escapeHtml(state.studentName)}. Couldn't reach the teacher dashboard just now, so your results are saved on this device and will send automatically next time this page is open with a working connection — no need to redo anything.`
    : `Nice work, ${escapeHtml(state.studentName)}. Your results have been sent to your teacher's dashboard.`;
  results.innerHTML = `
    <div class="score-badge">${score}<span>/ ${GATES.length}</span></div>
    <p>${message}</p>
  `;
  app.appendChild(results);
  results.scrollIntoView({ behavior: REDUCE_MOTION ? "auto" : "smooth", block: "start" });
}

// ---------- boot ----------
async function boot() {
  app.innerHTML = `<p style="padding-top:60px;color:var(--ink-faint)">Loading episode…</p>`;
  try {
    const res = await fetch(TRANSCRIPT_SRC);
    state.transcript = await res.json();
    state.flatWords = [];
    state.transcript.forEach((line, li) => {
      line.words.forEach((w, wi) => {
        state.flatWords.push({ lineIndex: li, wordIndex: wi, start: w.start, end: w.end });
      });
    });
    renderIntro();
  } catch (err) {
    app.innerHTML = `<p style="padding-top:60px;color:var(--bad)">Couldn't load the episode transcript. (${err.message})</p>`;
  }
  flushPendingResults(); // opportunistic retry of any result stuck from a previous offline submit
}

boot();
