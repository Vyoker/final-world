/* Final World SFX v1.4 — efek suara sintetis WebAudio, tanpa file audio.
   Semua suara dibuat dari osilator + noise, jadi game tetap ringan dan jalan offline.
   AudioContext dibuat saat interaksi pertama user (aturan browser). */
(function () {
  'use strict';
  let ac = null, master = null, muted = false;
  try { muted = localStorage.getItem('fw_muted') === '1'; } catch (e) { /* abaikan */ }

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.45;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  /** Nada osilator dengan envelope. slideTo = frekuensi akhir (glide). */
  function tone(freq, dur, type, vol, slideTo, delay) {
    const c = ctx(); if (!c || muted) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  /** Noise putih dengan filter. kind: 'lowpass' | 'highpass' | 'bandpass'. */
  function noise(dur, vol, freq, kind, delay, slideTo) {
    const c = ctx(); if (!c || muted) return;
    const t0 = c.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = kind || 'lowpass'; f.frequency.setValueAtTime(freq || 1000, t0);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  const SFX = {
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('fw_muted', muted ? '1' : '0'); } catch (e) { /* abaikan */ }
      return muted;
    },
    /** Panggil saat interaksi pertama agar AudioContext aktif. */
    unlock() { ctx(); },

    click() { tone(660, 0.05, 'square', 0.10); },
    select() { tone(880, 0.06, 'square', 0.12); tone(1320, 0.08, 'square', 0.10, 0, 0.05); },
    back() { tone(440, 0.08, 'square', 0.10, 330); },
    dialog() { tone(700, 0.03, 'sine', 0.07); },
    error() { tone(160, 0.16, 'sawtooth', 0.16); tone(120, 0.18, 'sawtooth', 0.12, 0, 0.08); },
    coin() { tone(990, 0.07, 'sine', 0.16); tone(1320, 0.14, 'sine', 0.16, 0, 0.07); },
    save() { tone(523, 0.08, 'sine', 0.14); tone(784, 0.12, 'sine', 0.14, 0, 0.09); },
    quest() { tone(880, 0.10, 'triangle', 0.16); tone(1174, 0.16, 'triangle', 0.16, 0, 0.10); },
    levelup() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.12, 0, i * 0.07)); },
    chest() { tone(660, 0.06, 'square', 0.12); tone(990, 0.07, 'sine', 0.16, 0, 0.06); tone(1320, 0.14, 'sine', 0.16, 0, 0.13); },
    warp() { tone(300, 0.35, 'sine', 0.14, 1200); noise(0.3, 0.06, 3000, 'highpass', 0.05); },

    slash() { noise(0.12, 0.22, 4000, 'highpass'); tone(300, 0.12, 'sawtooth', 0.10, 80); },
    hit() { noise(0.10, 0.22, 900, 'lowpass'); tone(120, 0.12, 'triangle', 0.20, 60); },
    fire() { noise(0.5, 0.26, 1400, 'lowpass', 0, 300); tone(200, 0.4, 'sawtooth', 0.10, 60); },
    ice() { [1800, 2400, 3000].forEach((f, i) => tone(f, 0.10, 'sine', 0.10, 0, i * 0.05)); noise(0.25, 0.10, 5000, 'highpass'); },
    thunder() { noise(0.7, 0.30, 500, 'lowpass', 0, 120); tone(60, 0.6, 'sine', 0.26, 40); noise(0.08, 0.20, 6000, 'highpass'); },
    heal() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'sine', 0.12, 0, i * 0.08)); },
    revive() { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.16, 'sine', 0.12, 0, i * 0.07)); },
    battle() { tone(110, 0.25, 'sawtooth', 0.16, 90); tone(165, 0.25, 'sawtooth', 0.12, 130, 0.05); noise(0.2, 0.12, 800, 'lowpass'); },
    victory() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.12, 0, i * 0.11)); },
    defeat() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, 0, i * 0.16)); }
  };
  window.SFX = SFX;
})();
