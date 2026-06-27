/* =========================================================
   init.js  初期化・Canvas DPR・イベント・ゲームループ
   ========================================================= */
'use strict';

(function () {
  let canvas, ctx;
  let lastT = 0, acc = 0;
  const STEP = 1000 / 60;

  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const wrap = document.getElementById('gameWrap');
    const rect = wrap.getBoundingClientRect();
    // 論理解像度を維持しつつ、表示サイズにフィット（アスペクト固定）
    const scale = Math.min(rect.width / GAME.W, rect.height / GAME.H);
    const cssW = GAME.W * scale, cssH = GAME.H * scale;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(GAME.W * dpr);
    canvas.height = Math.round(GAME.H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  function loop(now) {
    if (!lastT) lastT = now;
    let dt = now - lastT;
    lastT = now;
    if (dt > 100) dt = 100; // タブ復帰時の暴走防止
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 4) {
      Game.update();
      acc -= STEP; steps++;
    }
    Game.render(ctx);
    requestAnimationFrame(loop);
  }

  function firstTouchUnlock() {
    Audio2.unlock();
  }

  function wireDom() {
    // タイトル → 開始
    const startHandler = (e) => {
      if (e) e.preventDefault();
      if (Game.state !== STATE.TITLE) return;
      Audio2.unlock();
      Game.startGame();
    };
    const title = document.getElementById('titleScreen');
    title.addEventListener('touchend', startHandler, { passive: false });
    title.addEventListener('click', startHandler);

    // コンティニュー
    const cont = document.getElementById('continueBtn');
    const contH = (e) => { if (e) e.preventDefault(); Audio2.unlock(); Game.continueGame(); };
    cont.addEventListener('touchend', contH, { passive: false });
    cont.addEventListener('click', contH);

    // タイトルへ戻る（ゲームオーバー画面）
    const toTitle = document.getElementById('toTitleBtn');
    const ttH = (e) => { if (e) e.preventDefault(); UI.hide('gameoverScreen'); Game.state = STATE.TITLE; Game.titleT = 0; FX.clear(); };
    toTitle.addEventListener('touchend', ttH, { passive: false });
    toTitle.addEventListener('click', ttH);

    // エンディング → もう一度
    const replay = document.getElementById('replayBtn');
    const rpH = (e) => { if (e) e.preventDefault(); UI.hide('endingScreen'); Game.state = STATE.TITLE; Game.titleT = 0; FX.clear(); };
    replay.addEventListener('touchend', rpH, { passive: false });
    replay.addEventListener('click', rpH);

    // ポーズ解除（画面タップ）
    const pause = document.getElementById('pauseScreen');
    const puH = (e) => { if (e) e.preventDefault(); if (Game.state === STATE.PAUSED) { Game.state = STATE.PLAYING; UI.hide('pauseScreen'); } };
    pause.addEventListener('touchend', puH, { passive: false });
    pause.addEventListener('click', puH);

    // ミュート
    const mute = document.getElementById('muteBtn');
    const mH = (e) => { if (e) e.preventDefault(); const m = Audio2.toggleMute(); mute.textContent = m ? '🔇' : '🔊'; };
    mute.addEventListener('touchend', mH, { passive: false });
    mute.addEventListener('click', mH);
  }

  function preventIOSQuirks() {
    // ダブルタップZoom防止
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch < 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
    // ピンチズーム/ジェスチャ防止
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    // スクロール/バウンス防止
    document.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
    // 初回タッチでオーディオ解放
    document.addEventListener('touchstart', firstTouchUnlock, { once: true });
    document.addEventListener('mousedown', firstTouchUnlock, { once: true });
  }

  window.addEventListener('load', () => {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    Renderer.init(ctx);
    Renderer.loadAssets();
    Audio2.init();
    fitCanvas();
    bindTouchControls();
    wireDom();
    preventIOSQuirks();
    Game.boot();
    UI.show('titleScreen');
    requestAnimationFrame(loop);
  });

  window.addEventListener('resize', () => { if (canvas) fitCanvas(); });
  window.addEventListener('orientationchange', () => setTimeout(() => { if (canvas) fitCanvas(); }, 200));
})();
