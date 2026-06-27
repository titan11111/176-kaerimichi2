/* =========================================================
   particles.js  パーティクル + ダメージ数値 + 画面シェイク
   ========================================================= */
'use strict';

const FX = {
  particles: [],
  damageNumbers: [],
  shake: 0,
  flash: 0,        // 全画面フラッシュ 0..1
  flashColor: '#fff',

  clear() { this.particles.length = 0; this.damageNumbers.length = 0; this.shake = 0; this.flash = 0; },

  burst(x, y, color, count = 12, opt = {}) {
    const spd = opt.speed || 4;
    const life = opt.life || 30;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = spd * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opt.up || 0),
        life, maxLife: life, color, size: opt.size || (2 + Math.random() * 3),
        grav: opt.grav != null ? opt.grav : 0.15,
      });
    }
  },

  // ふわふわ漂う粒（タイトル・エンディング用）
  ambient(x, y, color, life = 120) {
    this.particles.push({
      x, y, vx: (Math.random() - 0.5) * 0.6, vy: -0.3 - Math.random() * 0.5,
      life, maxLife: life, color, size: 1.5 + Math.random() * 2.5, grav: 0, twinkle: true,
    });
  },

  damageNumber(x, y, value, color = '#fff') {
    this.damageNumbers.push({ x, y, value, color, life: 60, maxLife: 60 });
  },

  addShake(intensity) { this.shake = Math.max(this.shake, intensity); },

  flashScreen(color = '#fff', strength = 1) { this.flash = strength; this.flashColor = color; },

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.grav;
      p.life--;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const d = this.damageNumbers[i];
      d.y -= 1.1; d.life--;
      if (d.life <= 0) this.damageNumbers.splice(i, 1);
    }
    if (this.shake > 0.2) this.shake *= 0.9; else this.shake = 0;
    if (this.flash > 0) this.flash -= 0.04;
    if (this.flash < 0) this.flash = 0;
  },
};
