/* =========================================================
   renderer.js  背景パララックス + キャラ + 敵 + 障害物 + エフェクト
   論理座標 GAME.W×GAME.H で描画。カメラXは main から渡される。
   ========================================================= */
'use strict';

const Renderer = {
  ctx: null,
  assets: {},
  init(ctx) { this.ctx = ctx; },

  // 画像/SVGアセットを読み込む（転用PNG＋自作SVG）
  loadAssets() {
    const files = {
      bird: 'images/bird.png',
      grass: 'images/plat-grass.svg',
      pipe: 'images/plat-pipe.svg',
      crate: 'images/plat-crate.svg',
      stone: 'images/plat-stone.svg',
      desk: 'images/plat-desk.svg',
      bench: 'images/plat-bench.svg',
      rock: 'images/plat-rock.svg',
    };
    for (const k in files) {
      const img = new Image();
      img.src = files[k];
      this.assets[k] = img;
    }
  },

  _ready(img) { return img && img.complete && img.naturalWidth > 0; },

  // 乗れる足場
  drawPlatform(p) {
    const ctx = this.ctx;
    const img = this.assets[p.skin];
    if (this._ready(img)) {
      ctx.drawImage(img, p.x, p.y, p.w, p.h);
    } else {
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(p.x, p.y, p.w, 5);
    }
  },

  groundY() { return GAME.H * GAME.GROUND_RATIO; },

  // ===== 背景（3層パララックス） =====
  drawBackground(stage, camX, t) {
    const ctx = this.ctx, W = GAME.W, H = GAME.H, gy = this.groundY();

    // 空グラデ
    const g = ctx.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, stage.sky);
    g.addColorStop(1, this._lighten(stage.sky, 30));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, gy);

    // ステージ別 遠景
    this._decor(stage, camX, t, gy);

    // 地面
    ctx.fillStyle = stage.ground;
    ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, gy, W, 4);
    // 地面の流れる目印
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    const off = (-camX * 1) % 60;
    for (let x = off; x < W; x += 60) ctx.fillRect(x, gy + 18, 30, 5);
  },

  _decor(stage, camX, t, gy) {
    const ctx = this.ctx, W = GAME.W;
    const p1 = -camX * 0.2, p2 = -camX * 0.45, p3 = -camX * 0.7;
    switch (stage.decor) {
      case 'school': {
        // 入道雲
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let i = 0; i < 6; i++) {
          const x = ((i * 260 + p1) % (W + 300)) - 150;
          this._cloud(x, 60 + (i % 2) * 30, 40);
        }
        // 住宅屋根シルエット
        ctx.fillStyle = 'rgba(120,90,70,0.5)';
        for (let i = 0; i < 8; i++) {
          const x = ((i * 160 + p2) % (W + 200)) - 100;
          ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + 45, gy - 50); ctx.lineTo(x + 90, gy); ctx.fill();
        }
        // 電柱
        this._poles(p3, gy, 'rgba(60,60,60,0.6)');
        break;
      }
      case 'sunset': {
        // 夕日
        ctx.fillStyle = 'rgba(255,220,120,0.9)';
        ctx.beginPath(); ctx.arc(W * 0.7, gy - 120, 70, 0, Math.PI * 2); ctx.fill();
        // フェンス
        ctx.strokeStyle = 'rgba(40,40,40,0.5)'; ctx.lineWidth = 3;
        for (let x = (p2 % 28); x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, gy - 60); ctx.lineTo(x, gy); ctx.stroke(); }
        this._streetLights(p3, gy);
        break;
      }
      case 'night_city': {
        // 星
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < 30; i++) { const x = (i * 97) % W, y = (i * 53) % (gy - 80); ctx.fillRect(x, y, 2, 2); }
        // ビルシルエット + 窓
        for (let i = 0; i < 10; i++) {
          const x = ((i * 150 + p2) % (W + 200)) - 100;
          const h = 90 + (i % 3) * 50, w = 70;
          ctx.fillStyle = 'rgba(20,25,45,0.8)'; ctx.fillRect(x, gy - h, w, h);
          ctx.fillStyle = 'rgba(255,230,120,0.6)';
          for (let wy = gy - h + 10; wy < gy - 10; wy += 18)
            for (let wx = x + 8; wx < x + w - 8; wx += 16)
              if ((wx + wy) % 3 === 0) ctx.fillRect(wx, wy, 7, 9);
        }
        this._streetLights(p3, gy);
        break;
      }
      case 'office': {
        for (let i = 0; i < 8; i++) {
          const x = ((i * 130 + p2) % (W + 200)) - 100;
          const h = 140 + (i % 2) * 40;
          ctx.fillStyle = 'rgba(30,30,40,0.9)'; ctx.fillRect(x, gy - h, 90, h);
          ctx.fillStyle = 'rgba(120,180,255,0.5)';
          for (let wy = gy - h + 12; wy < gy - 14; wy += 22)
            for (let wx = x + 10; wx < x + 80; wx += 20)
              ctx.fillRect(wx, wy, 11, 13);
        }
        break;
      }
      case 'station': {
        // 電車シルエット
        ctx.fillStyle = 'rgba(60,70,90,0.85)';
        const tx = ((p2 * 1.5) % (W + 400)) - 200;
        ctx.fillRect(tx, gy - 90, 360, 80);
        ctx.fillStyle = 'rgba(180,220,255,0.5)';
        for (let i = 0; i < 8; i++) ctx.fillRect(tx + 20 + i * 42, gy - 75, 28, 34);
        // 吊り広告
        ctx.fillStyle = 'rgba(230,230,230,0.4)';
        for (let i = 0; i < 6; i++) { const x = ((i * 150 + p1) % (W + 200)) - 100; ctx.fillRect(x, 30, 50, 34); }
        // 黄色い線
        ctx.fillStyle = '#ffd54f'; ctx.fillRect(0, gy - 6, W, 5);
        break;
      }
      case 'engawa': {
        // 松の木
        for (let i = 0; i < 6; i++) {
          const x = ((i * 200 + p2) % (W + 250)) - 120;
          ctx.fillStyle = 'rgba(60,40,20,0.7)'; ctx.fillRect(x + 18, gy - 70, 10, 70);
          ctx.fillStyle = 'rgba(30,80,30,0.7)';
          ctx.beginPath(); ctx.arc(x + 23, gy - 80, 34, 0, Math.PI * 2); ctx.fill();
        }
        // 庭石
        ctx.fillStyle = 'rgba(90,90,90,0.5)';
        for (let i = 0; i < 8; i++) { const x = ((i * 120 + p3) % (W + 150)) - 80; ctx.beginPath(); ctx.ellipse(x, gy - 8, 24, 12, 0, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'final': {
        // 魔方陣の光・炎の柱・崩れた柱
        ctx.fillStyle = 'rgba(255,80,30,0.25)';
        for (let i = 0; i < 5; i++) {
          const x = ((i * 200 + p1) % (W + 250)) - 120;
          const flick = 0.6 + 0.4 * Math.sin(t * 0.1 + i);
          ctx.globalAlpha = flick;
          ctx.fillRect(x, gy - 130, 24, 130);
          ctx.globalAlpha = 1;
        }
        // 崩れた柱
        ctx.fillStyle = 'rgba(50,40,40,0.8)';
        for (let i = 0; i < 6; i++) { const x = ((i * 160 + p2) % (W + 200)) - 100; ctx.fillRect(x, gy - 100, 30, 100); ctx.fillRect(x - 6, gy - 100, 42, 10); }
        // 魔方陣
        ctx.strokeStyle = 'rgba(255,40,40,0.4)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(W / 2, gy - 30, 80 + 6 * Math.sin(t * 0.08), 0, Math.PI * 2); ctx.stroke();
        break;
      }
    }
  },

  _cloud(x, y, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r, y + 6, r * 0.8, 0, Math.PI * 2);
    ctx.arc(x - r, y + 8, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 0.4, y - r * 0.5, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  },
  _poles(p, gy, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 220 + p) % (GAME.W + 250)) - 120;
      ctx.fillRect(x, gy - 110, 8, 110);
      ctx.fillRect(x - 14, gy - 100, 36, 6);
    }
  },
  _streetLights(p, gy) {
    const ctx = this.ctx;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 230 + p) % (GAME.W + 250)) - 120;
      ctx.fillStyle = 'rgba(40,40,40,0.7)'; ctx.fillRect(x, gy - 120, 6, 120);
      ctx.fillStyle = 'rgba(255,235,150,0.8)'; ctx.beginPath(); ctx.arc(x + 3, gy - 122, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,235,150,0.12)'; ctx.beginPath(); ctx.arc(x + 3, gy - 100, 40, 0, Math.PI * 2); ctx.fill();
    }
  },

  // ===== プレイヤー（外見はステージで変化） =====
  drawPlayer(p, stageN) {
    const ctx = this.ctx;
    const x = p.x, y = p.y, w = p.w, h = p.h;
    ctx.save();
    if (p.invincible > 0 && Math.floor(p.invincible / 4) % 2 === 0) ctx.globalAlpha = 0.4;
    if (p.flash > 0) ctx.filter = 'brightness(3)';

    // 反転
    const cxp = x + w / 2;
    ctx.translate(cxp, 0);
    ctx.scale(p.facing, 1);
    ctx.translate(-cxp, 0);

    const bob = Math.sin(p.walkAnim) * 2;
    this._drawHero(ctx, x, y + bob, w, h, stageN);
    this._drawHeldWeapon(ctx, p.curWeapon, x, y + bob, w, h);

    ctx.restore();
    ctx.filter = 'none'; ctx.globalAlpha = 1;
  },

  _drawHeldWeapon(ctx, weapon, x, y, w, h) {
    if (!weapon) return;
    const hx = x + w + 2;
    const hy = y + 28;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.lineCap = 'round';
    switch (weapon.id) {
      case 'eraser':
        this._roundRect(-10, -6, 20, 12, 3, '#f48fb1');
        ctx.fillStyle = '#fff'; ctx.fillRect(-10, -1, 20, 4);
        break;
      case 'ruler':
        this._roundRect(-14, -3, 28, 6, 2, '#42a5f5');
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let i = -10; i <= 10; i += 4) ctx.fillRect(i, -3, 1, 3);
        break;
      case 'compass':
        ctx.strokeStyle = '#26c6da'; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(-6, -7); ctx.lineTo(0, 8); ctx.lineTo(6, -7); ctx.stroke();
        break;
      case 'bat':
        this._roundRect(-4, -11, 8, 22, 4, '#a1672f');
        break;
      case 'stapler':
        ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-6, -4); ctx.lineTo(6, -4); ctx.lineTo(6, 5); ctx.stroke();
        break;
      case 'golf':
        ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 8); ctx.lineTo(8, 8); ctx.stroke();
        break;
      case 'cane':
        ctx.strokeStyle = '#ab47bc'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 8); ctx.stroke();
        ctx.fillStyle = '#ce93d8'; ctx.beginPath(); ctx.arc(0, -10, 3, 0, Math.PI * 2); ctx.fill();
        break;
      case 'sword':
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(-1.5, -11, 3, 18);
        ctx.fillRect(-6, 5, 12, 2.6);
        break;
    }
    ctx.restore();
  },

  _drawHero(ctx, x, y, w, h, stageN) {
    const cx = x + w / 2;
    const skin = '#ffcc80';
    // appearance 別パレット
    const P = [
      { body: '#e53935', legs: '#1565c0', hair: '#3e2723', acc: '#c62828' }, // 小学生:赤帽・ランドセル
      { body: '#1a237e', legs: '#263238', hair: '#212121', acc: '#fff' },     // 中学生:学生服
      { body: '#212121', legs: '#212121', hair: '#212121', acc: '#5d4037' },  // 高校生:学ラン
      { body: '#37474f', legs: '#263238', hair: '#212121', acc: '#b71c1c' },  // 社会人:スーツ・赤ネクタイ
      { body: '#6d4c41', legs: '#4e342e', hair: '#9e9e9e', acc: '#3e2723' },  // おじさん:くたびれ
      { body: '#5d4037', legs: '#3e2723', hair: '#eeeeee', acc: '#8d6e63' },  // おじいさん:和服
      { body: '#cfd8dc', legs: '#90a4ae', hair: '#3e2723', acc: '#ffd54f' },  // 勇者:鎧
    ][stageN - 1] || { body: '#e53935', legs: '#1565c0', hair: '#3e2723', acc: '#c62828' };

    // 脚
    ctx.fillStyle = P.legs;
    ctx.fillRect(x + 6, y + h - 16, 9, 16);
    ctx.fillRect(x + w - 15, y + h - 16, 9, 16);
    // 胴
    ctx.fillStyle = P.body;
    ctx.fillRect(x + 4, y + 16, w - 8, h - 30);
    // 頭
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(cx, y + 12, 11, 0, Math.PI * 2); ctx.fill();
    // 髪
    ctx.fillStyle = P.hair;
    ctx.beginPath(); ctx.arc(cx, y + 9, 11, Math.PI, Math.PI * 2); ctx.fill();
    // 目
    ctx.fillStyle = '#212121';
    ctx.fillRect(cx + 2, y + 11, 3, 3);

    // ステージ固有アクセサリ
    if (stageN === 1) { // ランドセル + 赤帽
      ctx.fillStyle = P.acc; ctx.fillRect(x - 2, y + 18, 7, 20);
      ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.arc(cx, y + 5, 12, Math.PI, Math.PI * 2); ctx.fill();
    } else if (stageN === 2) { // 学生服の白ライン
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 4, y + 16, w - 8, 3);
    } else if (stageN === 4) { // ネクタイ
      ctx.fillStyle = P.acc; ctx.fillRect(cx - 2, y + 17, 4, 14);
    } else if (stageN === 5) { // メタボ体型
      ctx.fillStyle = P.body; ctx.beginPath(); ctx.ellipse(cx, y + 30, w / 2, 14, 0, 0, Math.PI * 2); ctx.fill();
    } else if (stageN === 6) { // 杖
      ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + w + 2, y + 14); ctx.lineTo(x + w + 2, y + h); ctx.stroke();
    } else if (stageN === 7) { // マント + 兜
      ctx.fillStyle = '#c62828'; ctx.beginPath();
      ctx.moveTo(x + 2, y + 16); ctx.lineTo(x - 8, y + h - 4); ctx.lineTo(x + 8, y + h - 4); ctx.fill();
      ctx.fillStyle = '#ffd54f'; ctx.fillRect(cx - 11, y + 2, 22, 5);
    }
  },

  // ===== 敵 =====
  drawEnemy(e) {
    const ctx = this.ctx;
    ctx.save();
    if (e.flash > 0) ctx.filter = 'brightness(3)';
    const bob = Math.sin(e.anim) * 2;
    const stageN = e.stageN || 1;
    const bodyByStage = ['#616161', '#455a64', '#37474f', '#546e7a', '#6d4c41', '#8d6e63', '#5d4037'];
    ctx.fillStyle = bodyByStage[stageN - 1] || '#6a1b9a';
    ctx.fillRect(e.x, e.y + bob, e.w, e.h);
    // 世界観寄せのアクセサリ
    if (stageN <= 2) {
      ctx.fillStyle = '#212121';
      ctx.fillRect(e.x + 5, e.y + 9 + bob, e.w - 10, 3);
    } else if (stageN === 3) {
      ctx.fillStyle = '#ffa726';
      ctx.fillRect(e.x + 3, e.y + 16 + bob, e.w - 6, 3);
    } else if (stageN === 4 || stageN === 5) {
      ctx.fillStyle = '#ef5350';
      ctx.fillRect(e.x + e.w / 2 - 2, e.y + 12 + bob, 4, 11);
    } else if (stageN === 6) {
      ctx.strokeStyle = '#d7ccc8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x + e.w / 2, e.y + 12 + bob, 9, Math.PI, Math.PI * 2); ctx.stroke();
    } else {
      ctx.strokeStyle = '#ffcc80'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(e.x + 4, e.y + e.h - 6 + bob); ctx.lineTo(e.x + e.w - 4, e.y + e.h - 6 + bob); ctx.stroke();
    }
    // 目
    ctx.fillStyle = '#fff';
    ctx.fillRect(e.x + 6, e.y + 10 + bob, 6, 6);
    ctx.fillRect(e.x + e.w - 12, e.y + 10 + bob, 6, 6);
    ctx.fillStyle = '#263238';
    ctx.fillRect(e.x + 8, e.y + 12 + bob, 3, 3);
    ctx.fillRect(e.x + e.w - 10, e.y + 12 + bob, 3, 3);
    ctx.filter = 'none';
    // HPバー
    if (e.hp < e.maxHp) this._hpbar(e.x, e.y - 8 + bob, e.w, e.hp / e.maxHp, '#ff5252');
    ctx.restore();
  },

  // ===== ボス =====
  drawBoss(b, stageN) {
    const ctx = this.ctx;
    ctx.save();
    if (b.flash > 0) ctx.filter = 'brightness(3)';
    const bob = Math.sin(b.anim * 4) * 3;
    const col = b.enraged ? '#b71c1c' : '#311b92';
    // 体
    ctx.fillStyle = col;
    ctx.fillRect(b.x, b.y + bob, b.w, b.h);
    // 顔
    ctx.fillStyle = '#ffccbc';
    ctx.beginPath(); ctx.arc(b.cx, b.y + 26 + bob, 22, 0, Math.PI * 2); ctx.fill();
    // 目
    ctx.fillStyle = b.enraged ? '#ff1744' : '#212121';
    ctx.fillRect(b.cx - 12, b.y + 22 + bob, 8, 6);
    ctx.fillRect(b.cx + 4, b.y + 22 + bob, 8, 6);
    // 口
    ctx.fillStyle = '#5d0000';
    ctx.fillRect(b.cx - 10, b.y + 36 + bob, 20, 5);
    this._drawBossAccessory(ctx, b, stageN, bob);
    ctx.filter = 'none';
    ctx.restore();

    // ボス弾
    for (const bl of b.bullets) {
      ctx.fillStyle = '#ff5252';
      ctx.beginPath(); ctx.arc(bl.x, bl.y, bl.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3e0';
      ctx.beginPath(); ctx.arc(bl.x, bl.y, bl.r * 0.4, 0, Math.PI * 2); ctx.fill();
    }
  },

  _drawBossAccessory(ctx, b, stageN, bob) {
    switch (stageN) {
      case 1: // 学級委員: 腕章
        ctx.fillStyle = '#e53935';
        ctx.fillRect(b.x + b.w - 24, b.y + 48 + bob, 16, 7);
        break;
      case 2: // 先輩: 制服ライン
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(b.x + 10, b.y + 50 + bob, b.w - 20, 4);
        break;
      case 3: // 番長: リーゼント
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.moveTo(b.cx - 24, b.y + 12 + bob);
        ctx.lineTo(b.cx + 24, b.y + 8 + bob);
        ctx.lineTo(b.cx + 18, b.y + 22 + bob);
        ctx.lineTo(b.cx - 18, b.y + 20 + bob);
        ctx.closePath();
        ctx.fill();
        break;
      case 4: // 上司: スーツのネクタイ
        ctx.fillStyle = '#b71c1c';
        ctx.fillRect(b.cx - 3, b.y + 52 + bob, 6, 24);
        break;
      case 5: // 部長: 貫禄バッジ
        ctx.fillStyle = '#ffd54f';
        ctx.beginPath(); ctx.arc(b.cx + 18, b.y + 56 + bob, 6, 0, Math.PI * 2); ctx.fill();
        break;
      case 6: // 仙人: 白ひげ
        ctx.fillStyle = '#f5f5f5';
        ctx.beginPath();
        ctx.ellipse(b.cx, b.y + 50 + bob, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 7: // 魔王: 禍々しい角
        ctx.fillStyle = '#4a148c';
        ctx.beginPath();
        ctx.moveTo(b.cx - 26, b.y + 18 + bob); ctx.lineTo(b.cx - 14, b.y - 10 + bob); ctx.lineTo(b.cx - 8, b.y + 18 + bob);
        ctx.moveTo(b.cx + 26, b.y + 18 + bob); ctx.lineTo(b.cx + 14, b.y - 10 + bob); ctx.lineTo(b.cx + 8, b.y + 18 + bob);
        ctx.fill();
        break;
    }
  },

  // ===== 障害物 =====
  drawObstacle(o) {
    const ctx = this.ctx;
    if (o.kind === 'eruption' && !o.active) {
      // 待機中：地面に予兆
      ctx.fillStyle = 'rgba(255,87,34,0.3)';
      ctx.fillRect(o.x, o.groundY - 4, o.w, 4);
      return;
    }
    if (o.effect === 'slow' || o.effect === 'slip') {
      ctx.fillStyle = o.d.color;
      ctx.globalAlpha = (o.effect === 'slow') ? 0.5 : 0.85;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.globalAlpha = 1;
      if (o.d.emoji) this._emoji(o.d.emoji, o.cx, o.cy, o.w);
      return;
    }
    // スプライト画像（カラス等）
    if (o.d.sprite) {
      const img = this.assets[o.d.sprite];
      if (this._ready(img)) {
        ctx.save();
        if (o.flash > 0) ctx.filter = 'brightness(3)';
        const flap = Math.sin(o.t * 0.3) * 3; // 羽ばたきの上下
        // 進行方向（左移動）に合わせて左向きに反転
        if ((o.vx || 0) < 0) {
          ctx.translate(o.x + o.w, o.y + flap);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, o.w, o.h);
        } else {
          ctx.drawImage(img, o.x, o.y + flap, o.w, o.h);
        }
        ctx.restore();
        return;
      }
    }
    ctx.fillStyle = o.d.color;
    ctx.fillRect(o.x, o.y, o.w, o.h);
    if (o.d.emoji) this._emoji(o.d.emoji, o.cx, o.cy, Math.max(o.w, o.h));
  },

  _emoji(em, cx, cy, size) {
    const ctx = this.ctx;
    ctx.font = `${Math.min(34, size)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(em, cx, cy);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  },

  // ===== 発射体（武器ごとに"実物の形"で描き分け） =====
  drawProjectile(pr) {
    const ctx = this.ctx;
    const id = pr.w.id;
    // 進行方向の角度（飛ぶ武器用）
    const moving = (pr.vx || pr.vy);
    const ang = moving ? Math.atan2(pr.vy, pr.vx) : (pr.dir > 0 ? 0 : Math.PI);
    ctx.save();
    ctx.translate(pr.x, pr.y);

    switch (id) {
      case 'eraser': {
        // 消しゴム：振り抜きの白い弧 ＋ ピンクの消しゴム本体
        const k = 1 - pr.life / 8;
        ctx.save(); ctx.scale(pr.dir, 1);
        // スイング弧
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(-6, 0, 20, -0.9 + k, 0.9 + k); ctx.stroke();
        // 消しゴム本体（角丸の箱・白帯）
        ctx.translate(6, 0); ctx.rotate(-0.5 + k);
        this._roundRect(-13, -8, 26, 16, 4, '#f48fb1');
        ctx.fillStyle = '#fff'; ctx.fillRect(-13, -2, 26, 5);
        ctx.strokeStyle = '#ad5a78'; ctx.lineWidth = 1.5; ctx.strokeRect(-13, -8, 26, 16);
        ctx.restore();
        break;
      }
      case 'ruler': {
        // 定規：長い目盛り付きバー
        ctx.rotate(ang);
        this._roundRect(-22, -5, 44, 10, 2, '#42a5f5');
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (let i = -18; i <= 18; i += 6) ctx.fillRect(i, -5, 1.5, 4);
        ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 1; ctx.strokeRect(-22, -5, 44, 10);
        break;
      }
      case 'compass': {
        // コンパス：鋭い針＋脚
        ctx.rotate(ang);
        ctx.fillStyle = '#26c6da';
        ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -7); ctx.lineTo(-6, 0); ctx.lineTo(-10, 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-8, 0, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(38,198,218,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-16, -8); ctx.stroke();
        break;
      }
      case 'stapler': {
        // ホッチキス弾：小さな金属の「コ」字
        ctx.rotate(ang);
        ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(-5, -5); ctx.lineTo(5, -5); ctx.lineTo(5, 5); ctx.stroke();
        break;
      }
      case 'bat': {
        // 野球バット：振り回す木製バット＋スイング弧
        const k = 1 - pr.life / 12;
        ctx.globalAlpha = Math.max(0, pr.life / 12);
        ctx.strokeStyle = 'rgba(255,167,38,0.5)'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(0, 0, pr.size * 0.8, -1.4 + k * 2.8, -0.2 + k * 2.8); ctx.stroke();
        ctx.save(); ctx.rotate(-0.8 + k * 2.6);
        ctx.fillStyle = '#a1672f';
        this._roundRect(8, -6, pr.size * 0.7, 12, 6, '#a1672f');
        ctx.fillStyle = '#7a4a21'; ctx.fillRect(8, -3, 14, 6);
        ctx.restore();
        break;
      }
      case 'golf': {
        // ゴルフ：地を這う緑の衝撃波
        ctx.globalAlpha = 0.85;
        const grd = ctx.createLinearGradient(0, -pr.size, 0, pr.size);
        grd.addColorStop(0, 'rgba(150,255,150,0.2)'); grd.addColorStop(1, '#66bb6a');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.ellipse(0, 0, pr.size, pr.size * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2; ctx.stroke();
        break;
      }
      case 'cane': {
        // 仙人の杖：追尾する光球＋星
        ctx.rotate(pr.life * 0.2);
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
        g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#ce93d8'); g.addColorStop(1, 'rgba(171,71,188,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        this._star(0, 0, 5, 7, 3);
        break;
      }
      case 'sword': {
        // 勇者の剣：金色の大斬撃
        ctx.globalAlpha = Math.max(0, pr.life / 14);
        ctx.rotate(ang);
        const grd = ctx.createLinearGradient(0, -pr.size, 0, pr.size);
        grd.addColorStop(0, 'rgba(255,255,255,0.9)'); grd.addColorStop(0.5, '#ffd54f'); grd.addColorStop(1, 'rgba(255,213,79,0)');
        ctx.strokeStyle = grd; ctx.lineWidth = 14; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, pr.size * 0.7, -1.2, 1.2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, pr.size * 0.7, -1.2, 1.2); ctx.stroke();
        break;
      }
      default: {
        ctx.fillStyle = pr.color;
        ctx.beginPath(); ctx.arc(0, 0, pr.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  },

  _roundRect(x, y, w, h, r, fill) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  },

  _star(cx, cy, r1, r2, n) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? r2 : r1;
      const a = (Math.PI * i) / n - Math.PI / 2;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  },

  // ===== エフェクト（パーティクル・ダメージ数値） =====
  drawEffects() {
    const ctx = this.ctx;
    for (const p of FX.particles) {
      const a = p.life / p.maxLife;
      ctx.globalAlpha = p.twinkle ? a * (0.5 + 0.5 * Math.sin(p.life)) : a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    for (const d of FX.damageNumbers) {
      ctx.globalAlpha = Math.min(1, d.life / 30);
      ctx.fillStyle = d.color;
      ctx.fillText(d.value, d.x, d.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  },

  drawFlash() {
    if (FX.flash <= 0) return;
    const ctx = this.ctx;
    ctx.globalAlpha = Math.min(1, FX.flash);
    ctx.fillStyle = FX.flashColor;
    ctx.fillRect(0, 0, GAME.W, GAME.H);
    ctx.globalAlpha = 1;
  },

  _hpbar(x, y, w, ratio, color) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, ratio), 4);
  },

  _lighten(hex, amt) {
    const c = hex.replace('#', '');
    let r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    r = Math.min(255, r + amt); g = Math.min(255, g + amt); b = Math.min(255, b + amt);
    return `rgb(${r},${g},${b})`;
  },
};
