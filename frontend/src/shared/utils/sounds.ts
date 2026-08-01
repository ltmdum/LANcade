let ctx: AudioContext | null = null;

/**
 * Ensure the AudioContext exists and is in 'running' state.
 * Safe to call from any context — resumes if suspended.
 */
function getAudioContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) {
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

/**
 * Create and warm up the AudioContext so it starts in 'running' state.
 * Call this from a user-gesture handler to ensure the browser allows audio.
 */
export function warmupAudio(): void {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 10;
  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

/**
 * Play a short pop sound at the given frequency.
 * @param frequency Frequency in Hz.
 * @param duration Duration in seconds (default 0.15).
 */
export function playPopSound(frequency: number, duration = 0.15): void {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain).connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

/**
 * Play a two-tone ascending sound for positive events (turn start, accepted word).
 */
export function playOkaySound(): void {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain).connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, now);
  osc.frequency.setValueAtTime(659, now + 0.12);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.start(now);
  osc.stop(now + 0.3);
}

/**
 * Play a descending alarm for urgent danger (e.g. undercover agent was caught).
 */
export function playWarningSound(): void {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;

  const startBurst = (freq1: number, freq2: number, startTime: number, duration: number) => {
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc1.type = 'square';
    osc1.frequency.setValueAtTime(freq1, startTime);
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq2, startTime);

    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.setValueAtTime(0.25, startTime + duration - 0.01);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioCtx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
  };

  startBurst(110, 108, now, 0.18);
  startBurst(85, 83, now + 0.24, 0.22);
}

/**
 * Play a cheerful ascending major arpeggio for winning the game.
 */
export function playWinSound(): void {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;

  const playNote = (freq: number, start: number, duration: number) => {
    const sine = audioCtx.createOscillator();
    const harm = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    sine.type = 'sine';
    harm.type = 'triangle';
    harm.frequency.value = freq * 2;

    sine.frequency.setValueAtTime(freq, start);
    harm.frequency.setValueAtTime(freq * 2, start);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.015);
    gain.gain.setValueAtTime(0.18, start + duration - 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    const harmGain = audioCtx.createGain();
    harmGain.gain.setValueAtTime(0.001, start);
    harmGain.gain.exponentialRampToValueAtTime(0.04, start + 0.015);
    harmGain.gain.setValueAtTime(0.04, start + duration - 0.04);
    harmGain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    sine.connect(gain).connect(audioCtx.destination);
    harm.connect(harmGain).connect(audioCtx.destination);

    sine.start(start);
    harm.start(start);
    sine.stop(start + duration);
    harm.stop(start + duration);
  };

  playNote(523, now, 0.12);
  playNote(659, now + 0.14, 0.12);
  playNote(784, now + 0.28, 0.12);
  playNote(1047, now + 0.42, 0.35);
}

/**
 * Play a short tick for countdown warnings (last 3 seconds).
 */
export function playTickSound(): void {
  const audioCtx = getAudioContext();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain).connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.value = 900;
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}


