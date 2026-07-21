const AUDIO_SRC = "../pitch-episode/pitch-episode-mixed-final.mp3";
const TRANSCRIPT_SRC = "../pitch-episode/transcript.json";
const LESSON_EPISODE_SRC = "index.html?from=pitch";
const DEFAULT_VOLUME = 0.7;
const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.body.classList.add("pitch-page");

const app = document.getElementById("app");
const state = {
  transcript: null,
  flatWords: [], // {lineIndex, wordIndex, start, end}
  audio: null,
};

const playIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2.5v11l10-5.5-10-5.5Z" fill="currentColor"/></svg>`;
const pauseIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3.5" y="2.5" width="3" height="11" rx="0.5" fill="currentColor"/><rect x="9.5" y="2.5" width="3" height="11" rx="0.5" fill="currentColor"/></svg>`;

function fmtTime(s) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderPage() {
  const lines = state.transcript;
  app.innerHTML = `
    <div class="pitch-intro">
      <span class="eyebrow">Second Look — Interview</span>
      <h1>What If Homework Sounded Like This</h1>
      <p>Dev talks to Alex, EchoClass's founder, about why homework doesn't tell anyone what actually landed — and what an episode-shaped alternative looks like. About seven and a half minutes.</p>
      <p class="format-note">This is an interview, not a classroom lesson — no quiz at the end. Press play, or follow along below.</p>
    </div>
    <div class="begin-lesson-wrap" id="begin-wrap">
      <button id="begin-btn" class="btn btn-primary btn-large">${playIcon} Begin episode</button>
    </div>
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
      <p id="audio-error" class="audio-error" hidden>Having trouble loading the audio. Check your connection and try reloading this page.</p>
    </div>
    <div class="lesson-link-card">
      <p class="lesson-link-text">Curious what a full lesson episode actually sounds like? <strong>There's a real one, built for eighth-grade science.</strong></p>
      <a class="btn" href="${LESSON_EPISODE_SRC}">Hear the lesson episode →</a>
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
  document.getElementById("begin-btn").addEventListener("click", () => {
    audio.play().catch(() => {});
  });
  audio.addEventListener("play", () => {
    playBtn.innerHTML = pauseIcon;
    playBtn.setAttribute("aria-label", "Pause");
    const beginWrap = document.getElementById("begin-wrap");
    if (beginWrap) beginWrap.remove();
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
    renderPage();
  } catch (err) {
    app.innerHTML = `<p style="padding-top:60px;color:var(--bad)">Couldn't load the episode transcript. (${err.message})</p>`;
  }
}

boot();
