/* =========================================================
   weapon-system.js  発射体（武器ごとの挙動）
   ========================================================= */
'use strict';

class Projectile {
  constructor(weapon, x, y, dir, target) {
    this.w = weapon;
    this.x = x; this.y = y;
    this.dir = dir;
    this.damage = weapon.damage;
    this.color = weapon.color;
    this.type = weapon.type;
    this.life = 90;
    this.pierce = weapon.pierce || 1;
    this.hitSet = new Set();
    this.target = target; // homing用（敵配列参照は main 側で渡す）
    this.size = 8;
    this.dead = false;

    const sp = weapon.speed || 0;
    switch (weapon.type) {
      case 'melee_line': // 消しゴム：短い前方ヒットボックス、即消滅
        this.x = x + dir * 20; this.vx = 0; this.vy = 0; this.life = 8; this.size = 18; break;
      case 'line':       // 定規
        this.vx = sp * dir; this.vy = 0; this.size = 10; break;
      case 'pierce':     // コンパス
        this.vx = sp * dir; this.vy = 0; this.size = 9; break;
      case 'aoe':        // バット：プレイヤー周囲の範囲攻撃、短命
        this.x = x; this.y = y; this.vx = 0; this.vy = 0;
        this.life = 12; this.size = weapon.radius || 90; this.pierce = 99; break;
      case 'rapid':      // ホッチキス
        this.vx = sp * dir; this.vy = 0; this.size = 6; this.life = 70; break;
      case 'wave':       // ゴルフ：地を這う波
        this.vx = sp * dir; this.vy = 0; this.size = 16; this.life = 120; this.ground = true; this.pierce = 3; break;
      case 'homing':     // 仙人の杖：追尾
        this.vx = sp * dir; this.vy = 0; this.size = 9; this.life = 140; break;
      case 'omni':       // 勇者の剣：全方位大剣波
        this.vx = sp * dir; this.vy = 0; this.size = 80; this.life = 14; this.pierce = 99; break;
    }
  }

  update(enemies, groundY) {
    this.life--;
    if (this.life <= 0) { this.dead = true; return; }

    if (this.type === 'homing' && enemies && enemies.length) {
      // 最も近い敵へ向き調整
      let best = null, bd = Infinity;
      for (const e of enemies) {
        if (e.dead) continue;
        const d = (e.cx - this.x) ** 2 + (e.cy - this.y) ** 2;
        if (d < bd) { bd = d; best = e; }
      }
      if (best) {
        const ang = Math.atan2(best.cy - this.y, best.cx - this.x);
        const sp = this.w.speed;
        this.vx += (Math.cos(ang) * sp - this.vx) * 0.12;
        this.vy += (Math.sin(ang) * sp - this.vy) * 0.12;
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.ground) this.y = groundY - 14; // 地這い

    // トレイル
    if ((this.type === 'homing' || this.type === 'wave') && this.life % 3 === 0) {
      FX.burst(this.x, this.y, this.color, 1, { speed: 0.5, life: 12, grav: 0 });
    }
  }

  // 敵との当たり（AABB / 円）
  hits(e) {
    if (this.hitSet.has(e)) return false;
    const ex = (typeof e.hitX === 'number') ? e.hitX : e.x;
    const ey = (typeof e.hitY === 'number') ? e.hitY : e.y;
    const ew = (typeof e.hitW === 'number') ? e.hitW : e.w;
    const eh = (typeof e.hitH === 'number') ? e.hitH : e.h;
    const ecx = ex + ew / 2;
    const ecy = ey + eh / 2;
    let hit;
    if (this.type === 'aoe' || this.type === 'omni') {
      const dx = ecx - this.x, dy = ecy - this.y;
      hit = (dx * dx + dy * dy) < (this.size * this.size);
    } else {
      hit = Math.abs(ecx - this.x) < (this.size + ew / 2) &&
            Math.abs(ecy - this.y) < (this.size + eh / 2);
    }
    if (hit) {
      this.hitSet.add(e);
      this.pierce--;
      if (this.pierce <= 0) this.dead = true;
      return true;
    }
    return false;
  }
}

const WeaponSystem = {
  // 攻撃発動。発射体を返す（複数の場合も）
  fire(player) {
    const w = player.curWeapon;
    const ox = player.facing > 0 ? player.x + player.w : player.x;
    const oy = player.cy;
    Audio2.sfx('attack');
    const shots = [];
    if (w.type === 'aoe' || w.type === 'omni') {
      shots.push(new Projectile(w, player.cx, player.cy, player.facing));
      FX.burst(player.cx, player.cy, w.color, 16, { speed: 5, life: 18, grav: 0 });
    } else {
      shots.push(new Projectile(w, ox, oy, player.facing));
    }
    return shots;
  },
};
