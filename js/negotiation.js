/* =========================================================
   negotiation.js  ボス交渉ダイアログ（3択）
   ========================================================= */
'use strict';

const Negotiation = {
  active: false,
  boss: null,
  stage: null,
  selected: 0,
  result: null,    // 'success' | 'fail'
  showTimer: 0,

  open(stage) {
    this.active = true;
    this.stage = stage;
    this.boss = stage.boss;
    this.selected = 0;
    this.result = null;
    this.showTimer = 0;
  },

  move(dir) {
    if (this.result) return;
    const n = this.boss.choices.length;
    this.selected = (this.selected + dir + n) % n;
  },

  confirm() {
    if (this.result) return;
    if (this.selected === this.boss.answer) {
      this.result = 'success';
      Audio2.sfxNegoOk();
    } else {
      this.result = 'fail';
    }
    this.showTimer = 70; // 結果表示の余韻
    return this.result;
  },

  close() { this.active = false; this.boss = null; this.stage = null; },
};
