/* =========================================================
   ui.js  HUD（canvas）+ バナー演出 + DOMオーバーレイ制御
   ========================================================= */
'use strict';

const UI = {
  weaponFlash: 0,       // 武器切替フラッシュ（フレーム）
  weaponFlashName: '',
  warning: 0,           // WARNING点滅
  weaponGet: 0,         // 武器GETバナー
  weaponGetName: '',
  stageBanner: 0,       // ステージ名表示
  stageBannerText: '',

  showWeaponFlash(w) { this.weaponFlash = 60; this.weaponFlashName = w.name; },
  showWarning() { this.warning = 120; },
  showWeaponGet(w) { this.weaponGet = 120; this.weaponGetName = w.name; },
  showStageBanner(stage) { this.stageBanner = 120; this.stageBannerText = `STAGE ${stage.n}　${stage.name}`; },

  tick() {
    if (this.weaponFlash > 0) this.weaponFlash--;
    if (this.warning > 0) this.warning--;
    if (this.weaponGet > 0) this.weaponGet--;
    if (this.stageBanner > 0) this.stageBanner--;
  },

  drawHUD(ctx, player, stage, killCount) {
    const W = GAME.W;
    // HP バー
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(12, 12, 204, 34);
    ctx.fillStyle = '#37474f';
    ctx.fillRect(16, 16, 196, 14);
    const r = player.hp / player.maxHp;
    ctx.fillStyle = r > 0.5 ? '#66bb6a' : r > 0.25 ? '#ffb300' : '#ef5350';
    ctx.fillRect(16, 16, 196 * Math.max(0, r), 14);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`HP ${Math.ceil(player.hp)}/${player.maxHp}`, 20, 27);

    // 武器表示
    const w = player.curWeapon;
    ctx.font = '14px sans-serif';
    ctx.fillText(`${w.icon} ${w.name}`, 20, 42);
    // 回復ゲージ（10体で回復）
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(140, 36, 72, 6);
    ctx.fillStyle = '#4dd0e1';
    ctx.fillRect(140, 36, 72 * ((killCount % 10) / 10), 6);

    // ステージ名（右上 小）
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`STAGE ${stage.n} / 7`, W - 14, 26);
    ctx.textAlign = 'left';

    // ステージバナー
    if (this.stageBanner > 0) {
      const a = Math.min(1, this.stageBanner / 30, (120 - this.stageBanner) / 20 + 0.0001);
      ctx.globalAlpha = Math.min(1, a + 0.2);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, GAME.H / 2 - 30, W, 60);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(this.stageBannerText, W / 2, GAME.H / 2 + 9);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }

    // 武器切替フラッシュ
    if (this.weaponFlash > 0) {
      ctx.globalAlpha = Math.min(1, this.weaponFlash / 20);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`▶ ${this.weaponFlashName}`, W / 2, 80);
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }

    // WARNING
    if (this.warning > 0 && Math.floor(this.warning / 12) % 2 === 0) {
      ctx.fillStyle = '#ff1744'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('⚠ WARNING ⚠', W / 2, GAME.H / 2 - 40);
      ctx.textAlign = 'left';
    }

    // 武器GET
    if (this.weaponGet > 0) {
      const k = (120 - this.weaponGet) / 120;
      const scale = Math.min(1.2, 0.5 + k * 2);
      ctx.save();
      ctx.translate(W / 2, GAME.H / 2);
      ctx.scale(scale, scale);
      ctx.globalAlpha = Math.min(1, this.weaponGet / 30);
      ctx.fillStyle = '#ffd54f'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${this.weaponGetName} GET!`, 0, 0);
      ctx.restore();
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
  },

  drawBossHpBar(ctx, boss) {
    const W = GAME.W;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W / 2 - 180, GAME.H - 30, 360, 18);
    ctx.fillStyle = '#7e2222';
    ctx.fillRect(W / 2 - 176, GAME.H - 26, 352, 10);
    ctx.fillStyle = '#ff5252';
    ctx.fillRect(W / 2 - 176, GAME.H - 26, 352 * Math.max(0, boss.hp / boss.maxHp), 10);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('BOSS  ' + boss.def.name, W / 2, GAME.H - 33);
    ctx.textAlign = 'left';
  },

  // ===== DOM オーバーレイ =====
  show(id) { const e = document.getElementById(id); if (e) e.classList.add('show'); },
  hide(id) { const e = document.getElementById(id); if (e) e.classList.remove('show'); },

  // 交渉ダイアログを構築（onChoose(index)コールバック）
  buildNegotiation(stage, onChoose) {
    const box = document.getElementById('negotiationBox');
    const boss = stage.boss;
    box.innerHTML = '';
    const name = document.createElement('div'); name.className = 'nego-name'; name.textContent = `${boss.name}`;
    const line = document.createElement('div'); line.className = 'nego-line'; line.textContent = `「${boss.line}」`;
    box.appendChild(name); box.appendChild(line);
    boss.choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'nego-choice';
      btn.textContent = `${'ABC'[i]}: ${c}`;
      btn.addEventListener('click', () => onChoose(i));
      btn.addEventListener('touchend', (e) => { e.preventDefault(); onChoose(i); }, { passive: false });
      box.appendChild(btn);
    });
    this.show('negotiationOverlay');
  },

  showNegoResult(success, cb) {
    const box = document.getElementById('negotiationBox');
    box.innerHTML = '';
    const msg = document.createElement('div'); msg.className = 'nego-result';
    msg.textContent = success ? '交渉成立。HP回復！　道を譲ってもらった。' : '交渉決裂！　戦うしかない…！';
    msg.style.color = success ? '#80cbc4' : '#ff8a80';
    box.appendChild(msg);
    setTimeout(() => { this.hide('negotiationOverlay'); cb(); }, 1400);
  },

  // エンディング：獲得武器アイコンを並べる
  fillEndingWeapons(weaponIds) {
    const wrap = document.getElementById('endingWeapons');
    if (!wrap) return;
    wrap.innerHTML = '';
    weaponIds.forEach((id) => {
      const w = WEAPONS[WEAPON_INDEX[id]];
      const span = document.createElement('span');
      span.className = 'end-weapon';
      span.textContent = `${w.icon} ${w.name}`;
      wrap.appendChild(span);
    });
  },
};
