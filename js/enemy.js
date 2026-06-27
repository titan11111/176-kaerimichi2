/* =========================================================
   enemy.js  雑魚敵 + ボス + ボス弾
   ========================================================= */
'use strict';

class Enemy {
  constructor(x, groundY, stageN) {
    this.w = 30; this.h = 38;
    this.x = x; this.y = groundY - this.h;
    this.vx = -(1 + stageN * 0.18 + Math.random() * 0.6);
    this.vy = 0;
    this.hp = 6 + stageN * 2;
    this.maxHp = this.hp;
    this.stageN = stageN;
    this.dead = false;
    this.flash = 0;
    this.anim = Math.random() * 6;
    this.touchDmg = 14 + stageN;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(player, groundY) {
    // ゆるく追跡：プレイヤー方向へ寄る
    const toP = Math.sign(player.cx - this.cx);
    this.vx += (toP * (0.8 + this.stageN * 0.1) - this.vx) * 0.04;
    this.x += this.vx;
    this.y = groundY - this.h;
    this.anim += 0.2;
    if (this.flash > 0) this.flash--;
  }

  hurt(dmg) {
    this.hp -= dmg;
    this.flash = 4;
    FX.damageNumber(this.cx, this.y - 4, dmg, '#fff');
    if (this.hp <= 0) { this.dead = true; FX.burst(this.cx, this.cy, '#ff8a65', 14, { speed: 4, life: 26 }); }
    else FX.burst(this.cx, this.cy, '#fff', 4, { speed: 2, life: 10 });
  }
}

class BossBullet {
  constructor(x, y, vx, vy, dmg) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.r = 9; this.dmg = dmg; this.dead = false; this.life = 200;
  }
  update() {
    this.x += this.vx; this.y += this.vy; this.life--;
    if (this.life <= 0) this.dead = true;
    if (this.life % 4 === 0) FX.burst(this.x, this.y, '#ff5252', 1, { speed: 0.4, life: 8, grav: 0 });
  }
}

class Boss {
  constructor(def, stageN, groundY, spawnX) {
    this.def = def;
    this.stageN = stageN;
    this.w = 80; this.h = 100;
    this.x = spawnX; this.y = groundY - this.h;
    this.vx = 0; this.vy = 0;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.dead = false;
    this.flash = 0;
    this.shootTimer = 90;
    this.dashTimer = 0;
    this.dashing = false;
    this.dashCooldown = 200;
    this.anim = 0;
    this.touchDmg = 20 + stageN;
    this.bullets = [];
    this.enraged = false;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get phase2() { return this.hp <= this.maxHp * 0.5; }

  update(player, groundY) {
    this.anim += 0.05;
    this.y = groundY - this.h;
    if (this.flash > 0) this.flash--;

    if (this.phase2 && !this.enraged) {
      this.enraged = true;
      FX.flashScreen('#ff0000', 0.5);
    }

    // --- 移動：プレイヤー追跡（一定距離を保つ） ---
    if (this.dashing) {
      this.x += this.vx;
      this.dashTimer--;
      if (this.dashTimer <= 0) { this.dashing = false; this.dashCooldown = this.phase2 ? 130 : 220; }
    } else {
      const toP = Math.sign(player.cx - this.cx);
      const dist = Math.abs(player.cx - this.cx);
      const sp = 1.0 + this.stageN * 0.12;
      if (dist > 180) this.vx = toP * sp;
      else if (dist < 120) this.vx = -toP * sp * 0.6;
      else this.vx *= 0.8;
      this.x += this.vx;

      // 突進（HP50%以下で発動）
      if (this.phase2) {
        this.dashCooldown--;
        if (this.dashCooldown <= 0 && dist < 360) {
          this.dashing = true;
          this.dashTimer = 26;
          this.vx = toP * (5 + this.stageN * 0.3);
          FX.addShake(4);
        }
      }
    }
    this.x = Math.max(20, this.x);

    // --- 弾発射（ステージ進行で弾数・速度増加） ---
    this.shootTimer--;
    if (this.shootTimer <= 0) {
      this.shootTimer = Math.max(45, 95 - this.stageN * 6) - (this.phase2 ? 15 : 0);
      this._shoot(player);
    }

    // 弾更新
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update();
      if (b.dead) this.bullets.splice(i, 1);
    }
  }

  _shoot(player) {
    const speed = 3 + this.stageN * 0.35;
    const baseAng = Math.atan2(player.cy - this.cy, player.cx - this.cx);
    const count = 1 + Math.floor(this.stageN / 2) + (this.phase2 ? 1 : 0);
    const spread = 0.32;
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * spread;
      const a = baseAng + off;
      this.bullets.push(new BossBullet(
        this.cx, this.cy, Math.cos(a) * speed, Math.sin(a) * speed, 15 + this.stageN
      ));
    }
  }

  hurt(dmg) {
    this.hp -= dmg;
    this.flash = 4;
    FX.addShake(8);
    FX.damageNumber(this.cx, this.y - 8, dmg, '#ffd54f');
    FX.burst(this.cx, this.cy, '#fff', 6, { speed: 3, life: 12 });
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true;
      Audio2.sfx('bossDown');
      FX.burst(this.cx, this.cy, '#ffd54f', 40, { speed: 6, life: 40 });
      FX.flashScreen('#ffffff', 0.7);
    }
  }
}
