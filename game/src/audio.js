// Procedural Web Audio: every sound is synthesised, no files, no network.

let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function tone(freq, dur, type = 'sine', gain = 0.08, slide = 0) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), a.currentTime + dur);
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

export const sound = {
  fire(freq)   { tone(freq, 0.10, 'triangle', 0.05, 180); },
  match()      { tone(520, 0.13, 'sine', 0.09, 480); tone(780, 0.10, 'sine', 0.05); },
  mismatch()   { tone(150, 0.16, 'sawtooth', 0.06, -60); },
  hit()        { tone(110, 0.35, 'square', 0.10, -50); },
  burst()      { tone(220, 0.5, 'sawtooth', 0.08, 900); },
  wave()       { tone(330, 0.18, 'sine', 0.07, 220); tone(440, 0.22, 'sine', 0.06, 330); },
  over()       { tone(300, 0.6, 'triangle', 0.09, -220); },
  start()      { tone(440, 0.12, 'sine', 0.06, 220); },
};
