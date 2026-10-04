/* Patara'nın Kâşif Kampı · sentezlenmiş küçük sesler (ses dosyası yok). */
(function () {
  let ac = null;
  const S = (window.SES = { on: true });
  const ctx = () => {
    if (!S.on) return null;
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  function tone(f, d = 0.12, type = 'sine', g = 0.12, at = 0, slide = 0) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + at, o = a.createOscillator(), v = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + d);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + 0.012); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(v).connect(a.destination); o.start(t); o.stop(t + d + 0.03);
  }
  const NOTES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];
  S.tick = () => tone(880, 0.05, 'triangle', 0.06);
  S.pop = () => tone(520, 0.09, 'triangle', 0.1, 0, 1.6);
  S.good = () => { tone(660, 0.12, 'triangle', 0.1); tone(990, 0.18, 'triangle', 0.1, 0.1); };
  S.bad = () => tone(220, 0.22, 'sawtooth', 0.05, 0, 0.7);
  S.win = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.09, i * 0.09));
  S.zap = () => tone(1200, 0.14, 'square', 0.03, 0, 0.4);
  S.chomp = () => { tone(180, 0.06, 'square', 0.05); tone(120, 0.08, 'square', 0.05, 0.05); };
  S.key = () => tone(1400, 0.035, 'square', 0.03);
  S.note = (i) => tone(NOTES[i % 8], 0.38, 'triangle', 0.13);
  S.NOTES = NOTES;
  document.addEventListener('visibilitychange', () => { if (ac) document.hidden ? ac.suspend() : S.on && ac.resume(); });
})();
