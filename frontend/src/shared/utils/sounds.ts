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


