/* =========================================================
   obstacle.js  ステージ別テーマ障害物
   ========================================================= */
'use strict';

// 障害物の挙動分類
// fly:   横から飛んでくる（接触ダメージ）   例 カラス・自転車・バイク・名刺・コピー用紙
// fall:  空から落ちてくる（接触ダメージ）   例 受験参考書・盆栽・浮遊岩
// hazard:地面の滑る/遅くなる帯（効果のみ）  例 水たまり・縁石・囲碁石・ランドセル
// bounce:バウンドして来る（接触ダメージ）   例 部活ボール
// drain: 触れるとHP吸収                      例 闇の渦
const OBSTACLE_DEF = {
  // Stage1
  randoseru: { kind: 'hazard', effect: 'slip', w: 30, h: 22, color: '#c62828', emoji: '🎒' },
  puddle:    { kind: 'hazard', effect: 'slow', w: 60, h: 10, color: '#4fc3f7', emoji: '' },
  crow:      {
    kind: 'fly', w: 120, h: 84, color: '#212121', sprite: 'bird',
    dmg: 6, speed: 3.2, destructible: true, hp: 10,
    hitX: 10, hitY: 14, hitW: 98, hitH: 54,
  },
  // Stage2
  bike:      { kind: 'fly',  w: 44, h: 34, color: '#455a64', emoji: '🚲', dmg: 12, speed: 6 },
  ball:      { kind: 'bounce', w: 26, h: 26, color: '#ff7043', emoji: '⚽', dmg: 8 },
  sign:      { kind: 'fall', w: 30, h: 40, color: '#8d6e63', emoji: '🪧', dmg: 10 },
  // Stage3
  motorbike: { kind: 'fly',  w: 50, h: 32, color: '#37474f', emoji: '🏍️', dmg: 14, speed: 7.5 },
  book:      { kind: 'fall', w: 26, h: 30, color: '#5d4037', emoji: '📖', dmg: 9 },
  autodoor:  { kind: 'hazard', effect: 'slow', w: 16, h: 70, color: '#90caf9', emoji: '' },
  // Stage4
  paper:     { kind: 'fly',  w: 22, h: 28, color: '#fafafa', emoji: '📄', dmg: 6, speed: 5 },
  card:      { kind: 'fly',  w: 24, h: 14, color: '#eeeeee', emoji: '🃏', dmg: 9, speed: 8 },
  phone:     { kind: 'fall', w: 24, h: 24, color: '#212121', emoji: '☎️', dmg: 8 },
  // Stage5
  crowd:     { kind: 'hazard', effect: 'push', w: 40, h: 70, color: '#546e7a', emoji: '👥' },
  bag:       { kind: 'fly',  w: 30, h: 28, color: '#6d4c41', emoji: '👜', dmg: 9, speed: 5 },
  traindoor: { kind: 'hazard', effect: 'slow', w: 18, h: 80, color: '#cfd8dc', emoji: '' },
  // Stage6
  curb:      { kind: 'hazard', effect: 'slip', w: 50, h: 8, color: '#8d6e63', emoji: '' },
  bonsai:    { kind: 'fall', w: 28, h: 30, color: '#33691e', emoji: '🪴', dmg: 9 },
  goishi:    { kind: 'hazard', effect: 'slip', w: 40, h: 8, color: '#212121', emoji: '' },
  // Stage7
  firepillar:{ kind: 'eruption', w: 36, h: 90, color: '#ff5722', emoji: '🔥', dmg: 14 },
  rock:      { kind: 'fall', w: 40, h: 38, color: '#5d4037', emoji: '🪨', dmg: 12 },
  darkvortex:{ kind: 'drain', w: 44, h: 60, color: '#4a148c', emoji: '🌀', dmg: 6 },
};

class Obstacle {
  constructor(type, x, groundY) {
    const d = OBSTACLE_DEF[type];
    this.type = type; this.d = d;
    this.w = d.w; this.h = d.h;
    this.kind = d.kind; this.effect = d.effect;
    this.dead = false;
    this.t = 0;
    this.dmg = d.dmg || 0;
    this.groundY = groundY;
    this.destructible = !!d.destructible;
    this.hp = d.hp || 0;
    this.flash = 0;

    switch (d.kind) {
      case 'hazard':
        this.x = x; this.y = groundY - d.h; this.vx = 0; this.vy = 0; break;
      case 'fly':
        this.x = x; this.y = groundY - d.h - 4 - Math.random() * 60;
        this.vx = -d.speed; this.vy = 0; break;
      case 'fall':
        this.x = x; this.y = -d.h - Math.random() * 80; this.vx = 0; this.vy = 2.5 + Math.random() * 1.5; break;
      case 'bounce':
        this.x = x; this.y = groundY - d.h; this.vx = -3; this.vy = -8; break;
      case 'eruption':
        this.x = x; this.y = groundY - d.h; this.vx = 0; this.vy = 0; this.active = false; this.cycle = 100; break;
      case 'drain':
        this.x = x; this.y = groundY - d.h; this.vx = 0; this.vy = 0; break;
    }
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get hitX() { return this.x + (this.d.hitX || 0); }
  get hitY() { return this.y + (this.d.hitY || 0); }
  get hitW() { return this.d.hitW || this.w; }
  get hitH() { return this.d.hitH || this.h; }
  get hitCx() { return this.hitX + this.hitW / 2; }
  get hitCy() { return this.hitY + this.hitH / 2; }

  hurt(dmg) {
    if (!this.destructible) return;
    this.hp -= dmg;
    this.flash = 4;
    FX.damageNumber(this.cx, this.y - 4, dmg, '#fff');
    if (this.hp <= 0) { this.dead = true; FX.burst(this.cx, this.cy, '#5b5b6b', 14, { speed: 4, life: 24 }); }
    else FX.burst(this.cx, this.cy, '#fff', 3, { speed: 2, life: 10 });
  }

  update(groundY, scrollEnd) {
    this.t++;
    if (this.flash > 0) this.flash--;
    switch (this.kind) {
      case 'fly':
        this.x += this.vx; break;
      case 'fall':
        this.y += this.vy;
        if (this.y + this.h >= groundY) { this.dead = true; FX.burst(this.cx, groundY, this.d.color, 8, { life: 16 }); }
        break;
      case 'bounce':
        this.vy += 0.5; this.x += this.vx; this.y += this.vy;
        if (this.y + this.h >= groundY) { this.y = groundY - this.h; this.vy = -8.5; }
        break;
      case 'eruption':
        this.cycle--;
        if (this.cycle <= 0) { this.active = !this.active; this.cycle = this.active ? 50 : 120; }
        break;
    }
    // 画面左へ流れ切ったら除去（fly/bounce）
    if ((this.kind === 'fly' || this.kind === 'bounce') && this.x < scrollEnd - 200) this.dead = true;
  }

  // 当たり判定で有効か（eruptionは噴出中のみ）
  get solid() {
    if (this.kind === 'eruption') return this.active;
    return true;
  }
}
