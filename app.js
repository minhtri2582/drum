/**
 * Trống điện tử online - Drum Machine
 * Lưu và chỉnh sửa điệu trống dễ dàng
 */

const INSTRUMENTS = [
  { id: 'hihatPedal' },
  { id: 'tom' },
  { id: 'floorTom' },
  { id: 'cymbal' },
  { id: 'ride' },
  { id: 'cowbell' },
  { id: 'hihat' },
  { id: 'snare' },
  { id: 'kick' }
];

const STEPS = 32;
const DEFAULT_BPM = 90;

// State
let pattern = {};
let isPlaying = false;
let currentStep = 0;
let intervalId = null;
let mutedInstruments = new Set();
let audioContext = null;

// DOM elements
const playBtn = document.getElementById('playBtn');
const bpmInput = document.getElementById('bpm');
const clearBtn = document.getElementById('clearBtn');
const copyUrlBtn = document.getElementById('copyUrlBtn');
const copyStatus = document.getElementById('copyStatus');
const sequencerGrid = document.getElementById('sequencerGrid');
const sequencerEl = document.querySelector('.sequencer');
const rhythmModal = document.getElementById('rhythmModal');
const rhythmBtn = document.getElementById('rhythmBtn');
const closeRhythm = document.getElementById('closeRhythm');
const metronomeCheck = document.getElementById('metronomeCheck');
const timeSignatureSelect = document.getElementById('timeSignature');

const PRESETS_YAML_PATH = 'styles/presets.yaml';
const API_BASE = '';

const ICON_PLAY = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const ICON_EDIT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
const ICON_DELETE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';

let currentUser = null;

// Dialog modal helpers (thay thế alert, confirm, prompt)
function showAlert(message, title) {
  if (title === undefined) title = t('alertTitle');
  return new Promise((resolve) => {
    const modal = document.getElementById('dialogModal');
    const titleEl = document.getElementById('dialogTitle');
    const messageEl = document.getElementById('dialogMessage');
    const inputEl = document.getElementById('dialogInput');
    const actionsEl = document.getElementById('dialogActions');
    if (!modal || !titleEl || !messageEl || !actionsEl) return resolve();
    titleEl.textContent = title;
    messageEl.textContent = message;
    messageEl.style.display = '';
    inputEl.style.display = 'none';
    inputEl.classList.add('hidden');
    actionsEl.innerHTML = '<button class="btn btn-save dialog-ok">' + escapeHtml(t('ok')) + '</button>';
    const okBtn = actionsEl.querySelector('.dialog-ok');
    const close = () => {
      modal.classList.remove('active');
      okBtn.removeEventListener('click', onOk);
      resolve();
    };
    const onOk = () => close();
    okBtn.addEventListener('click', onOk);
    modal.classList.add('active');
  });
}

function showConfirm(message, confirmText, cancelText, title, isDanger = false) {
  if (confirmText === undefined) confirmText = t('confirm');
  if (cancelText === undefined) cancelText = t('cancel');
  if (title === undefined) title = t('confirmTitle');
  return new Promise((resolve) => {
    const modal = document.getElementById('dialogModal');
    const titleEl = document.getElementById('dialogTitle');
    const messageEl = document.getElementById('dialogMessage');
    const inputEl = document.getElementById('dialogInput');
    const actionsEl = document.getElementById('dialogActions');
    if (!modal || !titleEl || !messageEl || !actionsEl) return resolve(false);
    titleEl.textContent = title;
    messageEl.textContent = message;
    messageEl.style.display = '';
    inputEl.style.display = 'none';
    inputEl.classList.add('hidden');
    const confirmClass = isDanger ? 'btn btn-danger' : 'btn btn-save';
    actionsEl.innerHTML = `<button class="btn btn-ghost dialog-cancel">${escapeHtml(cancelText)}</button><button class="${confirmClass} dialog-confirm">${escapeHtml(confirmText)}</button>`;
    const cancelBtn = actionsEl.querySelector('.dialog-cancel');
    const confirmBtn = actionsEl.querySelector('.dialog-confirm');
    const close = (result) => {
      modal.classList.remove('active');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
      resolve(result);
    };
    const onCancel = () => close(false);
    const onConfirm = () => close(true);
    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
    modal.classList.add('active');
  });
}

function showPrompt(message, defaultValue = '', title, placeholder = '') {
  if (title === undefined) title = t('presetName');
  return new Promise((resolve) => {
    const modal = document.getElementById('dialogModal');
    const titleEl = document.getElementById('dialogTitle');
    const messageEl = document.getElementById('dialogMessage');
    const inputEl = document.getElementById('dialogInput');
    const actionsEl = document.getElementById('dialogActions');
    if (!modal || !titleEl || !messageEl || !inputEl || !actionsEl) return resolve(null);
    titleEl.textContent = title;
    messageEl.textContent = message;
    messageEl.style.display = message ? '' : 'none';
    inputEl.style.display = '';
    inputEl.classList.remove('hidden');
    inputEl.value = defaultValue;
    inputEl.placeholder = placeholder || defaultValue || '';
    actionsEl.innerHTML = '<button class="btn btn-ghost dialog-cancel">' + escapeHtml(t('cancel')) + '</button><button class="btn btn-save dialog-confirm">' + escapeHtml(t('ok')) + '</button>';
    const cancelBtn = actionsEl.querySelector('.dialog-cancel');
    const confirmBtn = actionsEl.querySelector('.dialog-confirm');
    const close = (result) => {
      modal.classList.remove('active');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
      inputEl.removeEventListener('keydown', onKey);
      resolve(result);
    };
    const onCancel = () => close(null);
    const onConfirm = () => close(inputEl.value.trim());
    const onKey = (e) => {
      if (e.key === 'Enter') onConfirm();
      else if (e.key === 'Escape') onCancel();
    };
    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
    inputEl.addEventListener('keydown', onKey);
    modal.classList.add('active');
    inputEl.focus();
    setTimeout(() => inputEl.select(), 0);
  });
}

function getEmptyPattern() {
  const p = {};
  INSTRUMENTS.forEach(inst => {
    p[inst.id] = Array(STEPS).fill(0);
  });
  return p;
}

function repeatPattern(arr, len) {
  const base = arr.length;
  const result = [];
  for (let i = 0; i < len; i++) result.push(arr[i % base] || 0);
  return result;
}

function getBasicRockPattern() {
  const p = getEmptyPattern();
  const kick = [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0];
  const snare = [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
  const hihat = [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0];
  p.kick = repeatPattern(kick, STEPS);
  p.snare = repeatPattern(snare, STEPS);
  p.hihat = repeatPattern(hihat, STEPS);
  return p;
}

function getFunkPattern() {
  const p = getEmptyPattern();
  const kick = [1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0];
  const snare = [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
  const hihat = [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0];
  p.kick = repeatPattern(kick, STEPS);
  p.snare = repeatPattern(snare, STEPS);
  p.hihat = repeatPattern(hihat, STEPS);
  return p;
}

function getHipHopPattern() {
  const p = getEmptyPattern();
  const kick = [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0];
  const snare = [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
  const hihat = [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0];
  p.kick = repeatPattern(kick, STEPS);
  p.snare = repeatPattern(snare, STEPS);
  p.hihat = repeatPattern(hihat, STEPS);
  return p;
}

function getHousePattern() {
  const p = getEmptyPattern();
  const kick = [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0];
  const snare = [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
  const hihat = [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
  p.kick = repeatPattern(kick, STEPS);
  p.snare = repeatPattern(snare, STEPS);
  p.hihat = repeatPattern(hihat, STEPS);
  return p;
}

function getDiscoPattern() {
  const p = getEmptyPattern();
  const kick = [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0];
  const snare = [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0];
  const hihat = [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,2];
  const cymbal = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1];
  p.kick = repeatPattern(kick, STEPS);
  p.snare = repeatPattern(snare, STEPS);
  p.hihat = repeatPattern(hihat, STEPS);
  p.cymbal = repeatPattern(cymbal, STEPS);
  return p;
}

function getOpenHatRimshotPattern() {
  const p = getEmptyPattern();
  const kick = [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0];
  const snare = [0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0];
  const hihat = [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,2];
  p.kick = repeatPattern(kick, STEPS);
  p.snare = repeatPattern(snare, STEPS);
  p.hihat = repeatPattern(hihat, STEPS);
  return p;
}

function getTimeSignatureConfig() {
  const val = timeSignatureSelect ? timeSignatureSelect.value : '4/4';
  if (val === '3/4') return { measures: 6, subdivisions: 4 };
  if (val === '12/8') return { measures: 8, subdivisions: 3 };
  return { measures: 8, subdivisions: 4 };
}

function getMeasuresCount() {
  return getTimeSignatureConfig().measures;
}

function getSubdivisionsPerMeasure() {
  return getTimeSignatureConfig().subdivisions;
}

function getStepsCount() {
  const cfg = getTimeSignatureConfig();
  return cfg.measures * cfg.subdivisions;
}

// Initialize pattern from empty or URL
function initPattern() {
  INSTRUMENTS.forEach(inst => {
    if (!pattern[inst.id]) {
      pattern[inst.id] = Array(STEPS).fill(0);
    }
  });
}

// Sample WAV - Pearl Master Studio (Oramics Sampled, CC BY 3.0)
// Bộ trống jazz hãng Pearl - https://oramics.github.io/sampled/DRUMS/pearl-master-studio/
const SAMPLE_BASE = 'https://oramics.github.io/sampled/DRUMS/pearl-master-studio/samples/';
const SAMPLE_KEYS = {
  kick: 'kick-01.wav',
  snare: 'snare-03.wav',        // Snare mềm, articulate (jazz)
  snareRimshot: 'snare-02.wav', // Sidestick / rim click
  hihatClosed: 'hihat-closed.wav',
  hihatOpen: 'hihat-open.wav',
  tomHigh: 'tom-02.wav',        // Tom nhỏ, sáng (jazz kit)
  tomLow: 'tom-03.wav',
  cymbal: 'crash-02.wav',       // Crash nhẹ hơn
  ride: 'ride-02.wav',          // Ride jazz, warm
  cowbell: null                 // Load từ TR-505 (SAMPLE_EXTRA)
};
const SAMPLE_EXTRA = {
  cowbell: 'https://oramics.github.io/sampled/DM/TR-505/samples/tr505-cowb-h.wav'
};
let sampleBuffers = {};
let samplesLoaded = false;

async function loadSamples() {
  if (samplesLoaded) return;
  const ctx = getAudioContext();
  const tasks = [];
  for (const key of Object.keys(SAMPLE_KEYS)) {
    const file = SAMPLE_KEYS[key];
    const url = file ? SAMPLE_BASE + file : SAMPLE_EXTRA[key];
    if (!url) continue;
    tasks.push((async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Sample fetch failed: ' + key);
      const arrayBuffer = await res.arrayBuffer();
      sampleBuffers[key] = await ctx.decodeAudioData(arrayBuffer);
    })());
  }
  try {
    await Promise.all(tasks);
    samplesLoaded = true;
  } catch (e) {
    console.warn('Drum samples load failed, using synthesis:', e.message);
  }
}

const HIHAT_GAIN = 0.55;   // Hi-hat nhẹ hơn (0–1)
const CYMBAL_GAIN = 0.5;  // Cymbal nhẹ hơn (0–1)

function playSampleBuffer(key, gain = 1) {
  const buf = sampleBuffers[key];
  if (!buf) return false;
  const ctx = getAudioContext();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  let g = gain;
  if (key === 'hihatClosed' || key === 'hihatOpen') g = HIHAT_GAIN;
  else if (key === 'cymbal') g = CYMBAL_GAIN;
  if (g < 1) {
    const gainNode = ctx.createGain();
    gainNode.gain.value = g;
    src.connect(gainNode);
    gainNode.connect(ctx.destination);
  } else {
    src.connect(ctx.destination);
  }
  src.start(0);
  return true;
}

// Web Audio API - drum kit synthesis (fallback when samples unavailable)
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playKick() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(52, t + 0.012);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
  osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.22);
  gain.gain.setValueAtTime(1, t);
  gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
  osc.start(t);
  osc.stop(t + 0.22);
}

function playSnare() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  // Body - thân trống
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(95, t + 0.025);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);
  oscGain.gain.setValueAtTime(0.55, t);
  oscGain.gain.exponentialRampToValueAtTime(0.15, t + 0.04);
  oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  osc.start(t);
  osc.stop(t + 0.1);
  // Crack - tiếng dây snare (noise bandpass 2-5kHz)
  const bufferSize = ctx.sampleRate * 0.08;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.04));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 3200;
  noiseFilter.Q.value = 1.2;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseGain.gain.setValueAtTime(0.5, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
  noise.start(t);
  noise.stop(t + 0.08);
}

function playSnareRimshot() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.02);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.5, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
  osc.start(t);
  osc.stop(t + 0.04);
  const bufferSize = ctx.sampleRate * 0.025;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 2800;
  noiseFilter.Q.value = 2;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseGain.gain.setValueAtTime(0.35, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.02);
  noise.start(t);
  noise.stop(t + 0.025);
}

function playHiHat(closed = true) {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const dur = closed ? 0.035 : 0.15;
  const bufferSize = ctx.sampleRate * dur;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const decay = closed ? 0.15 : 0.25;
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * decay));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = closed ? 9200 : 7500;
  filter.Q.value = closed ? 1.2 : 0.6;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(closed ? 0.14 : 0.12, t);  // Nhẹ hơn
  gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
  noise.start(t);
  noise.stop(t + dur);
}

function playTom(freq) {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 1.15, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.015);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.12);
  gain.gain.setValueAtTime(0.6, t);
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
  osc.start(t);
  osc.stop(t + 0.12);
}

function playMetronomeClick(accent = false) {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(accent ? 1000 : 800, t);
  osc.type = 'sine';
  gain.gain.setValueAtTime(accent ? 0.15 : 0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
  osc.start(t);
  osc.stop(t + 0.03);
}

function playCowbell() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1050, t);
  osc.frequency.exponentialRampToValueAtTime(650, t + 0.025);
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  osc.start(t);
  osc.stop(t + 0.1);
}

function playCymbal() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.35;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.12));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 5200;
  filter.Q.value = 0.6;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.14, t);  // Nhẹ hơn
  gain.gain.exponentialRampToValueAtTime(0.04, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
  noise.start(t);
  noise.stop(t + 0.35);
}

function playRide() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.25;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.08));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 6800;
  filter.Q.value = 0.6;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.22, t);
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
  noise.start(t);
  noise.stop(t + 0.25);
}

function playDrum(instrumentId, value = 1) {
  if (mutedInstruments.has(instrumentId)) return;
  // Ưu tiên sample WAV nếu đã load
  const useSample = (key) => playSampleBuffer(key);
  switch (instrumentId) {
    case 'kick':
      if (!useSample('kick')) playKick();
      break;
    case 'snare':
      if (value === 2) return useSample('snareRimshot') || playSnareRimshot();
      if (!useSample('snare')) playSnare();
      break;
    case 'hihat':
    case 'hihatPedal':
      if (!useSample(value === 2 ? 'hihatOpen' : 'hihatClosed')) playHiHat(value !== 2);
      break;
    case 'tom':
      if (value === 2) return useSample('tomLow') || playTom(95);
      if (!useSample('tomHigh')) playTom(165);
      break;
    case 'floorTom':
      if (!useSample('tomLow')) playTom(95);
      break;
    case 'cymbal':
      if (!useSample('cymbal')) playCymbal();
      break;
    case 'ride':
      if (!useSample('ride')) playRide();
      break;
    case 'cowbell':
      if (!useSample('cowbell')) playCowbell();
      break;
    default: break;
  }
}

// Build sequencer UI
function renderSequencer() {
  const stepsCount = getStepsCount();
  const subdivisions = getSubdivisionsPerMeasure();
  sequencerGrid.innerHTML = '';
  INSTRUMENTS.forEach(inst => {
    const row = document.createElement('div');
    row.className = 'sequencer-row';
    const nameEl = document.createElement('div');
    nameEl.className = 'instrument-name' + (mutedInstruments.has(inst.id) ? ' muted' : '');
    nameEl.textContent = t(inst.id);
    nameEl.dataset.instrument = inst.id;
    nameEl.addEventListener('click', () => toggleMute(inst.id));
    const stepsEl = document.createElement('div');
    stepsEl.className = 'steps steps-' + stepsCount;
    for (let i = 0; i < stepsCount; i++) {
      const step = document.createElement('button');
      const val = pattern[inst.id] && pattern[inst.id][i];
      const isDownbeat = i % subdivisions === 0;
      step.className = 'step' + (isDownbeat ? ' downbeat' : '') + (val ? ' active' : '') + (val === 2 ? ' variant' : '');
      step.dataset.instrument = inst.id;
      step.dataset.step = i;
      step.setAttribute('type', 'button');
      step.title = (inst.id === 'hihat' || inst.id === 'hihatPedal') && val === 2 ? t('hihatOpen') :
        inst.id === 'snare' && val === 2 ? t('snareRimshot') :
        inst.id === 'tom' && val === 2 ? t('tomLow') : '';
      step.addEventListener('click', () => toggleStep(inst.id, i));
      stepsEl.appendChild(step);
    }
    row.appendChild(nameEl);
    row.appendChild(stepsEl);
    sequencerGrid.appendChild(row);
  });
  updateGridHeader();
}

function updateGridHeader() {
  const stepsCount = getStepsCount();
  const measuresCount = getMeasuresCount();
  const header = document.querySelector('.steps-header');
  if (!header) return;
  header.className = 'steps-header steps-header-' + stepsCount;
  header.innerHTML = '';
  const colsPerMeasure = stepsCount / measuresCount;
  for (let m = 0; m < measuresCount; m++) {
    const span = document.createElement('span');
    span.className = 'measure';
    span.textContent = m + 1;
    span.style.gridColumn = 'span ' + colsPerMeasure;
    header.appendChild(span);
  }
}

function toggleStep(instrumentId, stepIndex) {
  if (!pattern[instrumentId]) pattern[instrumentId] = Array(STEPS).fill(0);
  if (stepIndex >= getStepsCount()) return;
  const hasVariant = instrumentId === 'hihat' || instrumentId === 'hihatPedal' || instrumentId === 'snare' || instrumentId === 'tom';
  const current = pattern[instrumentId][stepIndex] || 0;
  if (hasVariant) {
    pattern[instrumentId][stepIndex] = current === 0 ? 1 : current === 1 ? 2 : 0;
  } else {
    pattern[instrumentId][stepIndex] = current ? 0 : 1;
  }
  updateStepUI(instrumentId, stepIndex);
  updateUrl();
}

function toggleMute(instrumentId) {
  if (mutedInstruments.has(instrumentId)) {
    mutedInstruments.delete(instrumentId);
  } else {
    mutedInstruments.add(instrumentId);
  }
  renderSequencer();
}

function updateStepUI(instrumentId, stepIndex) {
  const step = document.querySelector(`.step[data-instrument="${instrumentId}"][data-step="${stepIndex}"]`);
  if (step) {
    const val = pattern[instrumentId][stepIndex];
    step.classList.toggle('active', !!val);
    step.classList.toggle('variant', val === 2);
    step.title = (instrumentId === 'hihat' || instrumentId === 'hihatPedal') && val === 2 ? t('hihatOpen') :
      instrumentId === 'snare' && val === 2 ? t('snareRimshot') :
      instrumentId === 'tom' && val === 2 ? t('tomLow') : '';
  }
}

function updateCurrentStepUI() {
  document.querySelectorAll('.step').forEach(el => {
    el.classList.remove('current');
    if (parseInt(el.dataset.step) === currentStep) {
      el.classList.add('current');
    }
  });
  // Auto-scroll sequencer on mobile khi đang phát để step hiện tại luôn visible
  if (isPlaying && sequencerEl && sequencerEl.scrollWidth > sequencerEl.clientWidth) {
    const currentStepEl = document.querySelector(`.step[data-step="${currentStep}"]`);
    if (currentStepEl) {
      currentStepEl.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
    }
  }
}

// Playback
function getBpm() {
  return Math.max(40, Math.min(240, parseInt(bpmInput.value) || DEFAULT_BPM));
}

function startPlayback() {
  if (isPlaying) return;
  getAudioContext().resume();
  isPlaying = true;
  playBtn.classList.add('playing');
  playBtn.querySelector('.play-icon').textContent = '■';
  const interval = 60000 / getBpm() / 4;
  currentStep = 0;
  updateCurrentStepUI();
  const stepsCount = getStepsCount();
  const subdivisions = getSubdivisionsPerMeasure();
  intervalId = setInterval(() => {
    if (metronomeCheck && metronomeCheck.checked) {
      const isQuarterBeat = currentStep % subdivisions === 0;
      if (isQuarterBeat) {
        playMetronomeClick(currentStep === 0);
      }
    }
    INSTRUMENTS.forEach(inst => {
      const val = pattern[inst.id] && pattern[inst.id][currentStep];
      if (val) {
        playDrum(inst.id, val);
      }
    });
    currentStep = (currentStep + 1) % stepsCount;
    updateCurrentStepUI();
  }, interval);
}

function stopPlayback() {
  if (!isPlaying) return;
  isPlaying = false;
  playBtn.classList.remove('playing');
  playBtn.querySelector('.play-icon').textContent = '▶';
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  document.querySelectorAll('.step').forEach(el => el.classList.remove('current'));
}

function togglePlayback() {
  if (isPlaying) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

// Clear
function clearPattern() {
  INSTRUMENTS.forEach(inst => {
    pattern[inst.id] = Array(STEPS).fill(0);
  });
  updatePresetNameDisplay('');
  renderSequencer();
  updateUrl();
}

// URL encode/decode for saving
function encodePattern() {
  const bpm = getBpm();
  const ts = timeSignatureSelect ? timeSignatureSelect.value : '4/4';
  const parts = [bpm, ts];
  INSTRUMENTS.forEach(inst => {
    const row = pattern[inst.id] || Array(STEPS).fill(0);
    parts.push(row.join(''));
  });
  return btoa(encodeURIComponent(JSON.stringify(parts)));
}

function decodePattern(encoded) {
  try {
    const decoded = decodeURIComponent(atob(encoded));
    const parts = JSON.parse(decoded);
    if (Array.isArray(parts) && parts.length >= 1) {
      const bpm = parseInt(parts[0]) || DEFAULT_BPM;
      bpmInput.value = bpm;
      let offset = 1;
      if (parts.length >= 2 && ['3/4', '4/4', '12/8'].includes(parts[1]) && timeSignatureSelect) {
        timeSignatureSelect.value = parts[1];
        offset = 2;
      }
      for (let i = offset; i < parts.length && i - offset < INSTRUMENTS.length; i++) {
        const inst = INSTRUMENTS[i - offset];
        const str = String(parts[i]).padEnd(STEPS, '0').slice(0, STEPS);
        pattern[inst.id] = str.split('').map(Number);
      }
      return true;
    }
  } catch (e) {
    console.warn('Invalid pattern data:', e);
  }
  return false;
}

function updateUrl() {
  const encoded = encodePattern();
  const url = new URL(window.location.href);
  url.searchParams.set('data', encoded);
  window.history.replaceState({}, '', url.toString());
}

function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const data = params.get('data');
  if (data) {
    decodePattern(data);
  }
}

function copyUrlToClipboard() {
  updateUrl();
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    copyStatus.textContent = t('copySuccess');
    copyStatus.style.color = 'var(--accent)';
    setTimeout(() => { copyStatus.textContent = ''; }, 2000);
  }).catch(() => {
    copyStatus.textContent = t('copyError');
    copyStatus.style.color = '#dc2626';
  });
}

function yamlPresetToPattern(preset) {
  const p = getEmptyPattern();
  const inst = preset.instruments || {};
  INSTRUMENTS.forEach(i => {
    if (inst[i.id]) {
      p[i.id] = repeatPattern(inst[i.id], STEPS);
    }
  });
  return p;
}

function loadPresetsFromYaml() {
  return fetch(PRESETS_YAML_PATH)
    .then(r => { if (!r.ok) throw new Error('YAML not found'); return r.text(); })
    .then(text => {
      const data = typeof jsyaml !== 'undefined' ? jsyaml.load(text) : null;
      return data && data.presets ? data.presets : getFallbackPresets();
    })
    .catch(() => getFallbackPresets());
}

async function loadPresetsFromServer() {
  try {
    const r = await fetch(API_BASE + '/api/presets', { credentials: 'include' });
    if (r.ok) {
      const data = await r.json();
      return data.map(p => ({
        name: p.name,
        bpm: p.bpm,
        timeSignature: p.timeSignature || '4/4',
        instruments: p.instruments || {},
        id: p.id,
        isOwner: p.isOwner,
      }));
    }
  } catch (e) {
    console.warn('Server presets unavailable:', e);
  }
  return null;
}

async function loadUser() {
  try {
    const r = await fetch(API_BASE + '/api/me', { credentials: 'include' });
    if (r.ok) {
      currentUser = await r.json();
      return currentUser;
    }
  } catch (e) {
    console.warn('Auth check failed:', e);
  }
  currentUser = null;
  return null;
}

function updateAuthUI() {
  const loginPrompt = document.getElementById('loginPrompt');
  const userArea = document.getElementById('userArea');
  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  const myPresetsBtn = document.getElementById('myPresetsBtn');
  if (currentUser) {
    if (loginPrompt) loginPrompt.style.display = 'none';
    if (userArea) {
      userArea.style.display = 'flex';
      if (userName) userName.textContent = currentUser.name || currentUser.email;
      if (userAvatar) {
        userAvatar.src = currentUser.picture || '';
        userAvatar.style.display = currentUser.picture ? 'block' : 'none';
      }
    }
    if (myPresetsBtn) myPresetsBtn.style.display = 'inline-block';
  } else {
    if (loginPrompt) loginPrompt.style.display = 'flex';
    if (userArea) userArea.style.display = 'none';
    if (myPresetsBtn) myPresetsBtn.style.display = 'none';
  }
}

function buildPresetFromCurrent(name) {
  const preset = {
    name,
    bpm: getBpm(),
    timeSignature: timeSignatureSelect ? timeSignatureSelect.value : '4/4',
    instruments: {},
    isPublic: false,
  };
  INSTRUMENTS.forEach(inst => {
    const row = pattern[inst.id] || Array(STEPS).fill(0);
    preset.instruments[inst.id] = repeatPattern(row, STEPS);
  });
  return preset;
}

async function loadMyPresets() {
  try {
    const r = await fetch(API_BASE + '/api/presets/mine', { credentials: 'include' });
    if (r.ok) return await r.json();
  } catch (e) {
    console.warn('Load my presets failed:', e);
  }
  return [];
}

let myPresetsCache = [];
let myPresetsSortOrder = 'updated-desc';
let myPresetsTab = 'mine'; // 'mine' | 'favourite' | 'shared'

function formatDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
}

function sortPresets(presets, order) {
  const arr = [...presets];
  const cmp = (a, b) => {
    switch (order) {
      case 'name-asc': return (a.name || '').localeCompare(b.name || '');
      case 'name-desc': return (b.name || '').localeCompare(a.name || '');
      case 'created-desc': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      case 'created-asc': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      case 'updated-desc': return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      case 'updated-asc': return new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0);
      default: return 0;
    }
  };
  return arr.sort(cmp);
}

function formatOwnerEmail(email) {
  if (!email) return '-';
  if (email.toLowerCase().endsWith('@gmail.com')) {
    return email.slice(0, -10);
  }
  return email;
}

function renderMyPresetsList(presets, searchTerm = '', sortOrder = myPresetsSortOrder, tab = myPresetsTab) {
  const container = document.getElementById('myPresetsList');
  const search = searchTerm.toLowerCase().trim();
  let filtered;
  if (tab === 'mine') filtered = presets.filter(p => p.isOwner);
  else if (tab === 'favourite') filtered = presets.filter(p => p.isFavourite);
  else filtered = presets.filter(p => !p.isOwner);
  filtered = search ? filtered.filter(p => p.name.toLowerCase().includes(search)) : filtered;
  const sorted = sortPresets(filtered, sortOrder);
  container.innerHTML = '';
  if (sorted.length === 0) {
    let empty;
    if (tab === 'mine') empty = presets.filter(p => p.isOwner).length === 0 ? t('emptyMine') : t('notFound');
    else if (tab === 'favourite') empty = presets.filter(p => p.isFavourite).length === 0 ? t('emptyFavourite') : t('notFound');
    else empty = presets.filter(p => !p.isOwner).length === 0 ? t('emptyShared') : t('notFound');
    container.innerHTML = '<p class="rhythm-empty">' + empty + '</p>';
    updateShareButtonState();
    return;
  }
  const header = document.createElement('div');
  header.className = 'my-presets-list-header';
  header.innerHTML = `
    <span class="my-preset-col-check"><input type="checkbox" id="myPresetsSelectAll" title="${escapeHtml(t('selectAll'))}"></span>
    <span class="my-preset-col-name">${escapeHtml(t('colNameUser'))}</span>
    <span class="my-preset-col-actions"></span>
  `;
  container.appendChild(header);
  sorted.forEach(p => {
    const item = document.createElement('div');
    item.className = 'my-preset-item';
    const dateStr = formatDateShort(p.updatedAt || p.createdAt);
    const userDisplay = formatOwnerEmail(p.ownerEmail);
    const canShare = p.isOwner;
    const starTitle = p.isFavourite ? t('unfavourite') : t('favourite');
    const starClass = p.isFavourite ? 'btn-favourite active' : 'btn-favourite';
    item.innerHTML = `
      <span class="my-preset-col-check">
        ${canShare ? `<input type="checkbox" class="my-preset-checkbox" data-id="${p.id}">` : '<span class="my-preset-checkbox-placeholder"></span>'}
      </span>
      <div class="my-preset-info my-preset-col-name">
        <span class="my-preset-name" data-id="${p.id}">${escapeHtml(p.name)}</span>
        <span class="my-preset-meta">${escapeHtml(userDisplay)}${dateStr ? ' · ' + escapeHtml(dateStr) : ''}</span>
      </div>
      <div class="my-preset-actions my-preset-col-actions">
        <button class="btn btn-icon ${starClass}" data-id="${p.id}" title="${escapeHtml(starTitle)}" aria-label="${escapeHtml(starTitle)}">⭐</button>
        <button class="btn btn-icon btn-play" data-id="${p.id}" title="${escapeHtml(t('openPlay'))}">${ICON_PLAY}</button>
        ${p.isOwner ? `<button class="btn btn-icon btn-edit" data-id="${p.id}" title="${escapeHtml(t('edit'))}">${ICON_EDIT}</button><button class="btn btn-icon btn-danger" data-id="${p.id}" title="${escapeHtml(t('delete'))}">${ICON_DELETE}</button>` : ''}
      </div>
    `;
    item.querySelector('.my-preset-name').addEventListener('click', () => {
      applyPreset(p);
      closeMyPresetsModal();
      if (!isPlaying) startPlayback();
    });
    const favBtn = item.querySelector('.btn-favourite');
    if (favBtn) favBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavourite(p.id); });
    item.querySelector('.btn-play').addEventListener('click', (e) => {
      e.stopPropagation();
      applyPreset(p);
      closeMyPresetsModal();
      if (!isPlaying) startPlayback();
    });
    const editBtn = item.querySelector('.btn-edit');
    const delBtn = item.querySelector('.btn-danger');
    if (editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); editMyPreset(p.id, p.name); });
    if (delBtn) delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteMyPreset(p.id, p.name); });
    const cb = item.querySelector('.my-preset-checkbox');
    if (cb) {
      cb.addEventListener('change', () => updateShareButtonState());
    }
    container.appendChild(item);
  });
  const selectAll = document.getElementById('myPresetsSelectAll');
  if (selectAll) {
    selectAll.addEventListener('change', () => {
      container.querySelectorAll('.my-preset-checkbox').forEach(cb => {
        cb.checked = selectAll.checked;
      });
      updateShareButtonState();
    });
  }
  updateShareButtonState();
}

function getSelectedPresetIds() {
  return Array.from(document.querySelectorAll('.my-preset-checkbox:checked')).map(cb => parseInt(cb.dataset.id, 10));
}

function updateShareButtonState() {
  const btn = document.getElementById('sharePresetsBtn');
  if (!btn) return;
  const ids = getSelectedPresetIds();
  btn.disabled = ids.length === 0;
}

async function toggleFavourite(presetId) {
  try {
    const r = await fetch(API_BASE + '/api/presets/' + presetId + '/favourite', {
      method: 'POST',
      credentials: 'include',
    });
    if (!r.ok) return;
    const data = await r.json();
    const p = myPresetsCache.find(x => x.id === presetId);
    if (p) p.isFavourite = data.isFavourite;
    const searchInput = document.getElementById('myPresetsSearch');
    renderMyPresetsList(myPresetsCache, searchInput ? searchInput.value : '', myPresetsSortOrder, myPresetsTab);
  } catch (e) { console.warn(e); }
}

function openSharePresetsModal() {
  const ids = getSelectedPresetIds();
  if (ids.length === 0) return;
  window._sharePresetIds = ids;
  window._shareSelectedUser = null;
  const modal = document.getElementById('sharePresetsModal');
  const searchInput = document.getElementById('shareUserSearch');
  const resultsEl = document.getElementById('shareUserResults');
  const userSection = document.getElementById('shareUserSection');
  const confirmBtn = document.getElementById('shareConfirmBtn');
  modal.classList.add('active');
  document.querySelector('input[name="shareMode"][value="all"]')?.click();
  if (userSection) userSection.classList.add('hidden');
  if (searchInput) { searchInput.value = ''; }
  if (resultsEl) resultsEl.innerHTML = '';
  if (confirmBtn) confirmBtn.disabled = false;
}

function closeSharePresetsModal() {
  document.getElementById('sharePresetsModal')?.classList.remove('active');
  window._sharePresetIds = null;
  window._shareSelectedUser = null;
}

async function searchShareUsers(q) {
  if (!currentUser || !q || q.length < 2) return [];
  try {
    const r = await fetch(API_BASE + '/api/users/search?q=' + encodeURIComponent(q), { credentials: 'include' });
    if (r.ok) return await r.json();
  } catch (e) { console.warn(e); }
  return [];
}

function renderShareUserResults(users, selectedId) {
  const el = document.getElementById('shareUserResults');
  if (!el) return;
  if (users.length === 0) {
    el.innerHTML = '<p class="rhythm-empty">' + escapeHtml(t('noUsers')) + '</p>';
    return;
  }
  window._shareUserSearchResults = users;
  el.innerHTML = users.map((u, i) => {
    const label = (u.name && u.name !== u.email ? u.name + ' (' + u.email + ')' : u.email);
    const isSelected = selectedId === u.id;
    return `<div class="share-user-item ${isSelected ? 'selected' : ''}" data-i="${i}">${escapeHtml(label)}</div>`;
  }).join('');
  el.querySelectorAll('.share-user-item').forEach(div => {
    div.addEventListener('click', () => {
      el.querySelectorAll('.share-user-item').forEach(d => d.classList.remove('selected'));
      div.classList.add('selected');
      const u = window._shareUserSearchResults[parseInt(div.dataset.i, 10)];
      if (u) window._shareSelectedUser = { id: u.id, email: u.email, name: u.name };
      document.getElementById('shareConfirmBtn').disabled = false;
    });
  });
}

async function confirmSharePresets() {
  const ids = window._sharePresetIds;
  const mode = document.querySelector('input[name="shareMode"]:checked')?.value || 'all';
  if (!ids || ids.length === 0) return;
  if (mode === 'all') {
    const ok = await showConfirm(t('shareConfirmAll'), t('share'), t('cancel'), t('confirmShare'));
    if (!ok) return;
    try {
      let successCount = 0;
      for (const id of ids) {
        const r = await fetch(API_BASE + '/api/presets/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isPublic: true }),
        });
        if (r.ok) successCount++;
      }
      await showAlert(t('shareSuccessAll', { n: successCount }), t('shareSuccessTitle'));
      closeSharePresetsModal();
      const presets = await loadMyPresets();
      myPresetsCache = presets.map(p => ({
        id: p.id,
        name: p.name,
        bpm: p.bpm,
        timeSignature: p.timeSignature || '4/4',
        instruments: p.instruments || {},
        ownerEmail: p.ownerEmail,
        ownerName: p.ownerName,
        isOwner: p.isOwner,
        isFavourite: !!p.isFavourite,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
      const searchInput = document.getElementById('myPresetsSearch');
      renderMyPresetsList(myPresetsCache, searchInput ? searchInput.value : '', myPresetsSortOrder, myPresetsTab);
    } catch (e) {
      await showAlert(t('errorConnection') + ': ' + e.message, t('error'));
    }
  } else {
    const user = window._shareSelectedUser;
    if (!user) {
      await showAlert(t('shareSelectUserFirst'), t('share'));
      return;
    }
    const ok = await showConfirm(t('shareConfirmUser', { n: ids.length, name: user.name || user.email }), t('share'), t('cancel'), t('confirmShare'));
    if (!ok) return;
    try {
      const r = await fetch(API_BASE + '/api/presets/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ presetIds: ids, shareWithUserId: parseInt(user.id, 10) }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        await showAlert(t('shareSuccessUser', { n: data.sharedCount || ids.length }), t('shareSuccessTitle'));
        closeSharePresetsModal();
        const presets = await loadMyPresets();
        myPresetsCache = presets.map(p => ({
          id: p.id,
          name: p.name,
          bpm: p.bpm,
          timeSignature: p.timeSignature || '4/4',
          instruments: p.instruments || {},
          ownerEmail: p.ownerEmail,
          ownerName: p.ownerName,
          isOwner: p.isOwner,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));
        const searchInput = document.getElementById('myPresetsSearch');
        renderMyPresetsList(myPresetsCache, searchInput ? searchInput.value : '', myPresetsSortOrder, myPresetsTab);
      } else {
        await showAlert(t('error') + ': ' + (data.error || r.statusText), t('error'));
      }
    } catch (e) {
      await showAlert(t('errorConnection') + ': ' + e.message, t('error'));
    }
  }
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

async function openMyPresetsModal() {
  if (!currentUser) return;
  const modal = document.getElementById('myPresetsModal');
  const list = document.getElementById('myPresetsList');
  const searchInput = document.getElementById('myPresetsSearch');
  modal.classList.add('active');
  if (searchInput) searchInput.value = '';
  list.innerHTML = '<p class="rhythm-loading">' + t('loading') + '</p>';
  const presets = await loadMyPresets();
  myPresetsCache = presets.map(p => ({
    id: p.id,
    name: p.name,
    bpm: p.bpm,
    timeSignature: p.timeSignature || '4/4',
    instruments: p.instruments || {},
    ownerEmail: p.ownerEmail,
    ownerName: p.ownerName,
    isOwner: p.isOwner,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
  renderMyPresetsList(myPresetsCache, '', myPresetsSortOrder, myPresetsTab);
  if (searchInput) {
    searchInput.oninput = () => renderMyPresetsList(myPresetsCache, searchInput.value, myPresetsSortOrder, myPresetsTab);
  }
  const tabMine = document.getElementById('tabMine');
  const tabFavourite = document.getElementById('tabFavourite');
  const tabShared = document.getElementById('tabShared');
  const setActiveTab = (tab) => {
    myPresetsTab = tab;
    [tabMine, tabFavourite, tabShared].forEach((el, i) => {
      const t = ['mine', 'favourite', 'shared'][i];
      if (el) {
        el.classList.toggle('active', t === tab);
        el.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      }
    });
    renderMyPresetsList(myPresetsCache, searchInput ? searchInput.value : '', myPresetsSortOrder, myPresetsTab);
  };
  if (tabMine) tabMine.onclick = () => setActiveTab('mine');
  if (tabFavourite) tabFavourite.onclick = () => setActiveTab('favourite');
  if (tabShared) tabShared.onclick = () => setActiveTab('shared');
  document.querySelectorAll('#myPresetsSortIcons .sort-icon').forEach(btn => {
    btn.onclick = () => {
      myPresetsSortOrder = btn.dataset.order;
      document.querySelectorAll('#myPresetsSortIcons .sort-icon').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMyPresetsList(myPresetsCache, searchInput ? searchInput.value : '', myPresetsSortOrder, myPresetsTab);
    };
    if (btn.dataset.order === myPresetsSortOrder) btn.classList.add('active');
  });
}

function closeMyPresetsModal() {
  document.getElementById('myPresetsModal')?.classList.remove('active');
}

async function addMyPreset() {
  if (!currentUser) return;
  const name = await showPrompt('', t('newPreset'), t('addPreset'), t('presetName'));
  if (!name) return;
  const preset = buildPresetFromCurrent(name);
  try {
    const r = await fetch(API_BASE + '/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(preset),
    });
    if (r.ok) {
      const presets = await loadMyPresets();
      myPresetsCache = presets.map(p => ({
        id: p.id,
        name: p.name,
        bpm: p.bpm,
        timeSignature: p.timeSignature || '4/4',
        instruments: p.instruments || {},
        ownerEmail: p.ownerEmail,
        ownerName: p.ownerName,
        isOwner: p.isOwner,
        isFavourite: !!p.isFavourite,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
      const searchInput = document.getElementById('myPresetsSearch');
      renderMyPresetsList(myPresetsCache, searchInput ? searchInput.value : '', myPresetsSortOrder, myPresetsTab);
    } else {
      const err = await r.json().catch(() => ({}));
      await showAlert('Lỗi: ' + (err.error || r.statusText), 'Lỗi');
    }
  } catch (e) {
    await showAlert('Lỗi kết nối: ' + e.message, 'Lỗi');
  }
}

async function editMyPreset(id, oldName) {
  const ok = await showConfirm(t('editConfirm'), t('continue'), t('cancel'), t('editPreset'));
  if (!ok) return;
  const newName = await showPrompt(t('newName'), oldName, t('editPreset'));
  if (!newName) return;
  const preset = buildPresetFromCurrent(newName);
  try {
    const r = await fetch(API_BASE + '/api/presets/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(preset),
    });
    if (r.ok) {
      const presets = await loadMyPresets();
      myPresetsCache = presets.map(p => ({
        id: p.id,
        name: p.name,
        bpm: p.bpm,
        timeSignature: p.timeSignature || '4/4',
        instruments: p.instruments || {},
        ownerEmail: p.ownerEmail,
        ownerName: p.ownerName,
        isOwner: p.isOwner,
        isFavourite: !!p.isFavourite,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
      const searchInput = document.getElementById('myPresetsSearch');
      renderMyPresetsList(myPresetsCache, searchInput ? searchInput.value : '', myPresetsSortOrder, myPresetsTab);
    } else {
      const err = await r.json().catch(() => ({}));
      await showAlert('Lỗi: ' + (err.error || r.statusText), 'Lỗi');
    }
  } catch (e) {
    await showAlert('Lỗi kết nối: ' + e.message, 'Lỗi');
  }
}

async function deleteMyPreset(id, name) {
  const ok = await showConfirm(t('deleteConfirm', { name }), t('delete'), t('cancel'), t('deleteTitle'), true);
  if (!ok) return;
  try {
    const r = await fetch(API_BASE + '/api/presets/' + id, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (r.ok) {
      const presets = await loadMyPresets();
      myPresetsCache = presets.map(p => ({
        id: p.id,
        name: p.name,
        bpm: p.bpm,
        timeSignature: p.timeSignature || '4/4',
        instruments: p.instruments || {},
        ownerEmail: p.ownerEmail,
        ownerName: p.ownerName,
        isOwner: p.isOwner,
        isFavourite: !!p.isFavourite,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
      const searchInput = document.getElementById('myPresetsSearch');
      renderMyPresetsList(myPresetsCache, searchInput ? searchInput.value : '', myPresetsSortOrder, myPresetsTab);
    } else {
      const err = await r.json().catch(() => ({}));
      await showAlert('Lỗi: ' + (err.error || r.statusText), 'Lỗi');
    }
  } catch (e) {
    await showAlert('Lỗi kết nối: ' + e.message, 'Lỗi');
  }
}

function getFallbackPresets() {
  return [
    { name: 'Basic Rock', bpm: 90, timeSignature: '4/4', instruments: getBasicRockPattern() },
    { name: 'Funk', bpm: 90, timeSignature: '4/4', instruments: getFunkPattern() },
    { name: 'Hip Hop', bpm: 90, timeSignature: '4/4', instruments: getHipHopPattern() },
    { name: 'House', bpm: 120, timeSignature: '4/4', instruments: getHousePattern() },
    { name: 'Disco', bpm: 110, timeSignature: '4/4', instruments: getDiscoPattern() },
    { name: 'Open Hi-hat + Rimshot', bpm: 90, timeSignature: '4/4', instruments: getOpenHatRimshotPattern() },
    { name: 'Trống rỗng', bpm: 90, timeSignature: '4/4', instruments: getEmptyPattern() }
  ];
}

function applyPreset(preset) {
  pattern = yamlPresetToPattern(preset);
  if (preset.bpm) bpmInput.value = preset.bpm;
  if (preset.timeSignature && timeSignatureSelect && ['3/4', '4/4', '12/8'].includes(preset.timeSignature)) {
    timeSignatureSelect.value = preset.timeSignature;
  }
  updatePresetNameDisplay(preset.name);
  renderSequencer();
  updateUrl();
}

function updatePresetNameDisplay(name) {
  const el = document.getElementById('currentPresetName');
  if (el) el.textContent = name ? name : '';
}

function renderPresetList(presets, searchTerm = '') {
  const container = document.getElementById('rhythmPresets');
  const search = searchTerm.toLowerCase().trim();
  const filterPresets = (list) => search ? list.filter(p => p.name.toLowerCase().includes(search)) : list;

  const commonPresets = presets.filter(p => !p.isOwner);
  const commonFiltered = filterPresets(commonPresets);

  container.innerHTML = '';

  const renderGroup = (presetList, title) => {
    if (presetList.length === 0) return;
    if (title) {
      const heading = document.createElement('div');
      heading.className = 'rhythm-preset-group-title';
      heading.textContent = title;
      container.appendChild(heading);
    }
    presetList.forEach(preset => {
      const btn = document.createElement('button');
      btn.className = 'rhythm-preset';
      btn.textContent = preset.name;
      btn.addEventListener('click', () => {
        applyPreset(preset);
        closeRhythmModal();
        if (!isPlaying) startPlayback();
      });
      container.appendChild(btn);
    });
  };

  if (commonFiltered.length > 0) {
    renderGroup(commonFiltered, '');
  }
  if (commonFiltered.length === 0) {
    container.innerHTML = '<p class="rhythm-empty">' + escapeHtml(t('noRhythm')) + '</p>';
  }
}

async function openRhythm() {
  rhythmModal.classList.add('active');
  const searchInput = document.getElementById('rhythmSearch');
  if (searchInput) searchInput.value = '';
  const container = document.getElementById('rhythmPresets');
  container.innerHTML = '<p class="rhythm-loading">' + t('loading') + '</p>';
  let presets = await loadPresetsFromYaml();
  rhythmPresetsCache = presets;
  renderPresetList(presets);
  if (searchInput) {
    searchInput.oninput = () => renderPresetList(presets, searchInput.value);
  }
}

let rhythmPresetsCache = [];
let previewIntervalId = null;

function playPresetPreview(preset) {
  if (previewIntervalId) {
    clearInterval(previewIntervalId);
    previewIntervalId = null;
  }
  getAudioContext().resume();
  const previewPattern = yamlPresetToPattern(preset);
  const bpm = preset.bpm || getBpm();
  const previewSteps = 16;
  const interval = 60000 / bpm / 4;
  let step = 0;
  previewIntervalId = setInterval(() => {
    INSTRUMENTS.forEach(inst => {
      const val = previewPattern[inst.id] && previewPattern[inst.id][step];
      if (val) playDrum(inst.id, val);
    });
    step++;
    if (step >= previewSteps) {
      clearInterval(previewIntervalId);
      previewIntervalId = null;
    }
  }, interval);
}

function stopPresetPreview() {
  if (previewIntervalId) {
    clearInterval(previewIntervalId);
    previewIntervalId = null;
  }
}

function closeRhythmModal(stopPreview = true) {
  if (stopPreview) stopPresetPreview();
  rhythmModal.classList.remove('active');
}

async function saveCurrentRhythmAsYaml() {
  const name = await showPrompt(t('presetName') + ':', t('newPreset'), t('downloadTitle'));
  if (!name) return;
  const preset = {
    name,
    bpm: getBpm(),
    timeSignature: timeSignatureSelect ? timeSignatureSelect.value : '4/4',
    instruments: {}
  };
  INSTRUMENTS.forEach(inst => {
    const row = pattern[inst.id] || Array(STEPS).fill(0);
    preset.instruments[inst.id] = repeatPattern(row, STEPS);
  });
  const yaml = typeof jsyaml !== 'undefined'
    ? jsyaml.dump({ presets: [preset] }, { flowLevel: 4, lineWidth: -1 })
    : JSON.stringify(preset, null, 2);
  const blob = new Blob([yaml], { type: 'text/yaml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name.trim().toLowerCase().replace(/\s+/g, '-') + '.yaml';
  a.click();
  URL.revokeObjectURL(a.href);
}

// Init
async function init() {
  loadFromUrl();
  initPattern();
  renderSequencer();

  loadSamples(); // Load sample WAV nền (TR-909) để có tiếng trống chân thực hơn

  window.onLanguageChange = () => {
    renderSequencer();
    const list = document.getElementById('myPresetsList');
    if (list && myPresetsCache.length > 0) {
      renderMyPresetsList(myPresetsCache, document.getElementById('myPresetsSearch')?.value || '', myPresetsSortOrder, myPresetsTab);
    }
  };

  await loadUser();
  updateAuthUI();

  document.getElementById('loginBtn')?.addEventListener('click', () => {
    window.location.href = API_BASE + '/api/auth/google';
  });
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await fetch(API_BASE + '/api/auth/logout', { method: 'POST', credentials: 'include' });
    currentUser = null;
    updateAuthUI();
  });
  document.getElementById('myPresetsBtn')?.addEventListener('click', openMyPresetsModal);
  document.getElementById('addMyPresetBtn')?.addEventListener('click', addMyPreset);
  document.getElementById('sharePresetsBtn')?.addEventListener('click', openSharePresetsModal);
  document.getElementById('closeMyPresets')?.addEventListener('click', closeMyPresetsModal);
  document.getElementById('shareCancelBtn')?.addEventListener('click', closeSharePresetsModal);
  document.getElementById('shareConfirmBtn')?.addEventListener('click', confirmSharePresets);

  document.querySelectorAll('input[name="shareMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const userSection = document.getElementById('shareUserSection');
      const confirmBtn = document.getElementById('shareConfirmBtn');
      if (radio.value === 'all') {
        userSection?.classList.add('hidden');
        if (confirmBtn) confirmBtn.disabled = false;
      } else {
        userSection?.classList.remove('hidden');
        if (confirmBtn) confirmBtn.disabled = !window._shareSelectedUser;
      }
    });
  });

  let shareSearchTimeout;
  document.getElementById('shareUserSearch')?.addEventListener('input', (e) => {
    clearTimeout(shareSearchTimeout);
    const q = (e.target.value || '').trim();
    if (q.length < 2) {
      renderShareUserResults([], null);
      document.getElementById('shareUserResults').innerHTML = '<p class="rhythm-empty">' + escapeHtml(t('typeToSearch')) + '</p>';
      return;
    }
    shareSearchTimeout = setTimeout(async () => {
      const users = await searchShareUsers(q);
      renderShareUserResults(users, window._shareSelectedUser?.id);
    }, 300);
  });

  // myPresetsModal: chỉ đóng khi click nút Đóng/Thêm

  playBtn.addEventListener('click', togglePlayback);
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (document.querySelector('.modal.active')) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      togglePlayback();
    }
  });
  clearBtn.addEventListener('click', clearPattern);
  copyUrlBtn.addEventListener('click', copyUrlToClipboard);
  rhythmBtn.addEventListener('click', openRhythm);
  closeRhythm.addEventListener('click', closeRhythmModal);
  const saveRhythmBtn = document.getElementById('saveRhythmBtn');
  if (saveRhythmBtn) saveRhythmBtn.addEventListener('click', saveCurrentRhythmAsYaml);

  if (timeSignatureSelect) {
    timeSignatureSelect.addEventListener('change', () => {
      if (isPlaying) stopPlayback();
      renderSequencer();
      updateUrl();
    });
  }

  bpmInput.addEventListener('change', updateUrl);

  // rhythmModal: chỉ đóng khi click nút Đóng hoặc chọn điệu

  if (!window.location.search.includes('data=')) {
    pattern = getBasicRockPattern();
    renderSequencer();
    updateUrl();
  }
}

init();
