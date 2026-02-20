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
let instrumentVolumes = {}; // instrumentId -> 0..1, default 1
let audioContext = null;
let masterGainNode = null;
let chainPresets = []; // [{ preset, measures }] for pattern chaining
let chainMeasuresPerPreset = 4;

const VOLUME_STORAGE = 'drum-instrument-volumes';
const MASTER_VOLUME_STORAGE = 'drum-master-volume';
const ACCENT_STORAGE = 'drum-accent-level';
const SWING_STORAGE = 'drum-swing';
const CHAIN_STORAGE = 'drum-chain';

function getInstrumentVolume(instrumentId) {
  if (instrumentVolumes[instrumentId] !== undefined) return instrumentVolumes[instrumentId];
  return 1;
}

function setInstrumentVolume(instrumentId, vol) {
  instrumentVolumes[instrumentId] = Math.max(0, Math.min(1, vol));
  try { localStorage.setItem(VOLUME_STORAGE, JSON.stringify(instrumentVolumes)); } catch (_) {}
}

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
const ICON_LIKE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>';

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
  const stepsCount = getStepsCount();
  INSTRUMENTS.forEach(inst => {
    p[inst.id] = Array(stepsCount).fill(0);
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

// Per-step tuplet: step can be number (0,1,2,3) or { tuplet: 2|3|4|5|6, hits: number[] }
const TUPLET_OPTIONS = [2, 3, 4, 5, 6];

function getStepData(row, stepIndex) {
  if (!row || stepIndex >= (row.length || 0)) return { value: 0, isTuplet: false };
  const v = row[stepIndex];
  if (typeof v === 'object' && v !== null && 'tuplet' in v && Array.isArray(v.hits)) {
    const n = TUPLET_OPTIONS.includes(v.tuplet) ? v.tuplet : 2;
    return { value: 0, isTuplet: true, tuplet: n, hits: v.hits.slice(0, n) };
  }
  const n = typeof v === 'number' ? v : 0;
  return { value: n, isTuplet: false };
}

function setStepTuplet(instrumentId, stepIndex, tuplet, hits) {
  if (!pattern[instrumentId]) pattern[instrumentId] = Array(getStepsCount()).fill(0);
  if (stepIndex >= getStepsCount()) return;
  const n = Math.min(Math.max(2, tuplet || 2), 6);
  pattern[instrumentId][stepIndex] = { tuplet: n, hits: Array.isArray(hits) ? hits.slice(0, n) : Array(n).fill(0) };
}

function clearStepTuplet(instrumentId, stepIndex) {
  if (!pattern[instrumentId]) return;
  const v = pattern[instrumentId][stepIndex];
  if (typeof v === 'object' && v !== null && 'tuplet' in v) {
    const firstHit = (v.hits && v.hits[0]) || 0;
    pattern[instrumentId][stepIndex] = firstHit;
  }
}

// Initialize pattern from empty or URL
function initPattern() {
  const stepsCount = getStepsCount();
  INSTRUMENTS.forEach(inst => {
    if (!pattern[inst.id]) {
      pattern[inst.id] = Array(stepsCount).fill(0);
    } else if (pattern[inst.id].length !== stepsCount) {
      const row = pattern[inst.id];
      const newRow = Array(stepsCount).fill(0);
      for (let i = 0; i < Math.min(row.length, stepsCount); i++) newRow[i] = row[i];
      pattern[inst.id] = newRow;
    }
  });
}

// Sample - local audio/{folder}/ (Pearl Master Studio CC BY 3.0 + TR-505 cowbell)
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
  cowbell: 'cowbell.wav'
};
let sampleBuffers = {};
let currentSoundSet = 'standard';
const SOUND_SET_STORAGE = 'drum-sound-set';

async function loadSamples(folder) {
  folder = folder || currentSoundSet;
  const ctx = getAudioContext();
  const base = 'audio/' + folder + '/';
  sampleBuffers = {};
  const tasks = [];
  for (const key of Object.keys(SAMPLE_KEYS)) {
    const file = SAMPLE_KEYS[key];
    if (!file) continue;
    const url = base + file;
    tasks.push((async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const arrayBuffer = await res.arrayBuffer();
        sampleBuffers[key] = await ctx.decodeAudioData(arrayBuffer);
      } catch (e) {
        console.warn('Sample load failed:', key, e.message);
      }
    })());
  }
  try {
    await Promise.all(tasks);
  } catch (e) {
    console.warn('Drum samples load failed, using synthesis:', e.message);
  }
}

async function loadSoundSets() {
  try {
    const r = await fetch(API_BASE + '/api/audio/sets', { credentials: 'include' });
    if (r.ok) {
      const sets = await r.json();
      if (Array.isArray(sets) && sets.length > 0) return sets;
    }
  } catch (e) {}
  try {
    const r = await fetch('audio/sets.json');
    if (r.ok) {
      const data = await r.json();
      return Array.isArray(data) ? data : ['standard'];
    }
  } catch (e) {}
  return ['standard'];
}

const HIHAT_GAIN = 0.55;   // Hi-hat nhẹ hơn (0–1)
const CYMBAL_GAIN = 0.5;  // Cymbal nhẹ hơn (0–1)

function playSampleBuffer(key, gain = 1) {
  const buf = sampleBuffers[key];
  if (!buf) return false;
  const ctx = getAudioContext();
  const dest = masterGainNode || ctx.destination;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  let g = gain;
  if (key === 'hihatClosed' || key === 'hihatOpen') g = HIHAT_GAIN * gain;
  else if (key === 'cymbal') g = CYMBAL_GAIN * gain;
  if (g < 1) {
    const gainNode = ctx.createGain();
    gainNode.gain.value = g;
    src.connect(gainNode);
    gainNode.connect(dest);
  } else {
    src.connect(dest);
  }
  src.start(0);
  return true;
}

// Web Audio API - drum kit synthesis (fallback when samples unavailable)
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode = audioContext.createGain();
    masterGainNode.connect(audioContext.destination);
    const stored = localStorage.getItem(MASTER_VOLUME_STORAGE);
    masterGainNode.gain.value = stored !== null ? parseInt(stored, 10) / 100 : 1;
  }
  return audioContext;
}

function getMasterVolume() {
  const el = document.getElementById('masterVolume');
  return el ? parseInt(el.value, 10) / 100 : 1;
}

function setMasterVolume(val) {
  if (masterGainNode) masterGainNode.gain.value = Math.max(0, Math.min(1, val));
}

function getAccentLevel() {
  const el = document.getElementById('accentLevel');
  return el ? parseInt(el.value, 10) / 100 : 1;
}

function getSwingAmount() {
  const el = document.getElementById('swingAmount');
  return el ? parseInt(el.value, 10) / 100 : 0;
}

function getAudioDestination() {
  getAudioContext();
  return masterGainNode || audioContext.destination;
}

function playKick(vol = 1) {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getAudioDestination());
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(52, t + 0.012);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
  osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.22);
  gain.gain.setValueAtTime(1 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.5 * vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
  osc.start(t);
  osc.stop(t + 0.22);
}

function playSnare(vol = 1) {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  // Body - thân trống
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(getAudioDestination());
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(95, t + 0.025);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);
  oscGain.gain.setValueAtTime(0.55 * vol, t);
  oscGain.gain.exponentialRampToValueAtTime(0.15 * vol, t + 0.04);
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
  noiseGain.connect(getAudioDestination());
  noiseGain.gain.setValueAtTime(0.5 * vol, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
  noise.start(t);
  noise.stop(t + 0.08);
}

function playSnareRimshot(vol = 1) {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getAudioDestination());
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.02);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.5 * vol, t);
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
  noiseGain.connect(getAudioDestination());
  noiseGain.gain.setValueAtTime(0.35 * vol, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.02);
  noise.start(t);
  noise.stop(t + 0.025);
}

function playHiHat(closed = true, vol = 1) {
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
  gain.connect(getAudioDestination());
  gain.gain.setValueAtTime((closed ? 0.14 : 0.12) * vol, t);  // Nhẹ hơn
  gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
  noise.start(t);
  noise.stop(t + dur);
}

function playTom(freq, vol = 1) {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getAudioDestination());
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 1.15, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.015);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.12);
  gain.gain.setValueAtTime(0.6 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.2 * vol, t + 0.03);
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
  gain.connect(getAudioDestination());
  osc.frequency.setValueAtTime(accent ? 1000 : 800, t);
  osc.type = 'sine';
  gain.gain.setValueAtTime(accent ? 0.15 : 0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
  osc.start(t);
  osc.stop(t + 0.03);
}

function playCowbell(vol = 1) {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(getAudioDestination());
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1050, t);
  osc.frequency.exponentialRampToValueAtTime(650, t + 0.025);
  gain.gain.setValueAtTime(0.35 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  osc.start(t);
  osc.stop(t + 0.1);
}

function playCymbal(vol = 1) {
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
  gain.connect(getAudioDestination());
  gain.gain.setValueAtTime(0.14 * vol, t);  // Nhẹ hơn
  gain.gain.exponentialRampToValueAtTime(0.04 * vol, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
  noise.start(t);
  noise.stop(t + 0.35);
}

function playRide(vol = 1) {
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
  gain.connect(getAudioDestination());
  gain.gain.setValueAtTime(0.22 * vol, t);
  gain.gain.exponentialRampToValueAtTime(0.06 * vol, t + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
  noise.start(t);
  noise.stop(t + 0.25);
}

function playDrum(instrumentId, value = 1, velocityMultiplier = 1) {
  if (mutedInstruments.has(instrumentId)) return;
  let vol = getInstrumentVolume(instrumentId) * velocityMultiplier;
  if (vol <= 0) return;
  // Ghost note: value 3 = soft hit (velocity 0.4)
  if (value === 3) vol *= 0.4;
  // Ưu tiên sample WAV nếu đã load
  const useSample = (key) => playSampleBuffer(key, vol);
  switch (instrumentId) {
    case 'kick':
      if (!useSample('kick')) playKick(vol);
      break;
    case 'snare':
      if (value === 2) return useSample('snareRimshot') || playSnareRimshot(vol);
      if (!useSample('snare')) playSnare(vol);
      break;
    case 'hihat':
    case 'hihatPedal':
      if (!useSample(value === 2 ? 'hihatOpen' : 'hihatClosed')) playHiHat(value !== 2, vol);
      break;
    case 'tom':
      if (value === 2) return useSample('tomLow') || playTom(95, vol);
      if (!useSample('tomHigh')) playTom(165, vol);
      break;
    case 'floorTom':
      if (!useSample('tomLow')) playTom(95, vol);
      break;
    case 'cymbal':
      if (!useSample('cymbal')) playCymbal(vol);
      break;
    case 'ride':
      if (!useSample('ride')) playRide(vol);
      break;
    case 'cowbell':
      if (!useSample('cowbell')) playCowbell(vol);
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
    const volWrap = document.createElement('div');
    volWrap.className = 'instrument-volume-wrap';
    const volInput = document.createElement('input');
    volInput.type = 'range';
    volInput.className = 'instrument-volume';
    volInput.min = '0';
    volInput.max = '100';
    volInput.value = Math.round(getInstrumentVolume(inst.id) * 100);
    volInput.dataset.instrument = inst.id;
    volInput.title = t('volume') + ': ' + volInput.value + '%';
    volInput.addEventListener('input', () => {
      const v = parseInt(volInput.value) / 100;
      setInstrumentVolume(inst.id, v);
      volInput.title = t('volume') + ': ' + volInput.value + '%';
    });
    volWrap.appendChild(volInput);
    const stepsEl = document.createElement('div');
    stepsEl.className = 'steps steps-' + stepsCount;
    for (let i = 0; i < stepsCount; i++) {
      const step = document.createElement('button');
      const stepData = getStepData(pattern[inst.id], i);
      const val = stepData.isTuplet ? (stepData.hits && stepData.hits.some(h => h)) : stepData.value;
      const isDownbeat = i % subdivisions === 0;
      const isTuplet = stepData.isTuplet;
      step.className = 'step' + (isDownbeat ? ' downbeat' : '') + (val ? ' active' : '') +
        (!isTuplet && stepData.value === 2 ? ' variant' : '') + (!isTuplet && stepData.value === 3 ? ' ghost' : '') +
        (isTuplet ? ' step-tuplet' : '');
      step.dataset.instrument = inst.id;
      step.dataset.step = i;
      step.setAttribute('type', 'button');
      step.title = isTuplet ? t('tupletStep', { n: stepData.tuplet }) :
        (inst.id === 'hihat' || inst.id === 'hihatPedal') && stepData.value === 2 ? t('hihatOpen') :
        (inst.id === 'hihat' || inst.id === 'hihatPedal') && stepData.value === 3 ? t('ghostNote') :
        inst.id === 'snare' && stepData.value === 2 ? t('snareRimshot') :
        inst.id === 'snare' && stepData.value === 3 ? t('ghostNote') :
        inst.id === 'tom' && stepData.value === 2 ? t('tomLow') : '';
      if (isTuplet) {
        const badge = document.createElement('span');
        badge.className = 'step-tuplet-badge';
        badge.textContent = String(stepData.tuplet);
        step.appendChild(badge);
      }
      step.addEventListener('click', (e) => { e.preventDefault(); if (isTuplet) openTupletPopover(inst.id, i, step); else toggleStep(inst.id, i); });
      step.addEventListener('contextmenu', (e) => { e.preventDefault(); openTupletPopover(inst.id, i, step); });
      stepsEl.appendChild(step);
    }
    row.appendChild(nameEl);
    row.appendChild(volWrap);
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
    const startCol = m * colsPerMeasure + 1;
    span.style.gridColumn = startCol;
    header.appendChild(span);
  }
}

function toggleStep(instrumentId, stepIndex) {
  const stepsCount = getStepsCount();
  if (!pattern[instrumentId]) pattern[instrumentId] = Array(stepsCount).fill(0);
  if (stepIndex >= stepsCount) return;
  const v = pattern[instrumentId][stepIndex];
  if (typeof v === 'object' && v !== null && 'tuplet' in v) return;
  const hasVariant = instrumentId === 'hihat' || instrumentId === 'hihatPedal' || instrumentId === 'snare' || instrumentId === 'tom';
  const hasGhost = instrumentId === 'hihat' || instrumentId === 'hihatPedal' || instrumentId === 'snare';
  const current = typeof v === 'number' ? v : 0;
  if (hasVariant) {
    if (hasGhost) {
      pattern[instrumentId][stepIndex] = current === 0 ? 1 : current === 1 ? 2 : current === 2 ? 3 : 0;
    } else {
      pattern[instrumentId][stepIndex] = current === 0 ? 1 : current === 1 ? 2 : 0;
    }
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

function openTupletPopover(instrumentId, stepIndex, anchorEl) {
  const popover = document.getElementById('tupletPopover');
  const hitsRow = document.getElementById('tupletHitsRow');
  const hitsContainer = document.getElementById('tupletHits');
  const applyBtn = document.getElementById('tupletApply');
  const clearBtn = document.getElementById('tupletClear');
  if (!popover || !hitsRow || !hitsContainer) return;

  const stepData = getStepData(pattern[instrumentId], stepIndex);
  const stepsCount = getStepsCount();
  if (!pattern[instrumentId]) pattern[instrumentId] = Array(stepsCount).fill(0);

  popover.dataset.instrument = instrumentId;
  popover.dataset.step = String(stepIndex);

  const typeRadios = popover.querySelectorAll('input[name="tupletType"]');
  if (stepData.isTuplet) {
    typeRadios.forEach(r => { r.checked = (r.value === String(stepData.tuplet)); });
    hitsRow.classList.remove('hidden');
    renderTupletHits(stepData.tuplet, stepData.hits || [], hitsContainer, instrumentId);
  } else {
    typeRadios.forEach(r => { r.checked = (r.value === '0'); });
    hitsRow.classList.add('hidden');
  }

  typeRadios.forEach(r => {
    r.onchange = () => {
      const n = parseInt(r.value, 10);
      if (n > 0) {
        hitsRow.classList.remove('hidden');
        renderTupletHits(n, Array(n).fill(0), hitsContainer, instrumentId);
      } else {
        hitsRow.classList.add('hidden');
      }
    };
  });

  const rect = anchorEl.getBoundingClientRect();
  popover.classList.add('active');
  popover.style.left = rect.left + 'px';
  let top = rect.top - popover.offsetHeight - 4;
  if (top < 8) top = rect.bottom + 4;
  popover.style.top = top + 'px';
  popover.setAttribute('aria-hidden', 'false');

  const closePopover = () => {
    popover.classList.remove('active');
    popover.setAttribute('aria-hidden', 'true');
  };

  const onApply = () => {
    const checked = popover.querySelector('input[name="tupletType"]:checked');
    const n = parseInt(checked ? checked.value : '0', 10);
    if (n > 0) {
      const hits = hitsContainer._tupletState || Array.from(hitsContainer.querySelectorAll('.tuplet-hit')).map(el => el.classList.contains('active') ? 1 : 0);
      setStepTuplet(instrumentId, stepIndex, n, hits);
    } else {
      clearStepTuplet(instrumentId, stepIndex);
    }
    updateStepUI(instrumentId, stepIndex);
    updateUrl();
    renderSequencer();
    closePopover();
  };

  const onClear = () => {
    clearStepTuplet(instrumentId, stepIndex);
    updateStepUI(instrumentId, stepIndex);
    updateUrl();
    renderSequencer();
    closePopover();
  };

  applyBtn.onclick = onApply;
  clearBtn.onclick = onClear;

  const clickOutside = (e) => {
    if (!popover.contains(e.target) && !anchorEl.contains(e.target)) {
      closePopover();
      document.removeEventListener('click', clickOutside);
    }
  };
  setTimeout(() => document.addEventListener('click', clickOutside), 0);
}

function renderTupletHits(n, hits, container, instrumentId) {
  container.innerHTML = '';
  const hasVariant = instrumentId === 'hihat' || instrumentId === 'hihatPedal' || instrumentId === 'snare' || instrumentId === 'tom';
  const state = (hits || []).slice(0, n);
  while (state.length < n) state.push(0);
  for (let i = 0; i < n; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tuplet-hit' + (state[i] ? ' active' : '') + (state[i] === 2 ? ' variant' : '') + (state[i] === 3 ? ' ghost' : '');
    btn.textContent = i + 1;
    btn.dataset.index = i;
    btn.addEventListener('click', () => {
      const val = state[i] || 0;
      if (hasVariant) {
        state[i] = val === 0 ? 1 : val === 1 ? 2 : val === 2 ? 3 : 0;
      } else {
        state[i] = val ? 0 : 1;
      }
      btn.classList.toggle('active', !!state[i]);
      btn.classList.toggle('variant', state[i] === 2);
      btn.classList.toggle('ghost', state[i] === 3);
    });
    container.appendChild(btn);
  }
  container._tupletState = state;
}

function updateStepUI(instrumentId, stepIndex) {
  const step = document.querySelector(`.step[data-instrument="${instrumentId}"][data-step="${stepIndex}"]`);
  if (!step) return;
  const stepData = getStepData(pattern[instrumentId], stepIndex);
  const val = stepData.isTuplet ? (stepData.hits && stepData.hits.some(h => h)) : stepData.value;
  step.classList.toggle('active', !!val);
  step.classList.toggle('variant', !stepData.isTuplet && stepData.value === 2);
  step.classList.toggle('ghost', !stepData.isTuplet && stepData.value === 3);
  step.classList.toggle('step-tuplet', stepData.isTuplet);
  step.title = stepData.isTuplet ? t('tupletStep', { n: stepData.tuplet }) :
    (instrumentId === 'hihat' || instrumentId === 'hihatPedal') && stepData.value === 2 ? t('hihatOpen') :
    (instrumentId === 'hihat' || instrumentId === 'hihatPedal' || instrumentId === 'snare') && stepData.value === 3 ? t('ghostNote') :
    instrumentId === 'snare' && stepData.value === 2 ? t('snareRimshot') :
    instrumentId === 'tom' && stepData.value === 2 ? t('tomLow') : '';
  if (stepData.isTuplet) {
    let badge = step.querySelector('.step-tuplet-badge');
    if (!badge) { badge = document.createElement('span'); badge.className = 'step-tuplet-badge'; step.insertBefore(badge, step.firstChild); }
    badge.textContent = stepData.tuplet;
  } else {
    const badge = step.querySelector('.step-tuplet-badge');
    if (badge) badge.remove();
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
let chainPlaybackIndex = 0;
let chainPlaybackMeasureCount = 0;

function getBpm() {
  return Math.max(40, Math.min(240, parseInt(bpmInput.value) || DEFAULT_BPM));
}

function getPlaybackPattern() {
  if (chainPresets.length > 0 && isPlaying) {
    const p = chainPresets[chainPlaybackIndex];
    return p ? yamlPresetToPattern(p.preset) : pattern;
  }
  return pattern;
}

function getSwingDeltaForNextStep(nextStep) {
  const swing = getSwingAmount();
  if (swing <= 0) return 0;
  const baseInterval = 60000 / getBpm() / 4;
  const swingAmount = baseInterval * swing * 0.25;
  return (nextStep % 2 === 1) ? swingAmount : -swingAmount;
}

function startPlayback() {
  if (isPlaying) return;
  getAudioContext().resume();
  isPlaying = true;
  playBtn.classList.add('playing');
  playBtn.querySelector('.play-icon').textContent = '■';
  chainPlaybackIndex = 0;
  chainPlaybackMeasureCount = 0;
  if (chainPresets.length > 0) {
    const p = chainPresets[0].preset;
    pattern = yamlPresetToPattern(p);
    if (p.bpm) bpmInput.value = p.bpm;
    if (p.timeSignature && timeSignatureSelect && ['3/4', '4/4', '12/8'].includes(p.timeSignature)) {
      timeSignatureSelect.value = p.timeSignature;
    }
    renderSequencer();
    updatePresetNameDisplay(p.name + ' (1/' + chainPresets.length + ')');
  }
  const baseInterval = 60000 / getBpm() / 4;
  currentStep = 0;
  updateCurrentStepUI();
  const stepsCount = getStepsCount();
  const subdivisions = getSubdivisionsPerMeasure();

  function tick() {
    const playbackPattern = getPlaybackPattern();
    if (metronomeCheck && metronomeCheck.checked) {
      const isQuarterBeat = currentStep % subdivisions === 0;
      if (isQuarterBeat) {
        playMetronomeClick(currentStep === 0);
      }
    }
    const accent = getAccentLevel();
    const velocityMult = (currentStep % subdivisions === 0 && currentStep < subdivisions) ? (0.5 + 0.5 * accent) : 1;
    INSTRUMENTS.forEach(inst => {
      const row = playbackPattern[inst.id];
      const stepData = getStepData(row, currentStep);
      if (stepData.isTuplet) {
        const stepDuration = baseInterval;
        stepData.hits.forEach((hitVal, i) => {
          if (hitVal) {
            const delay = (i / stepData.tuplet) * stepDuration;
            setTimeout(() => playDrum(inst.id, hitVal, velocityMult), delay);
          }
        });
      } else if (stepData.value) {
        playDrum(inst.id, stepData.value, velocityMult);
      }
    });
    currentStep++;
    if (currentStep >= stepsCount) {
      currentStep = 0;
      chainPlaybackMeasureCount++;
      if (chainPresets.length > 0) {
        const measuresForCurrent = chainPresets[chainPlaybackIndex].measures || chainMeasuresPerPreset;
        if (chainPlaybackMeasureCount >= measuresForCurrent) {
          chainPlaybackMeasureCount = 0;
          chainPlaybackIndex = (chainPlaybackIndex + 1) % chainPresets.length;
          const p = chainPresets[chainPlaybackIndex].preset;
          pattern = yamlPresetToPattern(p);
          if (p.bpm) bpmInput.value = p.bpm;
          if (p.timeSignature && timeSignatureSelect && ['3/4', '4/4', '12/8'].includes(p.timeSignature)) {
            timeSignatureSelect.value = p.timeSignature;
          }
          renderSequencer();
          updatePresetNameDisplay(p.name + ' (' + (chainPlaybackIndex + 1) + '/' + chainPresets.length + ')');
        }
      }
    }
    updateCurrentStepUI();
    const nextStep = currentStep >= stepsCount ? 0 : currentStep;
    const swingDelta = getSwingDeltaForNextStep(nextStep);
    intervalId = setTimeout(tick, Math.max(10, baseInterval + swingDelta));
  }

  intervalId = setTimeout(tick, baseInterval);
}

function stopPlayback() {
  if (!isPlaying) return;
  isPlaying = false;
  playBtn.classList.remove('playing');
  playBtn.querySelector('.play-icon').textContent = '▶';
  if (intervalId) {
    clearTimeout(intervalId);
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
  const stepsCount = getStepsCount();
  INSTRUMENTS.forEach(inst => {
    pattern[inst.id] = Array(stepsCount).fill(0);
  });
  updatePresetNameDisplay('');
  renderSequencer();
  updateUrl();
}

// URL encode/decode for saving (supports per-step tuplet)
function encodeStep(stepVal) {
  if (typeof stepVal === 'object' && stepVal !== null && 'tuplet' in stepVal && Array.isArray(stepVal.hits)) {
    const n = TUPLET_OPTIONS.includes(stepVal.tuplet) ? stepVal.tuplet : 2;
    return 't' + n + ':' + (stepVal.hits || []).slice(0, n).map(v => Math.min(3, Math.max(0, v || 0))).join('');
  }
  const n = typeof stepVal === 'number' ? stepVal : 0;
  return String(Math.min(3, Math.max(0, n)));
}

function decodeStep(str) {
  if (str && str.startsWith('t') && str.includes(':')) {
    const m = str.match(/^t([2-6]):([0-3]*)$/);
    if (m) {
      const n = Math.min(6, Math.max(2, parseInt(m[1], 10)));
      const hits = (m[2] || '').split('').slice(0, n).map(c => Math.min(3, Math.max(0, parseInt(c, 10) || 0)));
      while (hits.length < n) hits.push(0);
      return { tuplet: n, hits };
    }
  }
  const n = parseInt(str, 10);
  return isNaN(n) ? 0 : Math.min(3, Math.max(0, n));
}

function encodeRow(row, stepsCount) {
  const steps = [];
  let hasTuplet = false;
  for (let i = 0; i < stepsCount; i++) {
    const s = encodeStep((row || [])[i]);
    if (s.startsWith('t')) hasTuplet = true;
    steps.push(s);
  }
  return hasTuplet ? steps.join('|') : steps.join('');
}

function decodeRow(str, stepsCount) {
  const parts = String(str || '').split('|');
  if (parts.length === 1 && parts[0].length >= stepsCount && !parts[0].includes('t')) {
    return parts[0].split('').slice(0, stepsCount).map(c => decodeStep(c));
  }
  const result = [];
  for (let i = 0; i < stepsCount; i++) {
    result.push(decodeStep(parts[i] || '0'));
  }
  return result;
}

function encodePattern() {
  const bpm = getBpm();
  const ts = timeSignatureSelect ? timeSignatureSelect.value : '4/4';
  const stepsCount = getStepsCount();
  const parts = [bpm, ts];
  let hasTuplet = false;
  INSTRUMENTS.forEach(inst => {
    const row = pattern[inst.id] || Array(stepsCount).fill(0);
    const encoded = encodeRow(row, stepsCount);
    if (encoded.includes('t')) hasTuplet = true;
    parts.push(encoded);
  });
  if (hasTuplet) parts.unshift(2);
  return btoa(encodeURIComponent(JSON.stringify(parts)));
}

function decodePattern(encoded) {
  try {
    const decoded = decodeURIComponent(atob(encoded));
    const parts = JSON.parse(decoded);
    if (!Array.isArray(parts) || parts.length < 1) return false;
    let idx = 0;
    if (parts[0] === 2) idx = 1;
    const bpm = parseInt(parts[idx] || 0) || DEFAULT_BPM;
    bpmInput.value = bpm;
    idx++;
    if (parts.length > idx && ['3/4', '4/4', '12/8'].includes(parts[idx]) && timeSignatureSelect) {
      timeSignatureSelect.value = parts[idx];
      idx++;
    }
    const stepsCount = getStepsCount();
    for (let i = idx; i < parts.length && i - idx < INSTRUMENTS.length; i++) {
      const inst = INSTRUMENTS[i - idx];
      pattern[inst.id] = decodeRow(String(parts[i] || ''), stepsCount);
    }
    return true;
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
  const stepsCount = getStepsCount();
  INSTRUMENTS.forEach(i => {
    const raw = inst[i.id];
    if (!raw) return;
    if (Array.isArray(raw)) {
      p[i.id] = repeatPattern(raw, stepsCount);
    } else {
      const str = String(raw).padEnd(stepsCount, '0').slice(0, stepsCount);
      p[i.id] = decodeRow(str, stepsCount);
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
    soundSet: currentSoundSet || 'standard',
    volumes: { ...instrumentVolumes },
  };
  const stepsCount = getStepsCount();
  INSTRUMENTS.forEach(inst => {
    const row = pattern[inst.id] || Array(stepsCount).fill(0);
    preset.instruments[inst.id] = encodeRow(repeatPattern(row, stepsCount), stepsCount);
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
    <span class="my-preset-col-like" title="${escapeHtml(t('like'))}">${ICON_LIKE}</span>
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
    const likeCount = p.likeCount ?? 0;
    const isLiked = !!p.isLiked;
    const likeTitle = isLiked ? t('unlike') : t('like');
    const likeClass = 'btn-like' + (isLiked ? ' active' : '');
    item.innerHTML = `
      <span class="my-preset-col-check">
        ${canShare ? `<input type="checkbox" class="my-preset-checkbox" data-id="${p.id}">` : '<span class="my-preset-checkbox-placeholder"></span>'}
      </span>
      <div class="my-preset-info my-preset-col-name">
        <span class="my-preset-name" data-id="${p.id}">${escapeHtml(p.name)}</span>
        <span class="my-preset-meta">${escapeHtml(userDisplay)}${dateStr ? ' · ' + escapeHtml(dateStr) : ''}</span>
      </div>
      <div class="my-preset-col-like">
        <button type="button" class="${likeClass}" data-id="${p.id}" title="${escapeHtml(likeTitle)}" aria-label="${escapeHtml(likeTitle)}">${ICON_LIKE}</button>
        <span class="btn-like-count">${likeCount}</span>
      </div>
      <div class="my-preset-actions my-preset-col-actions">
        <button class="btn btn-icon ${starClass}" data-id="${p.id}" title="${escapeHtml(starTitle)}" aria-label="${escapeHtml(starTitle)}">⭐</button>
        <button class="btn btn-icon btn-play" data-id="${p.id}" title="${escapeHtml(t('openPlay'))}">${ICON_PLAY}</button>
        ${p.isOwner ? `<button class="btn btn-icon btn-edit" data-id="${p.id}" title="${escapeHtml(t('edit'))}">${ICON_EDIT}</button><button class="btn btn-icon btn-danger" data-id="${p.id}" title="${escapeHtml(t('delete'))}">${ICON_DELETE}</button>` : ''}
      </div>
    `;
    item.querySelector('.my-preset-name').addEventListener('click', async () => {
      await applyPreset(p);
      closeMyPresetsModal();
      if (isPlaying) stopPlayback();
      startPlayback();
    });
    const favBtn = item.querySelector('.btn-favourite');
    if (favBtn) favBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavourite(p.id); });
    const likeBtn = item.querySelector('.btn-like');
    if (likeBtn) likeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleLike(p.id); });
    item.querySelector('.btn-play').addEventListener('click', async (e) => {
      e.stopPropagation();
      await applyPreset(p);
      closeMyPresetsModal();
      if (isPlaying) stopPlayback();
      startPlayback();
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

async function toggleLike(presetId) {
  try {
    const r = await fetch(API_BASE + '/api/presets/' + presetId + '/like', {
      method: 'POST',
      credentials: 'include',
    });
    if (!r.ok) return;
    const data = await r.json();
    const p = myPresetsCache.find(x => x.id === presetId);
    if (p) {
      p.isLiked = data.isLiked;
      p.likeCount = data.likeCount ?? p.likeCount;
    }
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
        soundSet: p.soundSet,
        volumes: p.volumes || {},
        ownerEmail: p.ownerEmail,
        ownerName: p.ownerName,
        isOwner: p.isOwner,
        isFavourite: !!p.isFavourite,
        likeCount: p.likeCount ?? 0,
        isLiked: !!p.isLiked,
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
          soundSet: p.soundSet,
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
    soundSet: p.soundSet,
    volumes: p.volumes || {},
    ownerEmail: p.ownerEmail,
    ownerName: p.ownerName,
    isOwner: p.isOwner,
    isFavourite: !!p.isFavourite,
    likeCount: p.likeCount ?? 0,
    isLiked: !!p.isLiked,
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
    const addShareEl = document.getElementById('myPresetsAddShareActions');
    if (addShareEl) addShareEl.style.display = tab === 'mine' ? 'inline-flex' : 'none';
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
  const addShareEl = document.getElementById('myPresetsAddShareActions');
  if (addShareEl) addShareEl.style.display = myPresetsTab === 'mine' ? 'inline-flex' : 'none';
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
        soundSet: p.soundSet,
        volumes: p.volumes || {},
        ownerEmail: p.ownerEmail,
        ownerName: p.ownerName,
        isOwner: p.isOwner,
        isFavourite: !!p.isFavourite,
        likeCount: p.likeCount ?? 0,
        isLiked: !!p.isLiked,
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
        soundSet: p.soundSet,
        volumes: p.volumes || {},
        ownerEmail: p.ownerEmail,
        ownerName: p.ownerName,
        isOwner: p.isOwner,
        isFavourite: !!p.isFavourite,
        likeCount: p.likeCount ?? 0,
        isLiked: !!p.isLiked,
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
        soundSet: p.soundSet,
        volumes: p.volumes || {},
        ownerEmail: p.ownerEmail,
        ownerName: p.ownerName,
        isOwner: p.isOwner,
        isFavourite: !!p.isFavourite,
        likeCount: p.likeCount ?? 0,
        isLiked: !!p.isLiked,
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

async function applyPreset(preset) {
  pattern = yamlPresetToPattern(preset);
  if (preset.bpm) bpmInput.value = preset.bpm;
  if (preset.timeSignature && timeSignatureSelect && ['3/4', '4/4', '12/8'].includes(preset.timeSignature)) {
    timeSignatureSelect.value = preset.timeSignature;
  }
  currentStep = 0;
  updateCurrentStepUI();
  // Restore instrument volumes from preset
  if (preset.volumes && typeof preset.volumes === 'object') {
    INSTRUMENTS.forEach(inst => {
      const v = preset.volumes[inst.id];
      if (typeof v === 'number' && v >= 0 && v <= 1) {
        setInstrumentVolume(inst.id, v);
      }
    });
  }
  updatePresetNameDisplay(preset.name);
  renderSequencer();
  updateUrl();

  // Sound set: nếu preset có soundSet đã lưu và tồn tại → dùng; không thì standard
  const soundSetSelect = document.getElementById('soundSet');
  if (soundSetSelect) {
    const availableSets = Array.from(soundSetSelect.options).map(o => o.value);
    const soundToUse = (preset.soundSet && availableSets.includes(preset.soundSet)) ? preset.soundSet : 'standard';
    currentSoundSet = soundToUse;
    soundSetSelect.value = soundToUse;
    localStorage.setItem(SOUND_SET_STORAGE, currentSoundSet);
    await loadSamples(currentSoundSet);
  }
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
      btn.addEventListener('click', async () => {
        await applyPreset(preset);
        closeRhythmModal();
        if (isPlaying) stopPlayback();
        startPlayback();
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

function saveChainToStorage() {
  try {
    const data = chainPresets.map(c => ({ preset: c.preset, measures: c.measures || chainMeasuresPerPreset }));
    localStorage.setItem(CHAIN_STORAGE, JSON.stringify(data));
  } catch (_) {}
}

function loadChainFromStorage() {
  try {
    const stored = localStorage.getItem(CHAIN_STORAGE);
    if (stored) {
      const data = JSON.parse(stored);
      if (Array.isArray(data)) {
        chainPresets = data.map(c => ({ preset: c.preset, measures: c.measures || chainMeasuresPerPreset }));
      }
    }
  } catch (_) {}
}

function renderChainList() {
  const list = document.getElementById('chainList');
  if (!list) return;
  list.innerHTML = '';
  chainPresets.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'chain-item';
    const measures = item.measures || chainMeasuresPerPreset;
    div.innerHTML = `
      <span class="chain-order">${i + 1}</span>
      <span class="chain-name">${escapeHtml(item.preset.name)}</span>
      <input type="number" class="chain-measures-edit" min="1" max="64" value="${measures}" data-i="${i}" title="${t('chainMeasures')}">
      <button type="button" class="btn btn-ghost btn-sm chain-remove" data-i="${i}">×</button>
    `;
    const measuresInput = div.querySelector('.chain-measures-edit');
    measuresInput.addEventListener('change', () => {
      const v = Math.max(1, Math.min(64, parseInt(measuresInput.value, 10) || 4));
      chainPresets[i].measures = v;
      measuresInput.value = v;
      saveChainToStorage();
    });
    div.querySelector('.chain-remove').addEventListener('click', () => {
      chainPresets.splice(i, 1);
      renderChainList();
      saveChainToStorage();
    });
    list.appendChild(div);
  });
}

async function openChainModal() {
  const modal = document.getElementById('chainModal');
  const select = document.getElementById('chainPresetSelect');
  modal.classList.add('active');
  loadChainFromStorage();
  renderChainList();
  select.innerHTML = '<option value="">' + t('chainSelectPreset') + '</option>';
  const allPresets = [];
  const defaultPresets = rhythmPresetsCache.length > 0 ? rhythmPresetsCache : await loadPresetsFromYaml();
  rhythmPresetsCache = defaultPresets;
  const defaultOptgroup = document.createElement('optgroup');
  defaultOptgroup.label = t('chainSourceDefault');
  defaultPresets.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = allPresets.length;
    opt.textContent = p.name;
    defaultOptgroup.appendChild(opt);
    allPresets.push(p);
  });
  select.appendChild(defaultOptgroup);
  if (currentUser) {
    const myPresets = await loadMyPresets();
    const mine = myPresets.filter(p => p.isOwner);
    const shared = myPresets.filter(p => !p.isOwner);
    if (mine.length > 0) {
      const mineOptgroup = document.createElement('optgroup');
      mineOptgroup.label = t('chainSourceMine');
      mine.forEach(p => {
        const opt = document.createElement('option');
        opt.value = allPresets.length;
        opt.textContent = p.name;
        mineOptgroup.appendChild(opt);
        allPresets.push({ name: p.name, bpm: p.bpm, timeSignature: p.timeSignature || '4/4', instruments: p.instruments || {}, soundSet: p.soundSet, volumes: p.volumes || {} });
      });
      select.appendChild(mineOptgroup);
    }
    if (shared.length > 0) {
      const sharedOptgroup = document.createElement('optgroup');
      sharedOptgroup.label = t('chainSourceShared');
      shared.forEach(p => {
        const opt = document.createElement('option');
        opt.value = allPresets.length;
        opt.textContent = p.name + (p.ownerEmail ? ' (' + formatOwnerEmail(p.ownerEmail) + ')' : '');
        sharedOptgroup.appendChild(opt);
        allPresets.push({ name: p.name, bpm: p.bpm, timeSignature: p.timeSignature || '4/4', instruments: p.instruments || {}, soundSet: p.soundSet, volumes: p.volumes || {} });
      });
      select.appendChild(sharedOptgroup);
    }
  }
  window._chainPresetOptions = allPresets;
  select.value = '';
}

function closeChainModal() {
  document.getElementById('chainModal')?.classList.remove('active');
}

function addToChain() {
  const select = document.getElementById('chainPresetSelect');
  const measuresInput = document.getElementById('chainMeasuresInput');
  if (!select || !select.value) return;
  const i = parseInt(select.value, 10);
  const presets = window._chainPresetOptions || [];
  const measures = measuresInput ? Math.max(1, Math.min(64, parseInt(measuresInput.value, 10) || 4)) : chainMeasuresPerPreset;
  if (i >= 0 && i < presets.length) {
    chainPresets.push({ preset: presets[i], measures });
    renderChainList();
    saveChainToStorage();
    select.value = '';
  }
}

function clearChain() {
  chainPresets = [];
  renderChainList();
  saveChainToStorage();
}

const RANDOM_STYLES = {
  rock: { kick: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
  hiphop: { kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
  latin: { kick: [1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0], snare: [0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0], hihat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
  house: { kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare: [0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], hihat: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
};

function generateRandomBeat() {
  const styles = Object.keys(RANDOM_STYLES);
  const style = styles[Math.floor(Math.random() * styles.length)];
  const template = RANDOM_STYLES[style];
  const p = getEmptyPattern();
  const kick = template.kick.map(() => Math.random() < 0.7 ? 1 : 0);
  const snare = template.snare.map(() => Math.random() < 0.6 ? 1 : 0);
  const hihat = template.hihat.map(() => Math.random() < 0.8 ? 1 : 0);
  p.kick = repeatPattern(kick, STEPS);
  p.snare = repeatPattern(snare, STEPS);
  p.hihat = repeatPattern(hihat, STEPS);
  pattern = p;
  bpmInput.value = 80 + Math.floor(Math.random() * 60);
  updatePresetNameDisplay('');
  renderSequencer();
  updateUrl();
}

async function loadPresetFromFile(file) {
  try {
    const text = await file.text();
    const data = typeof jsyaml !== 'undefined' ? jsyaml.load(text) : JSON.parse(text);
    const presets = data?.presets || (Array.isArray(data) ? data : (data?.name && data?.instruments ? [data] : []));
    if (presets.length === 0) {
      await showAlert(t('loadFileNoPresets'), t('error'));
      return;
    }
    const preset = presets[0];
    await applyPreset(preset);
    if (isPlaying) stopPlayback();
  } catch (e) {
    await showAlert(t('loadFileError') + ': ' + e.message, t('error'));
  }
}

async function saveCurrentRhythmAsYaml() {
  const name = await showPrompt('', t('newPreset'), t('downloadTitle'));
  if (!name) return;
  const preset = {
    name,
    bpm: getBpm(),
    timeSignature: timeSignatureSelect ? timeSignatureSelect.value : '4/4',
    soundSet: currentSoundSet || 'standard',
    volumes: Object.fromEntries(INSTRUMENTS.map(inst => [inst.id, getInstrumentVolume(inst.id)])),
    instruments: {}
  };
  const stepsCount = getStepsCount();
  INSTRUMENTS.forEach(inst => {
    const row = pattern[inst.id] || Array(stepsCount).fill(0);
    preset.instruments[inst.id] = encodeRow(repeatPattern(row, stepsCount), stepsCount);
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
  try {
    const stored = localStorage.getItem(VOLUME_STORAGE);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') instrumentVolumes = parsed;
    }
  } catch (_) {}
  loadFromUrl();
  initPattern();
  loadChainFromStorage();
  renderSequencer();

  const soundSetSelect = document.getElementById('soundSet');
  if (soundSetSelect) {
    const sets = await loadSoundSets();
    currentSoundSet = localStorage.getItem(SOUND_SET_STORAGE) || 'standard';
    if (!sets.includes(currentSoundSet)) currentSoundSet = (sets.includes('standard') ? 'standard' : sets[0]) || 'standard';
    soundSetSelect.innerHTML = sets.map(s => `<option value="${escapeHtml(s)}" ${s === currentSoundSet ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');
    soundSetSelect.addEventListener('change', async () => {
      currentSoundSet = soundSetSelect.value;
      localStorage.setItem(SOUND_SET_STORAGE, currentSoundSet);
      await loadSamples(currentSoundSet);
    });
  }
  await loadSamples(currentSoundSet);

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
    } else if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      generateRandomBeat();
    } else if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (metronomeCheck) metronomeCheck.checked = !metronomeCheck.checked;
    } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      e.preventDefault();
      const bpm = Math.min(240, getBpm() + 5);
      bpmInput.value = bpm;
      updateUrl();
    } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      const bpm = Math.max(40, getBpm() - 5);
      bpmInput.value = bpm;
      updateUrl();
    }
  });
  clearBtn.addEventListener('click', clearPattern);
  copyUrlBtn.addEventListener('click', copyUrlToClipboard);
  rhythmBtn.addEventListener('click', openRhythm);
  closeRhythm.addEventListener('click', closeRhythmModal);

  document.getElementById('chainBtn')?.addEventListener('click', openChainModal);
  document.getElementById('closeChain')?.addEventListener('click', closeChainModal);
  document.getElementById('chainAddPreset')?.addEventListener('click', addToChain);
  document.getElementById('chainClear')?.addEventListener('click', clearChain);
  document.getElementById('randomBtn')?.addEventListener('click', generateRandomBeat);

  const masterVolEl = document.getElementById('masterVolume');
  if (masterVolEl) {
    const stored = localStorage.getItem(MASTER_VOLUME_STORAGE);
    if (stored !== null) masterVolEl.value = stored;
    masterVolEl.addEventListener('input', () => {
      getAudioContext();
      setMasterVolume(parseInt(masterVolEl.value, 10) / 100);
      try { localStorage.setItem(MASTER_VOLUME_STORAGE, masterVolEl.value); } catch (_) {}
    });
    if (audioContext) setMasterVolume(parseInt(masterVolEl.value, 10) / 100);
  }
  const accentEl = document.getElementById('accentLevel');
  if (accentEl) {
    const stored = localStorage.getItem(ACCENT_STORAGE);
    if (stored !== null) accentEl.value = stored;
    accentEl.addEventListener('input', () => {
      try { localStorage.setItem(ACCENT_STORAGE, accentEl.value); } catch (_) {}
    });
  }
  const swingEl = document.getElementById('swingAmount');
  if (swingEl) {
    const stored = localStorage.getItem(SWING_STORAGE);
    if (stored !== null) swingEl.value = stored;
    swingEl.addEventListener('input', () => {
      try { localStorage.setItem(SWING_STORAGE, swingEl.value); } catch (_) {}
    });
  }
  const saveRhythmBtn = document.getElementById('saveRhythmBtn');
  if (saveRhythmBtn) saveRhythmBtn.addEventListener('click', saveCurrentRhythmAsYaml);
  const loadFileBtn = document.getElementById('loadFileBtn');
  const loadFileInput = document.getElementById('loadFileInput');
  if (loadFileBtn && loadFileInput) {
    loadFileBtn.addEventListener('click', () => loadFileInput.click());
    loadFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        loadPresetFromFile(file);
        loadFileInput.value = '';
      }
    });
  }

  if (timeSignatureSelect) {
    timeSignatureSelect.addEventListener('change', () => {
      if (isPlaying) stopPlayback();
      initPattern();
      renderSequencer();
      updateUrl();
    });
  }

  bpmInput.addEventListener('change', updateUrl);

  // Giữ playback loop khi chuyển tab - resume AudioContext khi quay lại
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && audioContext?.state === 'suspended') {
      audioContext.resume();
    }
  });

  // rhythmModal: chỉ đóng khi click nút Đóng hoặc chọn điệu

  if (!window.location.search.includes('data=')) {
    pattern = getBasicRockPattern();
    renderSequencer();
    updateUrl();
  }
}

init();
