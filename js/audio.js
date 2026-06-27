/* =========================================================
   audio.js  BGM管理 + Web Audio API効果音生成
   ========================================================= */
'use strict';

const Audio2 = {
  ctx: null,
  unlocked: false,
  bgmEl: null,
  curBgm: '',
  bgmVol: 0.45,
  muted: false,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { this.ctx = null; }
    this.bgmEl = document.getElementById('bgm');
    if (this.bgmEl) this.bgmEl.volume = this.bgmVol;
  },

  // 初回タップで unlock（iOS Safari 必須）
  unlock() {
    if (this.unlocked) return;
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    // 無音を1回鳴らして解放
    if (this.ctx) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      g.gain.value = 0; o.connect(g); g.connect(this.ctx.destination);
      o.start(0); o.stop(this.ctx.currentTime + 0.01);
    }
    this.unlocked = true;
  },

  // ---- BGM ----
  playBgm(file, { fade = true } = {}) {
    if (!this.bgmEl) return;
    if (this.curBgm === file && !this.bgmEl.paused) return;
    this.curBgm = file;
    this.bgmEl.src = 'audio/' + encodeURIComponent(file);
    this.bgmEl.loop = true;
    this.bgmEl.volume = fade ? 0 : (this.muted ? 0 : this.bgmVol);
    const p = this.bgmEl.play();
    if (p && p.catch) p.catch(() => {});
    if (fade) this._fadeTo(this.muted ? 0 : this.bgmVol, 800);
  },

  stopBgm() {
    if (!this.bgmEl) return;
    this.bgmEl.pause();
    this.curBgm = '';
  },

  _fadeTo(target, ms) {
    if (!this.bgmEl) return;
    const start = this.bgmEl.volume;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      this.bgmEl.volume = start + (target - start) * k;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.bgmEl) this.bgmEl.volume = this.muted ? 0 : this.bgmVol;
    return this.muted;
  },

  // ---- 効果音（実行時生成） ----
  _tone(wave, f0, f1, dur, gain = 0.2) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  },

  sfx(name) {
    const s = SFX[name];
    if (!s) return;
    this._tone(s.wave, s.f0, s.f1, s.dur);
  },

  // 武器入手: sine 523→659→784 各0.15
  sfxWeaponGet() {
    if (!this.ctx || this.muted) return;
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this._tone('sine', f, f, 0.15, 0.22), i * 150);
    });
  },
  sfxNegoOk() {
    if (!this.ctx || this.muted) return;
    [659, 880].forEach((f, i) => setTimeout(() => this._tone('sine', f, f, 0.18, 0.2), i * 120));
  },
};
