/* =========================================================
   main.js  状態機械 + ゲームループ + 当たり判定 + 進行制御
   ========================================================= */
'use strict';

const STATE = { TITLE: 'TITLE', PLAYING: 'PLAYING', NEGOTIATION: 'NEGOTIATION',
  PAUSED: 'PAUSED', GAMEOVER: 'GAMEOVER', ENDING: 'ENDING' };

const Game = {
  state: STATE.TITLE,
  stageIdx: 0,
  player: null,
  enemies: [], obstacles: [], projectiles: [], pickups: [], platforms: [],
  boss: null,
  bossPhase: 'none',     // none | warned | negotiating | fighting | defeated
  camX: 0,
  killCount: 0,
  enemyTimer: 0,
  obstacleTimer: 0,
  t: 0,
  titleT: 0,
  bossTriggered: false,

  // ---- 初期化（init.jsから1回） ----
  boot() {
    this.player = new Player();
    this.state = STATE.TITLE;
    this.startTitleParticles();
  },

  startTitleParticles() { FX.clear(); },

  // ---- タイトルから開始 ----
  startGame() {
    this.player = new Player();
    this.stageIdx = 0;
    this.killCount = 0;
    UI.hide('titleScreen');
    UI.hide('gameoverScreen');
    UI.hide('endingScreen');
    this.startStage(0);
  },

  // ---- コンティニュー（武器引き継ぎ・直前ステージ頭から） ----
  continueGame() {
    const keepWeapons = this.player.weapons.slice();
    const keepIdx = this.player.weaponIdx;
    this.player = new Player();
    this.player.weapons = keepWeapons;
    this.player.weaponIdx = Math.min(keepIdx, keepWeapons.length - 1);
    UI.hide('gameoverScreen');
    this.startStage(this.stageIdx);
  },

  startStage(idx) {
    this.stageIdx = idx;
    const stage = STAGES[idx];
    this.player.reset();
    this.player.hp = this.player.maxHp;
    this.player.x = 80;
    this.player.y = Renderer.groundY() - this.player.h;
    this.enemies.length = 0;
    this.obstacles.length = 0;
    this.projectiles.length = 0;
    this.pickups.length = 0;
    this.platforms = this.buildPlatforms(stage);
    this.seedPlatformPickups(this.platforms);
    this.boss = null;
    this.bossPhase = 'none';
    this.bossTriggered = false;
    this.camX = 0;
    this.enemyTimer = stage.enemyInterval;
    this.obstacleTimer = 90;
    FX.clear();
    Audio2.playBgm(stage.bgm);
    UI.showStageBanner(stage);
    this.state = STATE.PLAYING;
  },

  get stage() { return STAGES[this.stageIdx]; },

  // 乗れる足場を生成（世界観スキン・ジャンプで届く高さ）
  buildPlatforms(stage) {
    const gy = Renderer.groundY();
    const skins = STAGE_PLATFORMS[stage.n] || ['stone'];
    const byStage = {
      1: { floatingChance: 0.38, minGap: 130, maxGap: 190, minLift: 26, maxLift: 74, clusterChance: 0.46, clusterGapMin: 58, clusterGapMax: 92, stepDelta: 18 },
      2: { floatingChance: 0.58, minGap: 170, maxGap: 248, minLift: 44, maxLift: 102, clusterChance: 0.35, clusterGapMin: 76, clusterGapMax: 124, stepDelta: 26 },
      3: { floatingChance: 0.74, minGap: 208, maxGap: 300, minLift: 70, maxLift: 130, clusterChance: 0.24, clusterGapMin: 94, clusterGapMax: 152, stepDelta: 34 },
    };
    const fallback = {
      floatingChance: Math.min(0.8, 0.62 + stage.n * 0.03),
      minGap: 200 + stage.n * 8,
      maxGap: 300 + stage.n * 10,
      minLift: Math.min(94, 52 + stage.n * 3),
      maxLift: Math.min(136, 104 + stage.n * 4),
      clusterChance: Math.max(0.12, 0.28 - stage.n * 0.02),
      clusterGapMin: 90,
      clusterGapMax: 148,
      stepDelta: 30,
    };
    const profile = byStage[stage.n] || fallback;
    const plats = [];
    let x = 620;
    const end = stage.length - 720; // ボス出現域は空ける
    const r = (min, max) => min + Math.random() * (max - min);

    while (x < end) {
      const skin = skins[Math.floor(Math.random() * skins.length)];
      const s = PLATFORM_SKINS[skin];
      // 1面→3面で徐々に「高さ・間隔・段差」の難易度を上げる
      const floating = Math.random() < profile.floatingChance;
      const lift = floating ? r(profile.minLift, profile.maxLift) : 0;
      const y = gy - s.h - lift;
      plats.push({ x: Math.round(x), y: Math.round(y), w: s.w, h: s.h, skin });

      // 2連足場を混ぜて、走るだけでなく跳び移りの選択を増やす
      if (Math.random() < profile.clusterChance) {
        const nx = x + s.w + r(profile.clusterGapMin, profile.clusterGapMax);
        if (nx < end) {
          const skin2 = skins[Math.floor(Math.random() * skins.length)];
          const s2 = PLATFORM_SKINS[skin2];
          const step = (Math.random() * 2 - 1) * profile.stepDelta;
          const lift2 = Math.max(0, Math.min(132, lift + step));
          const y2 = gy - s2.h - lift2;
          plats.push({ x: Math.round(nx), y: Math.round(y2), w: s2.w, h: s2.h, skin: skin2 });
          x = nx;
        }
      }

      x += s.w + r(profile.minGap, profile.maxGap);
    }
    return plats;
  },

  // 足場の上に回復ハートを置いて「登る意味」を作る
  seedPlatformPickups(platforms) {
    if (!Array.isArray(platforms) || platforms.length === 0) return;
    const count = Math.min(7, Math.max(3, Math.floor(platforms.length * 0.2)));
    const used = new Set();
    for (let i = 0; i < count; i++) {
      let tries = 0;
      while (tries < 24) {
        tries++;
        const idx = Math.floor(Math.random() * platforms.length);
        if (used.has(idx)) continue;
        const p = platforms[idx];
        // 地面に近い足場には置かず、ジャンプして取りに行く配置を優先
        if (Renderer.groundY() - (p.y + p.h) < 36) continue;
        used.add(idx);
        this.pickups.push({
          x: p.x + p.w / 2 - 11,
          y: p.y - 30,
          w: 22,
          h: 22,
          vy: 0,
          type: 'platformHeal',
          heal: 18,
          t: Math.floor(Math.random() * 30),
          platformBound: true,
        });
        break;
      }
    }
  },

  // ============== メインループ ==============
  update() {
    this.t++;
    FX.update();
    UI.tick();

    switch (this.state) {
      case STATE.TITLE: this.updateTitle(); break;
      case STATE.PLAYING: this.updatePlaying(); break;
      case STATE.NEGOTIATION: /* DOM操作待ち */ break;
      case STATE.PAUSED:
        if (Input.startPressed) { this.state = STATE.PLAYING; UI.hide('pauseScreen'); }
        break;
      case STATE.GAMEOVER: break;
      case STATE.ENDING: this.updateEnding(); break;
    }
    Input.endFrame();
  },

  updateTitle() {
    this.titleT++;
    // 漂う粒
    if (this.t % 4 === 0) FX.ambient(Math.random() * GAME.W, GAME.H, ['#fff', '#ffd54f', '#90caf9'][Math.floor(Math.random() * 3)], 160);
  },

  updatePlaying() {
    const stage = this.stage;
    const gy = Renderer.groundY();

    // ポーズ
    if (Input.startPressed) { this.state = STATE.PAUSED; UI.show('pauseScreen'); return; }

    // 武器切替
    if (Input.selectPressed) {
      const w = this.player.cycleWeapon();
      if (w) UI.showWeaponFlash(w);
    }

    // プレイヤー更新
    this.player.update(gy, stage.length, this.platforms);

    // 攻撃
    if (Input.attack && this.player.canAttack()) {
      const shots = WeaponSystem.fire(this.player);
      shots.forEach(s => this.projectiles.push(s));
      this.player.startCooldown();
    }

    // カメラ（補間）
    const targetCam = Math.max(0, Math.min(stage.length - GAME.W, this.player.x - GAME.W * 0.35));
    this.camX += (targetCam - this.camX) * PHYS.cameraLerp;

    // 敵スポーン（ボス未出現時のみ）
    if (this.bossPhase === 'none') {
      const progress = Math.max(0, Math.min(1, this.player.x / stage.length));
      this.enemyTimer--;
      if (this.enemyTimer <= 0 && this.enemies.length < this.enemyCap(stage, progress)) {
        this.enemyTimer = this.nextEnemyInterval(stage, progress);
        const fromBehind = stage.n >= 2 && progress > 0.45 && Math.random() < (0.09 + stage.n * 0.01);
        const sx = fromBehind ? Math.max(20, this.camX - 60) : this.camX + GAME.W + 20;
        if (sx < stage.length) this.enemies.push(new Enemy(sx, gy, stage.n));
      }
      // 障害物スポーン
      this.obstacleTimer--;
      if (this.obstacleTimer <= 0) {
        this.obstacleTimer = 70 + Math.floor(Math.random() * 70);
        const type = stage.obstacles[Math.floor(Math.random() * stage.obstacles.length)];
        const ox = this.camX + GAME.W + 30;
        this.obstacles.push(new Obstacle(type, ox, gy));
      }
    }

    // ボストリガー（ステージ終端付近）
    if (!this.bossTriggered && this.player.x > stage.length - 600) {
      this.bossTriggered = true;
      this.bossPhase = 'warned';
      UI.showWarning();
      Audio2.sfx('damage');
      // 1.6秒後に交渉ダイアログ
      setTimeout(() => this.openNegotiation(), 1600);
    }

    this.updateEnemies(gy);
    this.updateObstacles(gy);
    this.updateProjectiles(gy);
    this.updatePickups();
    if (this.boss) this.updateBoss(gy);

    // 死亡
    if (this.player.hp <= 0) this.gameOver();
  },

  nextEnemyInterval(stage, progress) {
    const ramp = Math.min(0.58, progress * 0.44 + (stage.n - 1) * 0.045);
    const base = stage.enemyInterval * (1 - ramp);
    const jitter = 8 + Math.random() * 14;
    return Math.max(24, Math.round(base + jitter));
  },

  enemyCap(stage, progress) {
    let cap = stage.enemyMax;
    if (progress > 0.35) cap += 1;
    if (progress > 0.72) cap += 1;
    if (stage.n >= 3) cap += 1;
    return Math.min(13, cap);
  },

  updateEnemies(gy) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(this.player, gy);
      // プレイヤー接触
      if (!e.dead && this.aabb(this.player, e)) {
        if (this.player.hurt(e.touchDmg)) this.knockback(e);
      }
      if (e.dead) { this.onEnemyKilled(e); this.enemies.splice(i, 1); }
    }
  },

  onEnemyKilled(e) {
    this.killCount++;
    // 10体ごと確定回復ドロップ + 5%追加
    if (this.killCount % 10 === 0) this.dropHeal(e.cx, e.cy);
    else if (Math.random() < 0.05) this.dropHeal(e.cx, e.cy);
  },

  dropHeal(x, y) {
    this.pickups.push({ x, y, w: 22, h: 22, vy: -4, type: 'heal', heal: 30, t: 0 });
  },

  updateObstacles(gy) {
    const scrollEnd = this.camX;
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.update(gy, scrollEnd);
      if (!o.dead && o.solid && this.aabb(this.player, o)) {
        this.applyObstacle(o);
      }
      if (o.dead) this.obstacles.splice(i, 1);
    }
  },

  applyObstacle(o) {
    const p = this.player;
    switch (o.effect) {
      case 'slip': p.vx *= 1.04; break;          // 滑る：摩擦を効きにくく
      case 'slow': p.vx *= 0.5; break;           // 遅くなる
      case 'push': if (Math.abs(p.cx - o.cx) < o.w) p.vx -= 0.4; break; // 押し返す
      default:
        // ダメージ系
        if (o.dmg > 0) {
          if (o.kind === 'drain') { if (this.t % 20 === 0) p.hurt(o.dmg); }
          else if (p.hurt(o.dmg)) { o.dead = (o.kind !== 'eruption'); this.knockback(o); }
        }
    }
  },

  updateProjectiles(gy) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.update(this.enemies, gy);
      // 敵命中
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (pr.hits(e)) { e.hurt(pr.damage); if (pr.dead) break; }
      }
      // 破壊可能な障害物（カラス等）に命中
      if (!pr.dead) {
        for (const o of this.obstacles) {
          if (o.dead || !o.destructible) continue;
          if (pr.hits(o)) { o.hurt(pr.damage); if (pr.dead) break; }
        }
      }
      // ボス命中
      if (this.boss && !this.boss.dead && this.bossPhase === 'fighting') {
        if (pr.hits(this.boss)) this.boss.hurt(pr.damage);
      }
      // 画面外
      if (pr.x < this.camX - 60 || pr.x > this.camX + GAME.W + 60) pr.dead = true;
      if (pr.dead) this.projectiles.splice(i, 1);
    }
  },

  updatePickups() {
    const gy = Renderer.groundY();
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      pk.t++;
      if (!pk.platformBound) {
        pk.vy += 0.3; pk.y += pk.vy;
        if (pk.y + pk.h >= gy) { pk.y = gy - pk.h; pk.vy = 0; }
      }
      if (this.aabb(this.player, pk)) {
        this.player.heal(pk.heal);
        FX.burst(pk.x, pk.y, '#66bb6a', 12, { life: 24 });
        FX.damageNumber(pk.x, pk.y - 6, '+' + pk.heal, '#69f0ae');
        this.pickups.splice(i, 1);
      } else if (pk.t > 600) this.pickups.splice(i, 1);
    }
  },

  // ---- ボス交渉 ----
  openNegotiation() {
    if (this.state !== STATE.PLAYING) return;
    this.bossPhase = 'negotiating';
    this.state = STATE.NEGOTIATION;
    Negotiation.open(this.stage);
    UI.buildNegotiation(this.stage, (idx) => this.chooseNegotiation(idx));
  },

  chooseNegotiation(idx) {
    Negotiation.selected = idx;
    const result = Negotiation.confirm();
    UI.showNegoResult(result === 'success', () => {
      Negotiation.close();
      if (result === 'success') {
        // 和解：HP+40 → 次ステージ（武器なし）
        this.player.heal(40);
        this.advanceStage();
      } else {
        // 決裂：ボス戦開始
        this.startBossFight();
      }
    });
  },

  startBossFight() {
    this.bossPhase = 'fighting';
    this.state = STATE.PLAYING;
    const gy = Renderer.groundY();
    const spawnX = this.camX + GAME.W - 140;
    this.boss = new Boss(this.stage.boss, this.stage.n, gy, spawnX);
    Audio2.playBgm(this.stageIdx === STAGES.length - 1 ? BGM_LAST_BOSS : BGM_BOSS);
    UI.showWarning();
  },

  updateBoss(gy) {
    const b = this.boss;
    b.update(this.player, gy);
    // 弾がプレイヤーに命中
    for (let i = b.bullets.length - 1; i >= 0; i--) {
      const bl = b.bullets[i];
      const dx = bl.x - this.player.cx, dy = bl.y - this.player.cy;
      if (dx * dx + dy * dy < (bl.r + this.player.w / 2) ** 2) {
        this.player.hurt(bl.dmg); b.bullets.splice(i, 1);
      }
    }
    // ボス接触
    if (this.bossPhase === 'fighting' && this.aabb(this.player, b)) {
      if (this.player.hurt(b.touchDmg)) this.knockback(b);
    }
    // 撃破
    if (b.dead && this.bossPhase === 'fighting') {
      this.bossPhase = 'defeated';
      this.onBossDefeated();
    }
  },

  onBossDefeated() {
    const drop = this.stage.boss.drop;
    const w = WEAPONS[WEAPON_INDEX[drop]];
    // 武器ドロップ演出
    setTimeout(() => {
      this.player.giveWeapon(drop);
      Audio2.sfxWeaponGet();
      UI.showWeaponGet(w);
      FX.flashScreen('#ffd54f', 0.5);
      setTimeout(() => this.advanceStage(), 1600);
    }, 700);
  },

  advanceStage() {
    // ステージクリア回復
    const heal = 50 + (this.player.maxHp - this.player.hp) * 0.3;
    this.player.heal(Math.round(heal));
    if (this.stageIdx >= STAGES.length - 1) {
      this.startEnding();
    } else {
      // 次ステージ。一拍置いて開始
      this.state = STATE.PAUSED; // 一時停止（演出待ち）
      UI.hide('pauseScreen');
      setTimeout(() => this.startStage(this.stageIdx + 1), 400);
    }
  },

  // ---- ゲームオーバー ----
  gameOver() {
    if (this.state === STATE.GAMEOVER) return;
    this.state = STATE.GAMEOVER;
    Audio2.stopBgm();
    UI.show('gameoverScreen');
  },

  // ---- エンディング ----
  startEnding() {
    this.state = STATE.ENDING;
    this.endingT = 0;
    this.endingStep = 0;
    Audio2.stopBgm();
    FX.flashScreen('#ffffff', 1);
    UI.fillEndingWeapons(this.player.weapons);
    // 段階的にDOMエンディングを表示
    setTimeout(() => UI.show('endingScreen'), 2200);
  },

  updateEnding() {
    this.endingT = (this.endingT || 0) + 1;
    // 花火・星
    if (this.endingT > 130 && this.endingT % 18 === 0) {
      const x = 100 + Math.random() * (GAME.W - 200);
      const y = 60 + Math.random() * 120;
      const col = ['#ffd54f', '#ff8a80', '#80d8ff', '#b9f6ca'][Math.floor(Math.random() * 4)];
      FX.burst(x, y, col, 26, { speed: 5, life: 50, grav: 0.05 });
    }
  },

  // ============== 当たり判定ヘルパ ==============
  aabb(a, b) {
    const ar = this.hitRect(a);
    const br = this.hitRect(b);
    return ar.x < br.x + br.w && ar.x + ar.w > br.x &&
           ar.y < br.y + br.h && ar.y + ar.h > br.y;
  },
  hitRect(obj) {
    return {
      x: (typeof obj.hitX === 'number') ? obj.hitX : obj.x,
      y: (typeof obj.hitY === 'number') ? obj.hitY : obj.y,
      w: (typeof obj.hitW === 'number') ? obj.hitW : obj.w,
      h: (typeof obj.hitH === 'number') ? obj.hitH : obj.h,
    };
  },
  knockback(src) {
    const dir = Math.sign(this.player.cx - src.cx) || 1;
    this.player.vx = dir * 4;
    this.player.vy = -3;
  },

  // ============== 描画 ==============
  render(ctx) {
    ctx.clearRect(0, 0, GAME.W, GAME.H);

    if (this.state === STATE.TITLE) { this.renderTitle(ctx); return; }
    if (this.state === STATE.ENDING) { this.renderEnding(ctx); return; }

    const stage = this.stage;
    // シェイク
    ctx.save();
    if (FX.shake > 0) ctx.translate((Math.random() - 0.5) * FX.shake, (Math.random() - 0.5) * FX.shake);

    Renderer.drawBackground(stage, this.camX, this.t);

    // ワールド座標 → カメラ
    ctx.save();
    ctx.translate(-this.camX, 0);

    for (const p of this.platforms) Renderer.drawPlatform(p);
    for (const o of this.obstacles) Renderer.drawObstacle(o);
    for (const pk of this.pickups) this.drawPickup(ctx, pk);
    for (const e of this.enemies) Renderer.drawEnemy(e);
    if (this.boss && this.bossPhase !== 'negotiating') Renderer.drawBoss(this.boss, stage.n);
    Renderer.drawPlayer(this.player, stage.n);
    for (const pr of this.projectiles) Renderer.drawProjectile(pr);
    // エフェクト（ワールド）
    Renderer.drawEffects();

    ctx.restore(); // カメラ解除
    ctx.restore(); // シェイク解除

    // HUD（スクリーン座標）
    UI.drawHUD(ctx, this.player, stage, this.killCount);
    if (this.boss && this.bossPhase === 'fighting' && !this.boss.dead) UI.drawBossHpBar(ctx, this.boss);

    Renderer.drawFlash();
  },

  drawPickup(ctx, pk) {
    const fl = Math.sin(pk.t * 0.2) * 3;
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath(); ctx.arc(pk.x + pk.w / 2, pk.y + pk.h / 2 + fl, pk.w / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('♥', pk.x + pk.w / 2, pk.y + pk.h / 2 + fl + 5); ctx.textAlign = 'left';
  },

  renderTitle(ctx) {
    const W = GAME.W, H = GAME.H, t = this.titleT;
    // パララックス背景（7ステージのシルエットが奥→手前）
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d0d2b'); g.addColorStop(1, '#3a1c5a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let layer = 0; layer < 3; layer++) {
      const sp = 0.3 + layer * 0.5;
      const alpha = 0.15 + layer * 0.15;
      ctx.fillStyle = `rgba(${40 + layer * 30},${30 + layer * 20},${70 + layer * 30},${alpha})`;
      const off = (t * sp) % 200;
      for (let i = -1; i < W / 100 + 2; i++) {
        const x = i * 130 - off + layer * 40;
        const hh = 60 + layer * 50 + (i % 3) * 30;
        ctx.fillRect(x, H - hh - 60 + layer * 30, 90, hh);
      }
    }
    // 漂う粒
    Renderer.drawEffects();

    // ロゴ（ドロップイン＋バウンド）
    const dropT = Math.min(1, t / 50);
    const ease = 1 - Math.pow(1 - dropT, 3);
    const bounce = t < 55 ? 0 : Math.sin((t - 55) * 0.18) * Math.max(0, 8 - (t - 55) * 0.15);
    const ly = -60 + ease * (H * 0.32 + 60) + bounce;
    ctx.save();
    ctx.shadowColor = '#ffd54f'; ctx.shadowBlur = 24;
    ctx.fillStyle = '#fff'; ctx.font = 'bold 46px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('かえりみち', W / 2, ly);
    ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 52px sans-serif';
    ctx.fillText('ヒーローズ2', W / 2, ly + 52);
    ctx.restore();

    // 小学生→勇者へ変形するシルエット（ループ）
    const morphStage = Math.floor((t / 60) % 7);
    ctx.globalAlpha = 0.9;
    Renderer._drawHero(ctx, W / 2 - 17, H * 0.6, 34, 52, morphStage + 1);
    ctx.globalAlpha = 1;

    // TAP TO START 点滅
    if (t > 60 && Math.floor(t / 25) % 2 === 0) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('▶ TAP TO START ◀', W / 2, H - 26);
    }
    ctx.textAlign = 'left';
  },

  renderEnding(ctx) {
    const W = GAME.W, H = GAME.H, t = this.endingT || 0;
    ctx.fillStyle = '#05050f'; ctx.fillRect(0, 0, W, H);
    // 7ステージが左→右へ順番に光る（回顧）
    for (let i = 0; i < 7; i++) {
      const lit = (t - 40) / 14 > i && (t - 40) / 14 < i + 4;
      ctx.fillStyle = lit ? STAGES[i].sky : 'rgba(60,60,80,0.4)';
      ctx.globalAlpha = lit ? 0.9 : 0.4;
      const bw = W / 7;
      ctx.fillRect(i * bw + 6, H / 2 - 60, bw - 12, 120);
    }
    ctx.globalAlpha = 1;
    // 勇者が剣を掲げる
    Renderer._drawHero(ctx, W / 2 - 17, H / 2 - 20, 34, 52, 7);
    ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(W / 2 + 14, H / 2 - 16); ctx.lineTo(W / 2 + 30, H / 2 - 70); ctx.stroke();
    // 花火
    Renderer.drawEffects();
    Renderer.drawFlash();
  },
};
