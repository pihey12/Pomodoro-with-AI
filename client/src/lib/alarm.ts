/** Short alarm using Web Audio API — no external sound file needed. */
export function playPomodoroAlarm() {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const now = ctx.currentTime;

  const beeps = [
    { at: 0, freq: 880, dur: 0.18 },
    { at: 0.25, freq: 880, dur: 0.18 },
    { at: 0.5, freq: 988, dur: 0.35 },
  ];

  for (const beep of beeps) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = beep.freq;
    gain.gain.setValueAtTime(0.0001, now + beep.at);
    gain.gain.exponentialRampToValueAtTime(0.22, now + beep.at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + beep.at + beep.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + beep.at);
    osc.stop(now + beep.at + beep.dur + 0.05);
  }

  window.setTimeout(() => {
    void ctx.close();
  }, 1200);
}
