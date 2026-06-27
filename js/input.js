/* =========================================================
   input.js  キーボード + タッチ（マルチタッチ）
   ========================================================= */
'use strict';

const Input = {
  left: false, right: false, up: false, down: false,
  jump: false, jumpPressed: false,   // jumpPressed = エッジ（押した瞬間）
  attack: false,
  selectPressed: false,
  startPressed: false,
  // 内部
  _jumpPrev: false,

  reset() {
    this.left = this.right = this.up = this.down = false;
    this.jump = this.attack = false;
    this.jumpPressed = this.selectPressed = this.startPressed = false;
    this._jumpPrev = false;
  },

  // 毎フレーム末に呼ぶ：エッジ系をクリア
  endFrame() {
    this.jumpPressed = (this.jump && !this._jumpPrev);
    this._jumpPrev = this.jump;
    this.selectPressed = false;
    this.startPressed = false;
  },
};

// ---- キーボード ----
window.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'ArrowLeft':  case 'KeyA': case 'Numpad4': Input.left = true; break;
    case 'ArrowRight': case 'KeyD': case 'Numpad6': Input.right = true; break;
    case 'ArrowUp':    case 'KeyW': case 'Numpad8': Input.up = true; break;
    case 'ArrowDown':  case 'KeyS': case 'Numpad2': Input.down = true; break;
    case 'KeyZ': case 'Space': case 'KeyJ': case 'Numpad0':
      if (!Input.jump) Input.jumpPressed = true;
      Input.jump = true; e.preventDefault(); break;
    case 'KeyX': case 'KeyK': case 'Numpad5': Input.attack = true; break;
    case 'ShiftLeft': case 'KeyQ': case 'Numpad7': Input.selectPressed = true; break;
    case 'Enter': case 'NumpadEnter': case 'KeyP': case 'Numpad9': Input.startPressed = true; break;
  }
});
window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'ArrowLeft':  case 'KeyA': case 'Numpad4': Input.left = false; break;
    case 'ArrowRight': case 'KeyD': case 'Numpad6': Input.right = false; break;
    case 'ArrowUp':    case 'KeyW': case 'Numpad8': Input.up = false; break;
    case 'ArrowDown':  case 'KeyS': case 'Numpad2': Input.down = false; break;
    case 'KeyZ': case 'Space': case 'KeyJ': case 'Numpad0': Input.jump = false; break;
    case 'KeyX': case 'KeyK': case 'Numpad5': Input.attack = false; break;
  }
});

// ---- タッチコントロール（マルチタッチ・移動しながら攻撃可） ----
// 各ボタン要素に data-act を付与し、touchstart/end で状態を更新する。
function bindTouchControls() {
  const map = {
    left:  () => { Input.left = true; },
    right: () => { Input.right = true; },
    up:    () => { Input.up = true; },
    down:  () => { Input.down = true; },
  };
  const mapEnd = {
    left:  () => { Input.left = false; },
    right: () => { Input.right = false; },
    up:    () => { Input.up = false; },
    down:  () => { Input.down = false; },
  };

  document.querySelectorAll('[data-act]').forEach((el) => {
    const act = el.getAttribute('data-act');
    const press = (e) => {
      e.preventDefault();
      el.classList.add('pressed');
      if (map[act]) map[act]();
      else if (act === 'jump') { if (!Input.jump) Input.jumpPressed = true; Input.jump = true; }
      else if (act === 'attack') { Input.attack = true; }
      else if (act === 'select') { Input.selectPressed = true; }
      else if (act === 'start') { Input.startPressed = true; }
    };
    const release = (e) => {
      e.preventDefault();
      el.classList.remove('pressed');
      if (mapEnd[act]) mapEnd[act]();
      else if (act === 'jump') Input.jump = false;
      else if (act === 'attack') Input.attack = false;
    };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('touchcancel', release, { passive: false });
    // マウスでも動かせるように
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', (e) => { if (el.classList.contains('pressed')) release(e); });
  });
}
