"use strict";

// ---------- Chip-tune Sound Effects (F04) ----------

// Sound system using Web Audio API
let soundContext = null;
function getSoundContext() {
  if (!soundContext) {
    soundContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return soundContext;
}
let soundEnabled = true;
let soundVolume = 0.5;

// Sound types
const SOUND_TYPES = {
  MOVE: "move",
  COLLISION: "collision",
  CHEESE: "cheese",
  LEVEL_UP: "levelUp",
};

// Frequency values for chip-tune sounds
const SOUND_FREQS = {
  move: [440, 660, 880],       // A4, E5, A5
  collision: [220, 330, 440],  // A3, E4, A4
  cheese: [550, 880, 1320],    // C#5, A5, E6
  levelUp: [330, 440, 550, 660], // E4, A4, C#5, E5
};

// Wave types
const WAVE_TYPES = {
  SQUARE: "square",
  SAWTOOTH: "sawtooth",
  SINE: "sine",
  TRIANGLE: "triangle",
};

// Create oscillator with chip-tune waveform
function createOscillator(freq, waveType = WAVE_TYPES.SQUARE, duration = 0.1, volume = 0.3) {
  const oscillator = getSoundContext().createOscillator();
  const gainNode = getSoundContext().createGain();
  
  oscillator.type = waveType;
  oscillator.frequency.value = freq;
  
  gainNode.gain.value = volume * soundVolume * (soundEnabled ? 1 : 0);
  
  oscillator.connect(gainNode);
  gainNode.connect(getSoundContext().destination);
  
  oscillator.start();
  oscillator.stop(getSoundContext().currentTime + duration);
  
  return { oscillator, gainNode };
}

// Play chip-tune sound
function playSound(soundType, options = {}) {
  if (!soundEnabled) return null;
  
  const freqs = SOUND_FREQS[soundType];
  if (!freqs) return null;
  
  const waveType = options.waveType || WAVE_TYPES.SQUARE;
  const duration = options.duration || 0.08;
  const volume = options.volume || 0.25;
  const detune = options.detune || 0;
  
  // Play multiple frequencies for richer sound
  const oscillators = [];
  for (let i = 0; i < freqs.length; i++) {
    const freq = freqs[i] * Math.pow(2, detune / 1200);
    const vol = volume / Math.sqrt(freqs.length);
    oscillators.push(createOscillator(freq, waveType, duration, vol));
  }
  
  return oscillators;
}

// Play direction blip (different pitch for each direction)
function playDirectionBlip(dx, dy) {
  if (!soundEnabled) return;
  
  // Map direction to pitch
  const pitchMap = {
    "1,0": 0,    // Right
    "-1,0": 2,   // Left
    "0,1": -2,   // Down
    "0,-1": 4,   // Up
  };
  
  const key = `${dx},${dy}`;
  const semitones = pitchMap[key] || 0;
  
  playSound(SOUND_TYPES.MOVE, {
    detune: semitones * 100,
    volume: 0.2,
  });
}

// Play collision sound
function playCollisionSound() {
  playSound(SOUND_TYPES.COLLISION, {
    duration: 0.12,
    volume: 0.35,
  });
}

// Play cheese collected sound
function playCheeseSound() {
  playSound(SOUND_TYPES.CHEESE, {
    duration: 0.2,
    volume: 0.4,
    waveType: WAVE_TYPES.SAWTOOTH,
  });
}

// Play level up sound
function playLevelUpSound() {
  playSound(SOUND_TYPES.LEVEL_UP, {
    duration: 0.3,
    volume: 0.35,
  });
}

// Toggle sound on/off
function toggleSound() {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

// Set sound enabled directly (I20: every mute control drives this one variable)
function setSoundEnabled(v) {
  soundEnabled = !!v;
  return soundEnabled;
}

// Sync every mute button with the current soundEnabled state (I20)
function syncMuteUI() {
  const label = soundEnabled ? "[ SFX ON ]" : "[ SFX OFF ]";
  [document.getElementById("muteBtn"), document.getElementById("gameMuteBtn")].forEach((b) => {
    if (!b) return;
    b.textContent = label;
    b.classList.toggle("active", !soundEnabled);
    b.title = soundEnabled ? "Mute chip-tune SFX" : "Unmute chip-tune SFX";
  });
}

// User-facing mute toggle: flips the shared variable, persists, syncs all controls
function userToggleSound() {
  toggleSound();
  state.soundEnabled = soundEnabled;
  saveState();
  syncMuteUI();
  showNotification(soundEnabled ? "SFX ON" : "SFX OFF", "info", 1500, false);
}

// Set sound volume (0.0 to 1.0)
function setSoundVolume(volume) {
  soundVolume = Math.max(0, Math.min(1, volume));
  return soundVolume;
}

// Check if sound is enabled
function isSoundEnabled() {
  return soundEnabled;
}

// Get sound volume
function getSoundVolume() {
  return soundVolume;
}

// Resume audio context (needed for iOS Safari)
function resumeAudioContext() {
  if (getSoundContext().state === "suspended") {
    getSoundContext().resume().catch(e => {
      console.log("Audio context resume failed:", e);
    });
  }
}

// Initialize sound system
function initSound() {
  // Load saved settings
  if (state.soundEnabled !== undefined) {
    soundEnabled = state.soundEnabled;
  }
  if (state.soundVolume !== undefined) {
    soundVolume = state.soundVolume;
  }
  
  // Resume audio on user interaction
  document.addEventListener("click", resumeAudioContext, { once: true });
  document.addEventListener("touchstart", resumeAudioContext, { once: true });
  document.addEventListener("keydown", resumeAudioContext, { once: true });

  // I20: wire every mute control to the same variable
  document.getElementById("muteBtn")?.addEventListener("click", userToggleSound);
  document.getElementById("gameMuteBtn")?.addEventListener("click", userToggleSound);
  syncMuteUI();
  
  // Expose to window for global access
  window.playSound = playSound;
  window.playDirectionBlip = playDirectionBlip;
  window.playCollisionSound = playCollisionSound;
  window.playCheeseSound = playCheeseSound;
  window.playLevelUpSound = playLevelUpSound;
  window.toggleSound = toggleSound;
  window.setSoundEnabled = setSoundEnabled;
  window.syncMuteUI = syncMuteUI;
  window.setSoundVolume = setSoundVolume;
  window.isSoundEnabled = isSoundEnabled;
  window.getSoundVolume = getSoundVolume;
}

// Initialize on script load
initSound();
