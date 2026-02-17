/**
 * Trống điện tử online - Drum Machine
 * Lưu và chỉnh sửa điệu trống dễ dàng
 */

const INSTRUMENTS = [
  { id: 'hihatPedal', name: 'Bàn đạp hi-hat' },
  { id: 'tom', name: 'Tom-tom' },
  { id: 'floorTom', name: 'Chân tom sàn' },
  { id: 'cymbal', name: 'Cymbal' },
  { id: 'hihat', name: 'Hi-hat' },
  { id: 'snare', name: 'Trống Snare' },
  { id: 'kick', name: 'Trống bass' }
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
const rhythmModal = document.getElementById('rhythmModal');
const rhythmBtn = document.getElementById('rhythmBtn');
const closeRhythm = document.getElementById('closeRhythm');
const metronomeCheck = document.getElementById('metronomeCheck');
const timeSignatureSelect = document.getElementById('timeSignature');

const PRESETS_YAML_PATH = 'styles/presets.yaml';

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

// Web Audio API - standard drum kit sounds
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
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.015);
  osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.2);
  gain.gain.setValueAtTime(0.95, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
  osc.start(t);
  osc.stop(t + 0.2);
}

function playSnare() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.06));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 800;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseGain.gain.setValueAtTime(0.4, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  noise.start(t);
  noise.stop(t + 0.1);
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.035);
  osc.type = 'triangle';
  oscGain.gain.setValueAtTime(0.45, t);
  oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.035);
  osc.start(t);
  osc.stop(t + 0.035);
}

function playSnareRimshot() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(550, t);
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.025);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.55, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.045);
  osc.start(t);
  osc.stop(t + 0.045);
  const bufferSize = ctx.sampleRate * 0.018;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.12));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 2200;
  noiseFilter.Q.value = 2.5;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseGain.gain.setValueAtTime(0.22, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.018);
  noise.start(t);
  noise.stop(t + 0.018);
}

function playHiHat(closed = true) {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const dur = closed ? 0.035 : 0.12;
  const bufferSize = ctx.sampleRate * dur;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 8500;
  filter.Q.value = 0.8;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(closed ? 0.22 : 0.28, t);
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
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.35, t + 0.1);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.55, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  osc.start(t);
  osc.stop(t + 0.1);
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

function playCymbal() {
  const ctx = getAudioContext();
  const t = ctx.currentTime;
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 5500;
  filter.Q.value = 0.5;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.32, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
  noise.start(t);
  noise.stop(t + 0.3);
}

function playDrum(instrumentId, value = 1) {
  if (mutedInstruments.has(instrumentId)) return;
  switch (instrumentId) {
    case 'kick': playKick(); break;
    case 'snare': value === 2 ? playSnareRimshot() : playSnare(); break;
    case 'hihat':
    case 'hihatPedal': playHiHat(value !== 2); break;
    case 'tom': playTom(180); break;
    case 'floorTom': playTom(120); break;
    case 'cymbal': playCymbal(); break;
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
    nameEl.textContent = inst.name;
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
      step.title = (inst.id === 'hihat' || inst.id === 'hihatPedal') && val === 2 ? 'Hi-hat mở (nhấp để đổi)' :
        inst.id === 'snare' && val === 2 ? 'Snare rimshot (nhấp để đổi)' : '';
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
  const hasVariant = instrumentId === 'hihat' || instrumentId === 'hihatPedal' || instrumentId === 'snare';
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
    step.title = (instrumentId === 'hihat' || instrumentId === 'hihatPedal') && val === 2 ? 'Hi-hat mở (nhấp để đổi)' :
      instrumentId === 'snare' && val === 2 ? 'Snare rimshot (nhấp để đổi)' : '';
  }
}

function updateCurrentStepUI() {
  document.querySelectorAll('.step').forEach(el => {
    el.classList.remove('current');
    if (parseInt(el.dataset.step) === currentStep) {
      el.classList.add('current');
    }
  });
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
    copyStatus.textContent = 'Đã sao chép!';
    copyStatus.style.color = 'var(--accent)';
    setTimeout(() => { copyStatus.textContent = ''; }, 2000);
  }).catch(() => {
    copyStatus.textContent = 'Lỗi sao chép';
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
    .then(r => r.text())
    .then(text => {
      const data = typeof jsyaml !== 'undefined' ? jsyaml.load(text) : null;
      return data && data.presets ? data.presets : getFallbackPresets();
    })
    .catch(() => getFallbackPresets());
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
  renderSequencer();
  updateUrl();
}

function renderPresetList(presets, searchTerm = '') {
  const container = document.getElementById('rhythmPresets');
  const search = searchTerm.toLowerCase().trim();
  const filtered = search ? presets.filter(p => p.name.toLowerCase().includes(search)) : presets;
  container.innerHTML = '';
  filtered.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'rhythm-preset';
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      playPresetPreview(preset);
      applyPreset(preset);
      closeRhythmModal(false);
    });
    container.appendChild(btn);
  });
  if (filtered.length === 0) {
    container.innerHTML = '<p class="rhythm-empty">Không tìm thấy nhịp điệu</p>';
  }
}

function openRhythm() {
  rhythmModal.classList.add('active');
  const searchInput = document.getElementById('rhythmSearch');
  if (searchInput) searchInput.value = '';
  const container = document.getElementById('rhythmPresets');
  container.innerHTML = '<p class="rhythm-loading">Đang tải...</p>';
  loadPresetsFromYaml().then(presets => {
    rhythmPresetsCache = presets;
    renderPresetList(presets);
    if (searchInput) {
      searchInput.oninput = () => renderPresetList(presets, searchInput.value);
    }
  });
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

function saveCurrentRhythmAsYaml() {
  const name = prompt('Tên nhịp điệu:', 'Nhịp mới');
  if (!name || !name.trim()) return;
  const preset = {
    name: name.trim(),
    bpm: getBpm(),
    timeSignature: timeSignatureSelect ? timeSignatureSelect.value : '4/4',
    instruments: {}
  };
  INSTRUMENTS.forEach(inst => {
    const row = pattern[inst.id] || Array(STEPS).fill(0);
    preset.instruments[inst.id] = repeatPattern(row, STEPS);
  });
  const yaml = typeof jsyaml !== 'undefined' ? jsyaml.dump({ presets: [preset] }) : JSON.stringify(preset, null, 2);
  const blob = new Blob([yaml], { type: 'text/yaml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name.trim().toLowerCase().replace(/\s+/g, '-') + '.yaml';
  a.click();
  URL.revokeObjectURL(a.href);
}

// Init
function init() {
  loadFromUrl();
  initPattern();
  renderSequencer();

  playBtn.addEventListener('click', togglePlayback);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
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

  rhythmModal.addEventListener('click', (e) => {
    if (e.target === rhythmModal) closeRhythmModal();
  });

  if (!window.location.search.includes('data=')) {
    pattern = getBasicRockPattern();
    renderSequencer();
    updateUrl();
  }
}

init();
