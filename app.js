/* ============================================================
   BLS Cockpit — EMDR bilateral stimulation
   Therapist-controlled cockpit + synced client window.
   All data stays in this browser (localStorage). No network.
   ============================================================ */
(() => {
'use strict';

const VERSION = '1.1.0';

/* ---------------- helpers ---------------- */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const store = {
  get(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.warn('storage full?', e); alert('Could not save — this browser’s storage is full. Try removing a background image or exporting & erasing old sessions.'); return false; }
  },
  remove(key) { try { localStorage.removeItem(key); } catch {} }
};

function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* deterministic per-index random angle (same on cockpit & client) */
function seededRand(seed, i) {
  let t = (seed + i * 0x9E3779B9) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const Motion = window.Motion || null;
/* UI micro-animation via the motion package; no-ops under reduced motion */
function anim(el, keyframes, options) {
  if (!el || prefersReduced) return;
  if (Motion && Motion.animate) { try { Motion.animate(el, keyframes, options); } catch {} }
}

function downloadFile(name, text, type = 'text/plain') {
  const blob = new Blob([text], { type: type + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/* ---------------- constants ---------------- */
const DEFAULTS = {
  theme: 'dark',
  speed: 60,            // passes (round trips) per minute
  direction: 'horizontal',
  travel: 85,           // % of stage used
  setMode: 'passes',    // passes | seconds | continuous
  setPasses: 24,
  setSeconds: 30,
  countdown: 3,
  autoPrompt: true,
  dotSize: 56,
  dotColor: '#22d3ee',
  dotGlow: true,
  dotImage: null,
  bg: 'black',          // black | gray | white | color
  bgColor: '#1c2430',
  bgImage: null,
  bgDim: 40,
  sound: 'clock',
  volume: 60,
  audioLocal: true,
  haptics: false
};

const PRESET_KEYS = ['speed', 'direction', 'travel', 'setMode', 'setPasses', 'setSeconds', 'countdown',
  'autoPrompt', 'dotSize', 'dotColor', 'dotGlow', 'bg', 'bgColor', 'bgDim', 'sound', 'volume', 'haptics'];

const BUILTIN_PRESETS = [
  { id: 'grounding', label: 'Slow grounding', cfg: { speed: 22, direction: 'horizontal', travel: 70, setMode: 'seconds', setSeconds: 45, countdown: 5, autoPrompt: false, dotSize: 72, sound: 'tone', volume: 50 } },
  { id: 'standard', label: 'Standard processing', cfg: { speed: 60, direction: 'horizontal', travel: 85, setMode: 'passes', setPasses: 24, countdown: 3, autoPrompt: true, dotSize: 56, sound: 'clock', volume: 60 } },
  { id: 'highload', label: 'High cognitive load', cfg: { speed: 92, direction: 'random', travel: 95, setMode: 'passes', setPasses: 32, countdown: 3, autoPrompt: true, dotSize: 44, sound: 'click', volume: 55 } }
];

const PHASES = [
  ['1 — History & planning', 'Map targets, resources and readiness. BLS is not typically used in this phase.'],
  ['2 — Preparation', 'Teach stabilization and install Safe/Calm Place — short, slow sets (4–8 slow passes). The “Slow grounding” preset fits here.'],
  ['3 — Assessment', 'Set up the target below: image, negative & positive cognition, VOC, emotion, SUD, body location. No BLS during setup.'],
  ['4 — Desensitization', 'Faster sets of ~24–30 passes. “Go with that.” Check SUD between sets and continue until SUD reaches 0–1.'],
  ['5 — Installation', 'Pair the positive cognition with the target. Continue sets until VOC strengthens to 6–7.'],
  ['6 — Body scan', 'Client scans head-to-toe holding target + PC. Process any residual sensation with further sets.'],
  ['7 — Closure', 'Return to equilibrium — container, safe place, grounding. Slow sets for regulation only.'],
  ['8 — Reevaluation', 'At the next session, re-check SUD/VOC on previous targets and resume processing as needed.']
];

const DEFAULT_PROMPTS = [
  { id: 'orientation', label: 'Orientation check', text: 'Pause.\nLook around the room.\nNotice where you are — here, now.' },
  { id: 'body', label: 'Body check', text: 'Bring attention to your body.\nFeel your feet on the floor.\nWhat do you notice — and where?' },
  { id: 'present', label: 'Present-time check', text: 'That was then.\nThis is now.\nName one thing you can see and one you can hear.' },
  { id: 'safeplace', label: 'Safe / calm place', text: 'Go to your calm place.\nNotice what you see, hear and feel there.\nStay as long as you need.' },
  { id: 'breathe', label: 'Breathing', text: 'A slow breath in…\nand a long, slow breath out.\nAgain, at your own pace.' }
];

const EMERGENCY_DEFAULTS = {
  grounding: '5–4–3–2–1 grounding:\n• 5 things you can SEE\n• 4 things you can FEEL\n• 3 things you can HEAR\n• 2 things you can SMELL\n• 1 thing you can TASTE\n\nFeet flat on the floor — press them down gently.\nBreathe in for 4… hold for 4… out for 6.\nRepeat until you feel present in the room.',
  crisis: 'If a client becomes severely dysregulated:\n1. Stop BLS immediately.\n2. Orient to present time (name the room, the date, your voice).\n3. Use the client’s container / safe place.\n4. Do not end the session until arousal is workable.\n5. If there is risk of harm, follow your local crisis procedures.\n\nUS: 988 Suicide & Crisis Lifeline (call or text 988).',
  supports: ''
};

/* ---------------- role ---------------- */
const isClient = /(^|[#&?])client/.test(location.hash) || new URLSearchParams(location.search).has('client');

/* ---------------- state ---------------- */
let settings = Object.assign({}, DEFAULTS, store.get('bls.settings', {}));
let prompts = store.get('bls.prompts', null) || DEFAULT_PROMPTS.map(p => ({ ...p }));
let emergency = Object.assign({}, EMERGENCY_DEFAULTS, store.get('bls.emergency', {}));
let customPresets = store.get('bls.presets', []);
let session = store.get('bls.session', null) || newSessionObj();
let pastSessions = store.get('bls.sessions', []);

function newSessionObj() {
  return {
    id: 'S' + Date.now().toString(36),
    startedISO: new Date().toISOString(),
    clientLabel: '', phase: 3,
    assessment: { target: '', image: '', nc: '', pc: '', voc: '', sud: '', emotion: '', body: '' },
    sets: [], notes: ''
  };
}
const saveSettings = debounce(() => store.set('bls.settings', settings), 250);
const saveSession = debounce(() => store.set('bls.session', session), 400);

/* ---------------- broadcast sync ---------------- */
const chan = ('BroadcastChannel' in window) ? new BroadcastChannel('bls-cockpit') : null;
const post = (msg) => { if (chan) { try { chan.postMessage(msg); } catch {} } };

/* settings that the client window needs */
function cfgSnapshot() {
  const c = {};
  for (const k of ['direction', 'travel', 'dotSize', 'dotColor', 'dotGlow', 'dotImage',
    'bg', 'bgColor', 'bgImage', 'bgDim', 'sound', 'volume', 'haptics']) c[k] = settings[k];
  return c;
}

/* ---------------- audio engine ---------------- */
const audio = {
  ctx: null, master: null,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  },
  suspended() { return !this.ctx || this.ctx.state !== 'running'; },
  gainValue() { return Math.pow(clamp(settings.volume, 0, 100) / 100, 1.6); },
  /* map an epoch (Date.now ms) to AudioContext time */
  atTime(epochMs) {
    const dt = (epochMs - Date.now()) / 1000;
    return Math.max(this.ctx.currentTime, this.ctx.currentTime + dt);
  },
  play(kind, when, side /* -1 left, +1 right */) {
    const ctx = this.ensure();
    if (!ctx || ctx.state !== 'running' || kind === 'none') return;
    const out = ctx.createGain();
    out.gain.value = this.gainValue();
    let dest = this.master;
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = 0.85 * side;
      pan.connect(this.master);
      dest = pan;
    }
    out.connect(dest);
    const t = when;
    if (kind === 'clock') {
      // tick (right) / tock (left) — filtered noise + low wooden thump
      const tock = side < 0;
      const noise = ctx.createBufferSource();
      const len = Math.floor(ctx.sampleRate * 0.05);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      noise.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = tock ? 1050 : 1600; bp.Q.value = 7;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.9, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      noise.connect(bp); bp.connect(ng); ng.connect(out);
      noise.start(t); noise.stop(t + 0.1);
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = tock ? 165 : 205;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.5, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(og); og.connect(out);
      osc.start(t); osc.stop(t + 0.14);
    } else if (kind === 'tone') {
      const osc = ctx.createOscillator();
      osc.type = 'sine'; osc.frequency.value = side < 0 ? 330 : 392;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.3);
    } else if (kind === 'click') {
      const noise = ctx.createBufferSource();
      const len = Math.floor(ctx.sampleRate * 0.012);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      noise.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 2200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.8, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      noise.connect(hp); hp.connect(g); g.connect(out);
      noise.start(t); noise.stop(t + 0.05);
    } else if (kind === 'chime') {
      const base = side < 0 ? 440 : 523.25;
      [[1, 0.5], [2.4, 0.18], [3.62, 0.09]].forEach(([mult, amp]) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; osc.frequency.value = base * mult;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(amp, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(g); g.connect(out);
        osc.start(t); osc.stop(t + 0.65);
      });
    }
  },
  preview() {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    this.play(settings.sound, t, -1);
    this.play(settings.sound, t + 0.4, 1);
  }
};

/* ---------------- BLS engine (deterministic across windows) ---------------- */
class BLSEngine {
  constructor(onEvent) {
    this.onEvent = onEvent || (() => {});
    this.state = 'idle';   // idle | countdown | running | done
    this.direction = 'horizontal';
  }
  endpoint(i) {
    const sign = (i % 2 === 0) ? 1 : -1; // endpoint 0 is right / top
    switch (this.direction) {
      case 'vertical': return { x: 0, y: -sign };
      case 'diag-up': return { x: sign, y: -sign * 0.62 };
      case 'diag-down': return { x: sign, y: sign * 0.62 };
      case 'random': {
        const a = (seededRand(this.run.seed, i) * 100 - 50) * Math.PI / 180; // ±50°
        const x = Math.cos(a) * sign;
        const y = Math.sin(a) * 0.9;
        return { x, y };
      }
      default: return { x: sign, y: 0 };
    }
  }
  start(run) {
    // run: {seed, startEpoch, halfDur, setMode, setPasses, setSeconds, direction}
    this.run = run;
    this.direction = run.direction;
    this.state = 'countdown';
    this.segStart = run.startEpoch;
    this.seg = { from: { x: 0, y: 0 }, to: this.endpoint(0), dur: run.halfDur / 2, idx: 0, kind: 'out' };
    this.endpoints = 0;
    this.motionStarted = false;
  }
  stop() { this.state = 'idle'; this.run = null; }
  passesDone() { return Math.floor(this.endpoints / 2); }
  elapsed(now) { return this.run ? Math.max(0, (now - this.run.startEpoch) / 1000) : 0; }
  /* rebase timing so a speed change is seamless and deterministic */
  setSpeed(ppm, atEpoch) {
    if (!this.run) return;
    const newHalf = 30000 / ppm;
    const factor = newHalf / this.run.halfDur;
    const u = clamp((atEpoch - this.segStart) / this.seg.dur, 0, 1);
    this.seg.dur *= factor;
    this.segStart = atEpoch - u * this.seg.dur;
    this.run.halfDur = newHalf;
  }
  setDirection(dir) {
    this.direction = dir;
    if (this.run) this.run.direction = dir;
  }
  nextBoundary() {
    if (this.state !== 'running' && this.state !== 'countdown') return null;
    return { epoch: this.segStart + this.seg.dur, seg: this.seg };
  }
  tick(now) {
    if (this.state === 'idle' || this.state === 'done' || !this.run) return null;
    const r = this.run;
    if (now < r.startEpoch) {
      return { phase: 'countdown', remain: (r.startEpoch - now) / 1000, pos: { x: 0, y: 0 } };
    }
    if (!this.motionStarted) { this.motionStarted = true; this.state = 'running'; this.onEvent('motion-start'); }
    let guard = 0;
    while (now >= this.segStart + this.seg.dur && guard++ < 200) {
      this.segStart += this.seg.dur;
      if (this.seg.kind === 'return') {
        this.state = 'done';
        this.onEvent('done', { passes: this.passesDone(), seconds: (this.segStart - r.startEpoch) / 1000 });
        return { phase: 'done', pos: { x: 0, y: 0 }, passes: this.passesDone() };
      }
      this.endpoints = this.seg.idx + 1;
      this.onEvent('boundary', { idx: this.seg.idx, point: this.seg.to });
      const motionSec = (this.segStart - r.startEpoch) / 1000;
      const timeUp = r.setMode === 'seconds' && motionSec >= r.setSeconds - 1e-6;
      const passUp = r.setMode === 'passes' && this.endpoints >= r.setPasses * 2;
      if (timeUp || passUp) {
        this.seg = { from: this.seg.to, to: { x: 0, y: 0 }, dur: r.halfDur / 2, idx: this.seg.idx + 1, kind: 'return' };
      } else {
        this.seg = { from: this.seg.to, to: this.endpoint(this.seg.idx + 1), dur: r.halfDur, idx: this.seg.idx + 1, kind: 'sweep' };
      }
    }
    const u = clamp((now - this.segStart) / this.seg.dur, 0, 1);
    const e = (1 - Math.cos(Math.PI * u)) / 2;
    return {
      phase: 'running',
      pos: {
        x: this.seg.from.x + (this.seg.to.x - this.seg.from.x) * e,
        y: this.seg.from.y + (this.seg.to.y - this.seg.from.y) * e
      },
      passes: this.passesDone(),
      elapsed: this.elapsed(now)
    };
  }
}

function sideOf(point, idx) {
  if (point.x > 0.05) return 1;
  if (point.x < -0.05) return -1;
  return idx % 2 === 0 ? 1 : -1;
}

/* ---------------- stage renderer ---------------- */
const stage = $('stage'), dot = $('dot');
const renderer = {
  w: 0, h: 0, ax: 0, ay: 0, axT: 0, ayT: 0,
  measure() {
    const r = stage.getBoundingClientRect();
    this.w = r.width; this.h = r.height;
    this.retarget();
  },
  retarget() {
    const size = settings.dotSize;
    const t = settings.travel / 100;
    this.axT = Math.max(0, (this.w - size) / 2 - 8) * t;
    this.ayT = Math.max(0, (this.h - size) / 2 - 8) * t;
    if (!this.ax) { this.ax = this.axT; this.ay = this.ayT; }
  },
  drawPos(pos, dtMs) {
    // smooth amplitude changes so travel/size edits don't jump mid-set
    const k = Math.min(1, (dtMs || 16) / 120);
    this.ax += (this.axT - this.ax) * k;
    this.ay += (this.ayT - this.ay) * k;
    dot.style.transform = `translate(-50%, -50%) translate3d(${pos.x * this.ax}px, ${pos.y * this.ay}px, 0)`;
  },
  center() { dot.style.transform = 'translate(-50%, -50%)'; }
};

function luminance(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
  if (!m) return 0;
  return (parseInt(m[1], 16) * 0.299 + parseInt(m[2], 16) * 0.587 + parseInt(m[3], 16) * 0.114) / 255;
}

function applyStageVisuals() {
  // dot
  dot.style.width = dot.style.height = settings.dotSize + 'px';
  dot.style.setProperty('--dot-color', settings.dotColor);
  dot.classList.toggle('glow', !!settings.dotGlow);
  if (settings.dotImage) {
    dot.classList.add('has-image');
    dot.style.backgroundImage = `url("${settings.dotImage}")`;
    dot.style.backgroundColor = 'transparent';
  } else {
    dot.classList.remove('has-image');
    dot.style.backgroundImage = 'none';
    dot.style.backgroundColor = settings.dotColor;
  }
  // background
  let bgc = '#000000', light = false;
  if (settings.bg === 'gray') bgc = '#808080';
  else if (settings.bg === 'white') bgc = '#ffffff';
  else if (settings.bg === 'color') bgc = settings.bgColor;
  if (settings.bgImage) {
    const dim = clamp(settings.bgDim, 0, 90) / 100;
    stage.style.background = `linear-gradient(rgba(0,0,0,${dim}), rgba(0,0,0,${dim})), url("${settings.bgImage}") center / cover no-repeat, ${bgc}`;
    light = false;
  } else {
    stage.style.background = bgc;
    light = luminance(bgc) > 0.55;
  }
  stage.classList.toggle('light-bg', light);
  renderer.retarget();
}

/* ---------------- shared run/render loop ---------------- */
const engine = new BLSEngine(onEngineEvent);
let rafId = null, lastFrame = 0, lastScheduledIdx = -1;
let currentSetNumber = 1;

const hud = $('hud'), hudSet = $('hudSet'), hudPass = $('hudPass'), hudTime = $('hudTime'), hudSpeed = $('hudSpeed');
const countdownOverlay = $('countdownOverlay'), countdownNum = $('countdownNum');
const restOverlay = $('restOverlay'), restText = $('restText');
let lastCountShown = null;

function audioEnabledHere() {
  if (settings.sound === 'none' || settings.volume === 0) return false;
  return isClient ? true : settings.audioLocal;
}

function frame(now) {
  rafId = null;
  const dt = lastFrame ? now - lastFrame : 16;
  lastFrame = now;
  const res = engine.tick(Date.now());
  if (!res) { lastFrame = 0; return; }

  if (res.phase === 'countdown') {
    countdownOverlay.hidden = false;
    const n = Math.ceil(res.remain);
    if (n !== lastCountShown) {
      lastCountShown = n;
      countdownNum.textContent = n;
      anim(countdownNum, { scale: [0.55, 1], opacity: [0, 1] }, { duration: 0.35, ease: 'easeOut' });
    }
    renderer.drawPos({ x: 0, y: 0 }, dt);
  } else if (res.phase === 'running') {
    if (!countdownOverlay.hidden) { countdownOverlay.hidden = true; lastCountShown = null; }
    renderer.drawPos(res.pos, dt);
    scheduleUpcomingAudio();
    if (!isClient) updateHud(res);
  } else if (res.phase === 'done') {
    renderer.center();
    // 'done' event handler finalizes
  }
  if (engine.state === 'countdown' || engine.state === 'running') {
    rafId = requestAnimationFrame(frame);
  } else {
    lastFrame = 0;
  }
}
function startLoop() { if (!rafId) { lastFrame = 0; rafId = requestAnimationFrame(frame); } }

function scheduleUpcomingAudio() {
  if (!audioEnabledHere() || audio.suspended()) return;
  const nb = engine.nextBoundary();
  if (!nb || nb.seg.kind === 'return') return;
  if (nb.seg.idx === lastScheduledIdx) return;
  const lead = nb.epoch - Date.now();
  if (lead < 0 || lead > 220) return;
  lastScheduledIdx = nb.seg.idx;
  audio.play(settings.sound, audio.atTime(nb.epoch), sideOf(nb.seg.to, nb.seg.idx));
}

function updateHud(res) {
  hud.hidden = false;
  hudSet.textContent = `Set ${currentSetNumber}`;
  const r = engine.run;
  if (r.setMode === 'passes') hudPass.textContent = `${res.passes} / ${r.setPasses} passes`;
  else hudPass.textContent = `${res.passes} passes`;
  hudTime.textContent = fmtClock(res.elapsed);
  hudSpeed.textContent = `${settings.speed}/min`;
}

let clientOnStoppedRef = () => {};
function onEngineEvent(type, data) {
  if (type === 'boundary') {
    if (settings.haptics && navigator.vibrate) { try { navigator.vibrate(35); } catch {} }
  } else if (type === 'motion-start') {
    countdownOverlay.hidden = true; lastCountShown = null;
  } else if (type === 'done') {
    if (isClient) { clientOnStoppedRef(); }
    else { cockpitFinishSet('complete', data); }
  }
}

/* keep the screen awake while a set is running (phones/tablets) */
let wakeLock = null;
async function acquireWakeLock() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch {}
}
function releaseWakeLock() {
  try { if (wakeLock) wakeLock.release(); } catch {}
  wakeLock = null;
}
on(document, 'visibilitychange', () => {
  if (document.visibilityState === 'visible' && engine.state !== 'idle') acquireWakeLock();
});

/* glide dot back to middle on stop */
function glideDotHome() {
  renderer.center();
  dot.classList.add('resting');
  anim(dot, { opacity: [1, 0.4] }, { duration: 0.4 });
}
function wakeDot() {
  dot.classList.remove('resting');
  dot.style.opacity = '';
}

/* ============================================================
   CLIENT WINDOW ROLE
   ============================================================ */
if (isClient) {
  document.body.classList.add('client');
  document.title = 'EMDR Session';
  document.documentElement.setAttribute('data-theme', 'dark');
  $('waitingOverlay').hidden = false;
  $('btnClientStop').hidden = false;
  applyStageVisuals();
  renderer.measure();
  new ResizeObserver(() => renderer.measure()).observe(stage);

  let connected = false;

  function clientOnStopped() {
    glideDotHome();
    $('hud').hidden = true;
    releaseWakeLock();
  }
  clientOnStoppedRef = clientOnStopped;

  function handleMsg(msg) {
    if (!msg || !msg.t) return;
    if (msg.t === 'cfg') {
      Object.assign(settings, msg.cfg);
      applyStageVisuals();
      if (engine.run) engine.setDirection(settings.direction);
      if (!connected) { connected = true; $('waitingOverlay').hidden = true; }
    } else if (msg.t === 'start') {
      Object.assign(settings, msg.cfg || {});
      applyStageVisuals();
      wakeDot();
      $('waitingOverlay').hidden = true;
      $('restOverlay').hidden = true;
      lastScheduledIdx = -1;
      engine.start(msg.run);
      startLoop();
      acquireWakeLock();
      const ctx = audio.ensure();
      if (audioEnabledHere() && (!ctx || audio.suspended())) $('btnEnableSound').hidden = false;
    } else if (msg.t === 'speed') {
      settings.speed = msg.v;
      engine.setSpeed(msg.v, msg.at);
    } else if (msg.t === 'stop') {
      if (engine.state !== 'idle') { engine.stop(); clientOnStopped(); }
      countdownOverlay.hidden = true;
    } else if (msg.t === 'prompt') {
      engine.stop(); clientOnStopped();
      countdownOverlay.hidden = true;
      showPromptOverlay(msg.text, msg.long);
    } else if (msg.t === 'prompt-off') {
      hidePromptOverlay();
    } else if (msg.t === 'ping') {
      post({ t: 'pong' });
    }
  }
  if (chan) chan.onmessage = (e) => handleMsg(e.data);
  post({ t: 'hello-client' });

  // instant stop: dedicated button, any tap, any key
  on($('btnClientStop'), 'click', (e) => { e.stopPropagation(); post({ t: 'stop-request' }); });
  on($('btnEnableSound'), 'click', (e) => {
    e.stopPropagation();
    audio.ensure();
    $('btnEnableSound').hidden = true;
  });
  on(stage, 'pointerdown', () => { if (engine.state !== 'idle') post({ t: 'stop-request' }); });
  on(document, 'keydown', () => { if (engine.state !== 'idle') post({ t: 'stop-request' }); });

  function showPromptOverlay(text, long) {
    const ov = $('promptOverlay');
    $('promptText').textContent = text;
    ov.classList.toggle('long', !!long);
    ov.hidden = false;
    anim(ov, { opacity: [0, 1] }, { duration: 0.3 });
  }
  function hidePromptOverlay() { $('promptOverlay').hidden = true; }

  return; // client role ends here
}

/* ============================================================
   COCKPIT ROLE (therapist)
   ============================================================ */

/* ---------- theme ---------- */
const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const mode = settings.theme === 'auto' ? (mqDark.matches ? 'dark' : 'light') : settings.theme;
  document.documentElement.setAttribute('data-theme', mode);
}
mqDark.addEventListener('change', () => { if (settings.theme === 'auto') applyTheme(); });
on($('btnTheme'), 'click', () => {
  const now = document.documentElement.getAttribute('data-theme');
  settings.theme = now === 'dark' ? 'light' : 'dark';
  $('themeSelect').value = settings.theme;
  applyTheme(); saveSettings();
});
on($('themeSelect'), 'change', (e) => { settings.theme = e.target.value; applyTheme(); saveSettings(); });

/* ---------- broadcast to client window ---------- */
const broadcastCfg = debounce(() => post({ t: 'cfg', cfg: cfgSnapshot() }), 60);
let clientConnected = false, lastPong = 0, autoMuted = false;
setInterval(() => {
  post({ t: 'ping' });
  const nowConnected = Date.now() - lastPong < 3800;
  if (nowConnected !== clientConnected) {
    clientConnected = nowConnected;
    $('clientStatus').hidden = !clientConnected;
    if (clientConnected && settings.audioLocal) {
      // avoid doubled audio: client window becomes the sound source
      settings.audioLocal = false; autoMuted = true;
      setSwitch($('audioLocal'), false); saveSettings();
    } else if (!clientConnected && autoMuted) {
      settings.audioLocal = true; autoMuted = false;
      setSwitch($('audioLocal'), true); saveSettings();
    }
    $('audioLocalHint').textContent = clientConnected
      ? 'client window is connected and plays the audio'
      : 'audio always plays in the client window';
  }
}, 1500);

if (chan) chan.onmessage = (e) => {
  const msg = e.data || {};
  if (msg.t === 'hello-client') { post({ t: 'cfg', cfg: cfgSnapshot() }); lastPong = Date.now(); }
  else if (msg.t === 'pong') lastPong = Date.now();
  else if (msg.t === 'stop-request') stopRun('client-stop');
};

on($('btnClientWindow'), 'click', () => {
  const url = location.href.split('#')[0] + '#client';
  const w = window.open(url, 'blsClientWindow', 'width=1100,height=700');
  if (w) w.focus();
  if (!chan) alert('This browser cannot sync a second window (BroadcastChannel unsupported). Use Present fullscreen instead.');
});

/* ---------- run control ---------- */
let running = false;

function startRun() {
  if (running) return;
  hidePrompt();
  wakeDot();
  restOverlay.hidden = true;
  audio.ensure(); // user gesture — unlock audio
  const run = {
    seed: (Math.random() * 0xffffffff) >>> 0,
    startEpoch: Date.now() + settings.countdown * 1000 + 250,
    halfDur: 30000 / settings.speed,
    setMode: settings.setMode,
    setPasses: settings.setPasses,
    setSeconds: settings.setSeconds,
    direction: settings.direction
  };
  lastScheduledIdx = -1;
  engine.start(run);
  startLoop();
  acquireWakeLock();
  post({ t: 'start', run, cfg: cfgSnapshot() });
  running = true;
  document.body.classList.add('running');
  $('btnStartLabel').textContent = 'Stop';
  setTransportStatus(`Set ${currentSetNumber} — running`);
}

function stopRun(reason) {
  if (!running && engine.state === 'idle') return;
  const passes = engine.passesDone();
  const seconds = engine.run ? Math.min(engine.elapsed(Date.now()), 359999) : 0;
  engine.stop();
  post({ t: 'stop', reason });
  countdownOverlay.hidden = true; lastCountShown = null;
  hud.hidden = true;
  glideDotHome();
  releaseWakeLock();
  running = false;
  document.body.classList.remove('running');
  $('btnStartLabel').textContent = 'Start set';
  if (reason === 'end-set' && passes > 0) {
    cockpitFinishSet('complete', { passes, seconds });
  } else {
    if (passes > 0) logSetEntry(passes, seconds);
    setTransportStatus(reason === 'client-stop'
      ? `Stopped by client — ready, Set ${currentSetNumber}`
      : `Stopped — ready, Set ${currentSetNumber}`);
  }
}

function cockpitFinishSet(reason, data) {
  running = false;
  document.body.classList.remove('running');
  $('btnStartLabel').textContent = 'Start set';
  hud.hidden = true;
  post({ t: 'stop', reason: 'complete' });
  engine.stop();
  glideDotHome();
  releaseWakeLock();
  restText.textContent = `Set ${currentSetNumber} complete`;
  restOverlay.hidden = false;
  anim(restOverlay, { opacity: [0, 1] }, { duration: 0.45 });
  const entry = logSetEntry(data.passes, data.seconds);
  setTransportStatus(`Set ${entry.n} done — ready, Set ${currentSetNumber}`);
  if (settings.autoPrompt) openSudModal(entry);
}

function logSetEntry(passes, seconds) {
  const n = session.sets.filter(s => s.type === 'set').length + 1;
  const entry = {
    type: 'set', n,
    at: new Date().toISOString(),
    passes, seconds: Math.round(seconds),
    speed: settings.speed, direction: settings.direction, sound: settings.sound,
    phase: session.phase,
    sud: null, voc: null, note: ''
  };
  session.sets.push(entry);
  currentSetNumber = n + 1;
  saveSession();
  renderSetLog();
  return entry;
}

function setTransportStatus(text) { $('transportStatus').textContent = text; }

on($('btnStart'), 'click', () => running ? stopRun('manual') : startRun());
on($('btnEndSet'), 'click', () => { if (running) stopRun('end-set'); });
on($('fsStart'), 'click', () => running ? stopRun('manual') : startRun());
on($('fsExit'), 'click', () => exitPresent());

/* speed */
function setSpeed(v, fromSlider) {
  v = clamp(Math.round(v), 10, 120);
  settings.speed = v;
  if (!fromSlider) $('speed').value = v;
  $('speedOut').textContent = `${v} passes/min`;
  $('speedReadout').textContent = v;
  $('fsSpeed').textContent = v;
  if (engine.state === 'running' || engine.state === 'countdown') {
    const at = Date.now();
    engine.setSpeed(v, at);
    post({ t: 'speed', v, at });
  }
  saveSettings();
}
on($('speed'), 'input', (e) => setSpeed(+e.target.value, true));
on($('btnSlower'), 'click', () => setSpeed(settings.speed - 5));
on($('btnFaster'), 'click', () => setSpeed(settings.speed + 5));
on($('fsSlower'), 'click', () => setSpeed(settings.speed - 5));
on($('fsFaster'), 'click', () => setSpeed(settings.speed + 5));

/* keyboard */
on(document, 'keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
  if (!$('sudvocModal').hidden || !$('ackModal').hidden) return;
  if (e.code === 'Space') { e.preventDefault(); running ? stopRun('manual') : startRun(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setSpeed(settings.speed + 5); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); setSpeed(settings.speed - 5); }
  else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); presentFullscreen(); }
  else if (e.key === 'Escape') {
    if (running) stopRun('manual');
    else if (document.body.classList.contains('presenting')) cssPresent(false);
  }
});

/* fullscreen present — falls back to a CSS overlay on iPhone Safari,
   which has no element fullscreen API */
function cssPresent(onState) {
  document.body.classList.toggle('presenting', onState);
  renderer.measure();
}
function isPresenting() { return !!document.fullscreenElement || document.body.classList.contains('presenting'); }
function presentFullscreen() {
  const el = $('stagewrap');
  if (isPresenting()) { exitPresent(); return; }
  if (el.requestFullscreen) el.requestFullscreen().catch(() => cssPresent(true));
  else cssPresent(true);
}
function exitPresent() {
  if (document.fullscreenElement) document.exitFullscreen();
  cssPresent(false);
}
on($('btnPresent'), 'click', presentFullscreen);
on(document, 'fullscreenchange', () => renderer.measure());

/* auto-hide fullscreen bar */
let fsIdleTimer = null;
on($('stagewrap'), 'pointermove', () => {
  const bar = $('fsbar');
  bar.classList.remove('idle');
  clearTimeout(fsIdleTimer);
  fsIdleTimer = setTimeout(() => bar.classList.add('idle'), 2600);
});

/* ---------- tabs ---------- */
document.querySelectorAll('.tab').forEach(tab => {
  on(tab, 'click', () => {
    document.querySelectorAll('.tab').forEach(t => { t.classList.toggle('active', t === tab); t.setAttribute('aria-selected', t === tab); });
    document.querySelectorAll('.tabpane').forEach(p => {
      const active = p.id === 'pane-' + tab.dataset.tab;
      p.classList.toggle('active', active);
      p.hidden = !active;
      if (active) anim(p, { opacity: [0, 1], y: [6, 0] }, { duration: 0.22, ease: 'easeOut' });
    });
  });
});

/* ---------- generic switch helper ---------- */
function setSwitch(el, onState) {
  el.classList.toggle('on', onState);
  el.setAttribute('aria-checked', String(onState));
}
function bindSwitch(el, key, after) {
  setSwitch(el, !!settings[key]);
  on(el, 'click', () => {
    settings[key] = !settings[key];
    setSwitch(el, settings[key]);
    saveSettings(); broadcastCfg();
    if (after) after(settings[key]);
  });
}

/* ---------- segmented controls ---------- */
function bindSeg(container, attr, key, after) {
  const btns = container.querySelectorAll('button');
  const sync = () => btns.forEach(b => b.classList.toggle('active', b.dataset[attr] === String(settings[key])));
  btns.forEach(b => on(b, 'click', () => {
    settings[key] = b.dataset[attr];
    sync(); saveSettings(); broadcastCfg();
    if (after) after(settings[key]);
  }));
  sync();
  return sync;
}

bindSeg($('dirSeg'), 'dir', 'direction', (v) => {
  if (engine.state !== 'idle') { engine.setDirection(v); }
});

bindSeg($('setModeSeg'), 'mode', 'setMode', updateSetLenVisibility);
function updateSetLenVisibility() {
  $('setPassesWrap').hidden = settings.setMode !== 'passes';
  $('setSecondsWrap').hidden = settings.setMode !== 'seconds';
}

const syncBgSeg = bindSeg($('bgSeg'), 'bg', 'bg', () => { updateBgUI(); applyStageVisuals(); });
function updateBgUI() {
  $('bgColorWrap').hidden = settings.bg !== 'color';
  $('bgDimWrap').hidden = !settings.bgImage;
}

/* ---------- sliders & inputs (BLS tab) ---------- */
on($('travel'), 'input', (e) => { settings.travel = +e.target.value; $('travelOut').textContent = settings.travel + '%'; renderer.retarget(); saveSettings(); broadcastCfg(); });
on($('setPasses'), 'change', (e) => { settings.setPasses = clamp(+e.target.value || 24, 4, 100); e.target.value = settings.setPasses; saveSettings(); });
on($('setSeconds'), 'change', (e) => { settings.setSeconds = clamp(+e.target.value || 30, 10, 300); e.target.value = settings.setSeconds; saveSettings(); });
on($('countdown'), 'change', (e) => { settings.countdown = +e.target.value; saveSettings(); });
bindSwitch($('autoPrompt'), 'autoPrompt');

on($('dotSize'), 'input', (e) => { settings.dotSize = +e.target.value; $('dotSizeOut').textContent = settings.dotSize + ' px'; applyStageVisuals(); saveSettings(); broadcastCfg(); });
bindSwitch($('dotGlow'), 'dotGlow', applyStageVisuals);

const dotSwatches = $('dotSwatches');
function syncSwatches() {
  dotSwatches.querySelectorAll('button[data-color]').forEach(b =>
    b.classList.toggle('active', b.dataset.color.toLowerCase() === settings.dotColor.toLowerCase()));
}
dotSwatches.querySelectorAll('button[data-color]').forEach(b => on(b, 'click', () => {
  settings.dotColor = b.dataset.color;
  syncSwatches(); applyStageVisuals(); saveSettings(); broadcastCfg();
}));
on($('dotColorCustom'), 'input', (e) => {
  settings.dotColor = e.target.value;
  syncSwatches(); applyStageVisuals(); saveSettings(); broadcastCfg();
});

on($('bgColorCustom'), 'input', (e) => { settings.bgColor = e.target.value; applyStageVisuals(); saveSettings(); broadcastCfg(); });
on($('bgDim'), 'input', (e) => { settings.bgDim = +e.target.value; $('bgDimOut').textContent = settings.bgDim + '%'; applyStageVisuals(); saveSettings(); broadcastCfg(); });

/* image uploads — resized & stored as data URLs on this device */
function readImage(file, maxDim, asPng, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      cb(asPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => alert('Could not read that image.');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
on($('dotImageInput'), 'change', (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  readImage(f, 256, true, (url) => {
    settings.dotImage = url;
    $('dotImageThumb').src = url;
    $('dotImagePreview').hidden = false;
    applyStageVisuals(); saveSettings(); broadcastCfg();
  });
});
on($('btnDotImageClear'), 'click', () => {
  settings.dotImage = null;
  $('dotImagePreview').hidden = true;
  applyStageVisuals(); saveSettings(); broadcastCfg();
});
on($('bgImageInput'), 'change', (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  readImage(f, 1600, false, (url) => {
    settings.bgImage = url;
    $('bgImageThumb').src = url;
    $('bgImagePreview').hidden = false;
    updateBgUI(); applyStageVisuals(); saveSettings(); broadcastCfg();
  });
});
on($('btnBgImageClear'), 'click', () => {
  settings.bgImage = null;
  $('bgImagePreview').hidden = true;
  updateBgUI(); applyStageVisuals(); saveSettings(); broadcastCfg();
});

/* audio controls */
on($('sound'), 'change', (e) => { settings.sound = e.target.value; saveSettings(); broadcastCfg(); });
on($('volume'), 'input', (e) => { settings.volume = +e.target.value; $('volumeOut').textContent = settings.volume + '%'; saveSettings(); broadcastCfg(); });
on($('btnPreviewSound'), 'click', () => audio.preview());
bindSwitch($('audioLocal'), 'audioLocal', () => { autoMuted = false; });
bindSwitch($('haptics'), 'haptics');

/* ---------- presets ---------- */
function renderPresets() {
  const row = $('presetRow');
  row.innerHTML = '';
  for (const p of BUILTIN_PRESETS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'preset-chip'; b.textContent = p.label;
    on(b, 'click', () => applyPreset(p.cfg));
    row.appendChild(b);
  }
  for (const p of customPresets) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'preset-chip';
    b.innerHTML = `${esc(p.label)} <span class="chip-x" role="button" aria-label="Delete preset ${esc(p.label)}" tabindex="0"><svg class="ic"><use href="#i-x"/></svg></span>`;
    on(b, 'click', (e) => {
      if (e.target.closest('.chip-x')) {
        if (confirm(`Delete preset “${p.label}”?`)) {
          customPresets = customPresets.filter(x => x !== p);
          store.set('bls.presets', customPresets);
          renderPresets();
        }
        return;
      }
      applyPreset(p.cfg);
    });
    row.appendChild(b);
  }
}
function applyPreset(cfg) {
  Object.assign(settings, cfg);
  saveSettings();
  refreshAllControls();
  applyStageVisuals();
  broadcastCfg();
  setTransportStatus(`Preset applied — ready, Set ${currentSetNumber}`);
}
on($('btnSavePreset'), 'click', () => {
  const name = $('presetName').value.trim();
  if (!name) { $('presetName').focus(); return; }
  const cfg = {};
  for (const k of PRESET_KEYS) cfg[k] = settings[k];
  customPresets.push({ label: name, cfg });
  store.set('bls.presets', customPresets);
  $('presetName').value = '';
  renderPresets();
});

/* ---------- refresh all controls from settings ---------- */
function refreshAllControls() {
  $('speed').value = settings.speed;
  setSpeed(settings.speed, true);
  $('travel').value = settings.travel; $('travelOut').textContent = settings.travel + '%';
  $('setPasses').value = settings.setPasses;
  $('setSeconds').value = settings.setSeconds;
  $('countdown').value = String(settings.countdown);
  $('dotSize').value = settings.dotSize; $('dotSizeOut').textContent = settings.dotSize + ' px';
  $('volume').value = settings.volume; $('volumeOut').textContent = settings.volume + '%';
  $('sound').value = settings.sound;
  $('bgColorCustom').value = settings.bgColor;
  $('bgDim').value = settings.bgDim; $('bgDimOut').textContent = settings.bgDim + '%';
  $('themeSelect').value = settings.theme;
  setSwitch($('autoPrompt'), settings.autoPrompt);
  setSwitch($('dotGlow'), settings.dotGlow);
  setSwitch($('audioLocal'), settings.audioLocal);
  setSwitch($('haptics'), settings.haptics);
  syncSwatches();
  document.querySelectorAll('#dirSeg button').forEach(b => b.classList.toggle('active', b.dataset.dir === settings.direction));
  document.querySelectorAll('#setModeSeg button').forEach(b => b.classList.toggle('active', b.dataset.mode === settings.setMode));
  syncBgSeg();
  updateSetLenVisibility();
  updateBgUI();
  if (settings.dotImage) { $('dotImageThumb').src = settings.dotImage; $('dotImagePreview').hidden = false; }
  else $('dotImagePreview').hidden = true;
  if (settings.bgImage) { $('bgImageThumb').src = settings.bgImage; $('bgImagePreview').hidden = false; }
  else $('bgImagePreview').hidden = true;
}

/* ---------- SUD / VOC modal ---------- */
let pendingEntry = null;
function openSudModal(entry) {
  pendingEntry = entry || null;
  $('sudvocSub').textContent = entry && entry.type === 'set'
    ? `After set ${entry.n} — “On a scale of 0 to 10, how disturbing does it feel now?”`
    : '“On a scale of 0 to 10, how disturbing does it feel now?”';
  $('sudSlider').value = 5; $('sudVal').textContent = '5';
  $('vocSlider').value = 0; $('vocVal').textContent = '–';
  $('setNote').value = '';
  const m = $('sudvocModal');
  m.hidden = false;
  anim(m.querySelector('.modal'), { scale: [0.92, 1], opacity: [0, 1] }, { duration: 0.28, ease: 'easeOut' });
  $('sudSlider').focus();
}
on($('sudSlider'), 'input', (e) => $('sudVal').textContent = e.target.value);
on($('vocSlider'), 'input', (e) => $('vocVal').textContent = e.target.value === '0' ? '–' : e.target.value);
on($('btnSudSkip'), 'click', () => { $('sudvocModal').hidden = true; pendingEntry = null; });
on($('btnSudSave'), 'click', () => {
  const sud = +$('sudSlider').value;
  const voc = +$('vocSlider').value || null;
  const note = $('setNote').value.trim();
  if (pendingEntry) {
    pendingEntry.sud = sud; pendingEntry.voc = voc; pendingEntry.note = note;
  } else {
    session.sets.push({ type: 'check', at: new Date().toISOString(), sud, voc, note, phase: session.phase });
  }
  saveSession(); renderSetLog();
  $('sudvocModal').hidden = true; pendingEntry = null;
});
on($('btnLogNow'), 'click', () => openSudModal(null));

/* ---------- set log & chart ---------- */
function renderSetLog() {
  const body = $('setLogBody');
  if (!session.sets.length) {
    body.innerHTML = '<tr class="empty"><td colspan="6">No sets yet — press Start.</td></tr>';
  } else {
    body.innerHTML = session.sets.map(s => {
      if (s.type === 'check') {
        return `<tr><td>·</td><td colspan="2" class="note-cell">check-in</td><td>${s.sud ?? '–'}</td><td>${s.voc ?? '–'}</td><td class="note-cell">${esc(s.note)}</td></tr>`;
      }
      return `<tr><td>${s.n}</td><td>${s.passes}</td><td>${s.speed}/min</td><td>${s.sud ?? '–'}</td><td>${s.voc ?? '–'}</td><td class="note-cell">${esc(s.note)}</td></tr>`;
    }).join('');
  }
  // SUD sparkline
  const points = session.sets.filter(s => s.sud !== null && s.sud !== undefined);
  const chart = $('sudChart');
  if (points.length >= 2) {
    chart.hidden = false;
    chart.innerHTML = points.map(p =>
      `<div class="bar" style="height:${Math.max(6, p.sud * 10)}%"><span>${p.sud}</span></div>`).join('');
  } else chart.hidden = true;
}

/* ---------- session fields ---------- */
const FIELD_MAP = [
  ['clientLabel', (v) => session.clientLabel = v, () => session.clientLabel],
  ['fTarget', (v) => session.assessment.target = v, () => session.assessment.target],
  ['fImage', (v) => session.assessment.image = v, () => session.assessment.image],
  ['fNC', (v) => session.assessment.nc = v, () => session.assessment.nc],
  ['fPC', (v) => session.assessment.pc = v, () => session.assessment.pc],
  ['fVOC', (v) => session.assessment.voc = v, () => session.assessment.voc],
  ['fSUD', (v) => session.assessment.sud = v, () => session.assessment.sud],
  ['fEmotion', (v) => session.assessment.emotion = v, () => session.assessment.emotion],
  ['fBody', (v) => session.assessment.body = v, () => session.assessment.body],
  ['sessionNotes', (v) => session.notes = v, () => session.notes]
];
function bindSessionFields() {
  for (const [id, set] of FIELD_MAP) {
    on($(id), 'input', (e) => { set(e.target.value); saveSession(); });
  }
}
function fillSessionFields() {
  for (const [id, , get] of FIELD_MAP) $(id).value = get() || '';
  $('phaseSelect').value = String(session.phase);
  updatePhaseGuide();
}

/* phases */
const phaseSelect = $('phaseSelect');
PHASES.forEach(([label], i) => {
  const opt = document.createElement('option');
  opt.value = String(i + 1); opt.textContent = 'Phase ' + label;
  phaseSelect.appendChild(opt);
});
function updatePhaseGuide() { $('phaseGuide').textContent = PHASES[(session.phase || 3) - 1][1]; }
on(phaseSelect, 'change', (e) => { session.phase = +e.target.value; updatePhaseGuide(); saveSession(); });

/* ---------- session lifecycle / export ---------- */
function sessionHasContent(s) {
  return s.sets.length || s.notes || s.clientLabel || Object.values(s.assessment).some(v => v);
}
on($('btnNewSession'), 'click', () => {
  if (sessionHasContent(session)) {
    if (!confirm('Archive the current session and start a new one?')) return;
    session.endedISO = new Date().toISOString();
    pastSessions.unshift(session);
    if (pastSessions.length > 60) pastSessions.length = 60;
    store.set('bls.sessions', pastSessions);
  }
  session = newSessionObj();
  currentSetNumber = 1;
  store.set('bls.session', session);
  fillSessionFields(); renderSetLog(); renderPastSessions();
  setTransportStatus('New session — ready, Set 1');
});

function sessionToText(s) {
  const d = new Date(s.startedISO);
  const a = s.assessment;
  const lines = [
    'EMDR SESSION NOTES',
    `Date: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    `Client: ${s.clientLabel || '—'}`,
    `Phase: ${PHASES[(s.phase || 3) - 1][0]}`,
    '',
    'ASSESSMENT',
    `Target / memory: ${a.target || '—'}`,
    `Image (worst part): ${a.image || '—'}`,
    `Negative cognition: ${a.nc || '—'}`,
    `Positive cognition: ${a.pc || '—'}`,
    `VOC (initial): ${a.voc || '—'}`,
    `Emotion(s): ${a.emotion || '—'}`,
    `SUD (initial): ${a.sud || '—'}`,
    `Body location: ${a.body || '—'}`,
    '',
    'SETS'
  ];
  if (!s.sets.length) lines.push('(none)');
  for (const t of s.sets) {
    if (t.type === 'check') {
      lines.push(`  · Check-in — SUD ${t.sud ?? '–'}, VOC ${t.voc ?? '–'}${t.note ? ' — ' + t.note : ''}`);
    } else {
      lines.push(`  #${t.n}: ${t.passes} passes @ ${t.speed}/min (${t.direction}, ${t.seconds}s)` +
        ` — SUD ${t.sud ?? '–'}, VOC ${t.voc ?? '–'}${t.note ? ' — ' + t.note : ''}`);
    }
  }
  lines.push('', 'NOTES', s.notes || '—', '', `Exported from BLS Cockpit v${VERSION} — data stored locally only.`);
  return lines.join('\n');
}
function stamp(s) { return new Date(s.startedISO).toISOString().slice(0, 16).replace(/[:T]/g, '-'); }
on($('btnExportTxt'), 'click', () => downloadFile(`emdr-session-${stamp(session)}.txt`, sessionToText(session)));
on($('btnExportJson'), 'click', () => downloadFile(`emdr-session-${stamp(session)}.json`, JSON.stringify(session, null, 2), 'application/json'));

on($('btnPrint'), 'click', () => {
  const s = session, a = s.assessment, d = new Date(s.startedISO);
  const rows = s.sets.map(t => t.type === 'check'
    ? `<tr><td>·</td><td colspan="2">check-in</td><td>${t.sud ?? '–'}</td><td>${t.voc ?? '–'}</td><td>${esc(t.note)}</td></tr>`
    : `<tr><td>${t.n}</td><td>${t.passes}</td><td>${t.speed}/min</td><td>${t.sud ?? '–'}</td><td>${t.voc ?? '–'}</td><td>${esc(t.note)}</td></tr>`).join('');
  $('printReport').innerHTML = `
    <h1>EMDR Session Notes</h1>
    <p class="meta">${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — Client: ${esc(s.clientLabel) || '—'} — Phase ${esc(PHASES[(s.phase || 3) - 1][0])}</p>
    <h2>Assessment</h2>
    <p>Target: ${esc(a.target) || '—'}<br>Image: ${esc(a.image) || '—'}<br>NC: ${esc(a.nc) || '—'}<br>PC: ${esc(a.pc) || '—'}<br>
    VOC: ${esc(a.voc) || '—'} · SUD: ${esc(a.sud) || '—'} · Emotion: ${esc(a.emotion) || '—'} · Body: ${esc(a.body) || '—'}</p>
    <h2>Sets</h2>
    <table><thead><tr><th>#</th><th>Passes</th><th>Speed</th><th>SUD</th><th>VOC</th><th>Note</th></tr></thead><tbody>${rows || '<tr><td colspan="6">none</td></tr>'}</tbody></table>
    <h2>Notes</h2><p>${esc(s.notes).replace(/\n/g, '<br>') || '—'}</p>`;
  window.print();
});

function renderPastSessions() {
  const list = $('pastList');
  $('pastCount').textContent = pastSessions.length ? `${pastSessions.length} stored` : '';
  if (!pastSessions.length) {
    list.innerHTML = '<li class="past-list-empty">Archived sessions appear here when you press “New”.</li>';
    return;
  }
  list.innerHTML = '';
  pastSessions.forEach((s, i) => {
    const li = document.createElement('li');
    const d = new Date(s.startedISO);
    const nSets = s.sets.filter(x => x.type === 'set').length;
    li.innerHTML = `<div class="past-meta"><strong>${esc(s.clientLabel) || 'Unlabelled'}</strong>
      <span>${d.toLocaleDateString()} · ${nSets} set${nSets === 1 ? '' : 's'}</span></div>`;
    const dl = document.createElement('button');
    dl.className = 'btn btn-icon'; dl.type = 'button'; dl.setAttribute('aria-label', 'Export session as text');
    dl.innerHTML = '<svg class="ic"><use href="#i-download"/></svg>';
    on(dl, 'click', () => downloadFile(`emdr-session-${stamp(s)}.txt`, sessionToText(s)));
    const del = document.createElement('button');
    del.className = 'btn btn-icon'; del.type = 'button'; del.setAttribute('aria-label', 'Delete session');
    del.innerHTML = '<svg class="ic"><use href="#i-trash"/></svg>';
    on(del, 'click', () => {
      if (!confirm('Delete this archived session? This cannot be undone.')) return;
      pastSessions.splice(i, 1);
      store.set('bls.sessions', pastSessions);
      renderPastSessions();
    });
    li.append(dl, del);
    list.appendChild(li);
  });
}

/* ---------- safety prompts ---------- */
let activePromptId = null;
function renderPromptButtons() {
  const grid = $('promptGrid');
  grid.innerHTML = '';
  for (const p of prompts) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'prompt-btn'; b.textContent = p.label;
    b.dataset.pid = p.id;
    on(b, 'click', () => activePromptId === p.id ? hidePrompt() : showPrompt(p));
    grid.appendChild(b);
  }
  const editors = $('promptEditors');
  editors.innerHTML = '';
  for (const p of prompts) {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const lab = document.createElement('label');
    lab.textContent = p.label;
    const ta = document.createElement('textarea');
    ta.rows = 3; ta.value = p.text;
    on(ta, 'input', debounce(() => { p.text = ta.value; store.set('bls.prompts', prompts); }, 400));
    wrap.append(lab, ta);
    editors.appendChild(wrap);
  }
}
function showPrompt(p, long) {
  if (running) stopRun('prompt');
  activePromptId = p.id;
  $('promptText').textContent = p.text;
  const ov = $('promptOverlay');
  ov.classList.toggle('long', !!long);
  ov.hidden = false;
  anim(ov, { opacity: [0, 1] }, { duration: 0.3 });
  post({ t: 'prompt', text: p.text, long: !!long });
  $('btnClearPrompt').hidden = false;
  document.querySelectorAll('.prompt-btn').forEach(b => b.classList.toggle('active', b.dataset.pid === p.id));
}
function hidePrompt() {
  if (!activePromptId) return;
  activePromptId = null;
  $('promptOverlay').hidden = true;
  $('btnClearPrompt').hidden = true;
  post({ t: 'prompt-off' });
  document.querySelectorAll('.prompt-btn').forEach(b => b.classList.remove('active'));
}
on($('btnClearPrompt'), 'click', hidePrompt);
on($('btnPromptDismiss'), 'click', hidePrompt);

/* ---------- emergency tab ---------- */
$('emGrounding').value = emergency.grounding;
$('emCrisis').value = emergency.crisis;
$('emSupports').value = emergency.supports;
const saveEmergency = debounce(() => store.set('bls.emergency', emergency), 400);
on($('emGrounding'), 'input', (e) => { emergency.grounding = e.target.value; saveEmergency(); });
on($('emCrisis'), 'input', (e) => { emergency.crisis = e.target.value; saveEmergency(); });
on($('emSupports'), 'input', (e) => { emergency.supports = e.target.value; saveEmergency(); });
on($('btnShowGrounding'), 'click', () =>
  showPrompt({ id: 'em-grounding', text: emergency.grounding }, true));

/* ---------- settings tab: data ---------- */
on($('btnExportAll'), 'click', () => {
  const dump = {
    exportedAt: new Date().toISOString(), version: VERSION,
    settings, presets: customPresets, prompts, emergency,
    currentSession: session, sessions: pastSessions
  };
  downloadFile(`bls-cockpit-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(dump, null, 2), 'application/json');
});
on($('btnEraseAll'), 'click', () => {
  if (!confirm('Erase ALL app data on this device — settings, presets, prompts and every session note?')) return;
  if (!confirm('Last check: this cannot be undone. Erase everything?')) return;
  ['bls.settings', 'bls.presets', 'bls.session', 'bls.sessions', 'bls.prompts', 'bls.emergency', 'bls.ack'].forEach(k => store.remove(k));
  location.reload();
});

/* ---------- first-run acknowledgement ---------- */
if (!store.get('bls.ack', false)) {
  const m = $('ackModal');
  m.hidden = false;
  anim(m.querySelector('.modal'), { scale: [0.94, 1], opacity: [0, 1] }, { duration: 0.3, ease: 'easeOut' });
}
on($('btnAck'), 'click', () => { store.set('bls.ack', true); $('ackModal').hidden = true; });

/* ---------- init ---------- */
applyTheme();
renderPresets();
refreshAllControls();
applyStageVisuals();
bindSessionFields();
fillSessionFields();
renderSetLog();
renderPastSessions();
renderPromptButtons();
renderer.measure();
new ResizeObserver(() => renderer.measure()).observe(stage);
currentSetNumber = session.sets.filter(s => s.type === 'set').length + 1;
setTransportStatus(`Ready — Set ${currentSetNumber}`);
$('versionLine').textContent = 'v' + VERSION + ' — works offline once loaded';

/* PWA */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

})();
