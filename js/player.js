/* =========================================================
   player.js  プレイヤークラス（外見変化・物理）
   ========================================================= */
'use strict';

class Player {
  constructor() {
    this.w = 34; this.h = 52;
    this.reset();
    this.hp = PLAYER_MAX_HP;
    this.maxHp = PLAYER_MAX_HP;
    this.weapons = ['eraser'];   // 入手済み武器id
    this.weaponIdx = 0;
  }

  reset() {
    this.x = 100; this.y = 200;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.invincible = 0;
    this.cd = 0;          // 攻撃クールダウン
    this.walkAnim = 0;
    this.flash = 0;       // ヒットフラッシュ
  }

  get curWeapon() { return WEAPONS[WEAPON_INDEX[this.weapons[this.weaponIdx]]]; }

  cycleWeapon() {
    if (this.weapons.length <= 1) return null;
    this.weaponIdx = (this.weaponIdx + 1) % this.weapons.length;
    return this.curWeapon;
  }

  giveWeapon(id) {
    if (!this.weapons.includes(id)) {
      this.weapons.push(id);
      this.weaponIdx = this.weapons.length - 1;
    }
  }

  heal(v) {
    this.hp = Math.min(this.maxHp, this.hp + v);
    Audio2.sfx('heal');
  }

  hurt(dmg) {
    if (this.invincible > 0) return false;
    this.hp -= dmg;
    this.invincible = PHYS.invincibleFrames;
    this.flash = 4;
    Audio2.sfx('damage');
    FX.addShake(6);
    FX.damageNumber(this.x + this.w / 2, this.y - 6, dmg, '#ff5252');
    if (this.hp < 0) this.hp = 0;
    return true;
  }

  update(groundY, stageLen, platforms) {
    platforms = platforms || [];
    const onG = this.onGround;
    const wasOnGround = this.onGround;
    // --- 横移動（地上/空中で制御変化） ---
    const accel = onG ? 1 : PHYS.airControl;
    let dir = 0;
    if (Input.left) dir -= 1;
    if (Input.right) dir += 1;
    if (dir !== 0) {
      this.vx += dir * PHYS.moveSpeed * accel * 0.5;
      this.facing = dir;
    } else if (onG) {
      this.vx *= 0.7;  // 地上摩擦
    } else {
      this.vx *= 0.96;
    }
    this.vx = Math.max(-PHYS.maxSpeed, Math.min(PHYS.maxSpeed, this.vx));

    // --- ジャンプ（コヨーテ + バッファ + 可変） ---
    if (Input.jumpPressed) this.jumpBuffer = PHYS.jumpBufferFrames;
    if (this.jumpBuffer > 0) this.jumpBuffer--;
    if (this.coyote > 0) this.coyote--;

    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = -PHYS.jumpPower;
      this.jumpBuffer = 0; this.coyote = 0; this.onGround = false;
      Audio2.sfx('jump');
      FX.burst(this.x + this.w / 2, this.y + this.h, '#ffffff', 6, { up: 2, life: 18, grav: 0.2 });
    }
    // 可変ジャンプ：上昇中にボタンを離したら減速
    if (!Input.jump && this.vy < 0) this.vy *= PHYS.variableJumpCut;

    // --- 重力 ---
    this.vy += PHYS.gravity;
    if (this.vy > PHYS.maxFallSpeed) this.vy = PHYS.maxFallSpeed;

    // --- 横移動 → 横方向の足場衝突 ---
    this.x += this.vx;
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    if (this.x > stageLen - this.w) { this.x = stageLen - this.w; this.vx = 0; }
    for (const p of platforms) {
      // 上端/下端に6pxマージン → 天面に立っているときは横に引っかからない
      const vOverlap = (this.y < p.y + p.h - 6) && (this.y + this.h > p.y + 6);
      const hOverlap = (this.x < p.x + p.w) && (this.x + this.w > p.x);
      if (vOverlap && hOverlap) {
        if (this.vx > 0) this.x = p.x - this.w;
        else if (this.vx < 0) this.x = p.x + p.w;
        this.vx = 0;
      }
    }

    // --- 縦移動 → 縦方向の足場衝突 ---
    const preBottom = this.y + this.h;
    const preTop = this.y;
    this.y += this.vy;
    this.onGround = false;
    for (const p of platforms) {
      const hOverlap = (this.x + this.w > p.x + 4) && (this.x < p.x + p.w - 4);
      if (!hOverlap) continue;
      const overlapV = (this.y + this.h > p.y) && (this.y < p.y + p.h);
      if (!overlapV) continue;
      if (this.vy >= 0 && preBottom <= p.y + 8) {
        // 天面に着地
        this.y = p.y - this.h; this.vy = 0; this.onGround = true;
      } else if (this.vy < 0 && preTop >= p.y + p.h - 8) {
        // 頭をぶつける
        this.y = p.y + p.h; this.vy = 0;
      }
    }

    // --- 地面判定 ---
    if (this.y + this.h >= groundY) {
      this.y = groundY - this.h;
      this.vy = 0;
      this.onGround = true;
    }

    if (this.onGround) {
      if (!wasOnGround) FX.burst(this.x + this.w / 2, this.y + this.h, '#dddddd', 4, { up: 1, life: 14, grav: 0.2 });
      this.coyote = PHYS.coyoteFrames;
    }

    // タイマー類
    if (this.cd > 0) this.cd--;
    if (this.invincible > 0) this.invincible--;
    if (this.flash > 0) this.flash--;
    if (Math.abs(this.vx) > 0.5 && this.onGround) this.walkAnim += 0.3; else this.walkAnim = 0;
  }

  canAttack() { return this.cd <= 0; }
  startCooldown() { this.cd = this.curWeapon.cd; }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
}
