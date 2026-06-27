/* =========================================================
   かえりみちヒーローズ2  config.js
   定数・STAGES・WEAPONS・BOSSES 定義
   ========================================================= */
'use strict';

const GAME = {
  W: 800,        // 内部解像度（論理座標）
  H: 450,
  GROUND_RATIO: 0.78, // 画面下から見た地面の高さ位置（論理H基準）
};

// 物理定数（仕様 2章）
const PHYS = {
  moveSpeed: 5,
  jumpPower: 12,
  gravity: 0.5,
  maxFallSpeed: 12,
  maxSpeed: 6,
  coyoteFrames: 8,
  jumpBufferFrames: 10,
  variableJumpCut: 0.55,
  airControl: 0.45,
  cameraLerp: 0.12,
  invincibleFrames: 60,
};

const PLAYER_MAX_HP = 100;

// ---- 武器定義（仕様 5章 / 表） -------------------------------
// type: 'melee_line' 直線近距離, 'line' 直線遠距離, 'pierce' 貫通,
//       'aoe' 近接範囲, 'rapid' 連射, 'wave' 衝撃波(地這い),
//       'homing' 追尾, 'omni' 全方位貫通範囲
const WEAPONS = [
  { id: 'eraser', name: '消しゴム',   icon: '🩹', type: 'melee_line', damage: 3,  cd: 8,  range: 70,  color: '#f06292' },
  { id: 'ruler',  name: '定規',       icon: '📏', type: 'line',       damage: 6,  cd: 12, speed: 9,   color: '#42a5f5' },
  { id: 'compass',name: 'コンパス',   icon: '📐', type: 'pierce',     damage: 8,  cd: 15, speed: 8,   pierce: 3, color: '#26c6da' },
  { id: 'bat',    name: '野球バット', icon: '🏏', type: 'aoe',        damage: 20, cd: 25, radius: 90, color: '#ffa726' },
  { id: 'stapler',name: 'ホッチキス弾', icon: '📎', type: 'rapid',    damage: 5,  cd: 6,  speed: 11,  color: '#bdbdbd' },
  { id: 'golf',   name: 'ゴルフクラブ', icon: '⛳', type: 'wave',     damage: 15, cd: 20, speed: 7,   color: '#66bb6a' },
  { id: 'cane',   name: '仙人の杖',   icon: '🪄', type: 'homing',     damage: 12, cd: 18, speed: 5,   color: '#ab47bc' },
  { id: 'sword',  name: '勇者の剣',   icon: '⚔️', type: 'omni',       damage: 30, cd: 10, speed: 10,  pierce: 99, color: '#ffd54f' },
];
const WEAPON_INDEX = {};
WEAPONS.forEach((w, i) => { WEAPON_INDEX[w.id] = i; });

// ---- ステージ定義（仕様 3章） --------------------------------
const STAGES = [
  {
    n: 1, name: '小学生の帰り道', appearance: '小学生',
    sky: '#87CEEB', ground: '#90EE90', length: 4000,
    bgm: 'Stage 1_ school.mp3',
    decor: 'school', // 電柱・入道雲・住宅
    obstacles: ['randoseru', 'puddle', 'crow'],
    enemyInterval: 75, enemyMax: 5,
    boss: { name: '学級委員', line: '廊下は走らないって言ったよね？',
      choices: ['走ってないよ', 'ごめんなさい', '知らない'], answer: 1,
      drop: 'ruler', hp: 120 },
  },
  {
    n: 2, name: '中学生の帰り道', appearance: '中学生',
    sky: '#FF7043', ground: '#8B7355', length: 4000,
    bgm: 'Stage 2_ Junior High.mp3',
    decor: 'sunset', // 夕日・フェンス・街灯
    obstacles: ['bike', 'ball', 'sign'],
    enemyInterval: 70, enemyMax: 6,
    boss: { name: '先輩', line: '挨拶くらいできんのか',
      choices: ['は？', 'お疲れ様です！', '無視'], answer: 1,
      drop: 'compass', hp: 250 },
  },
  {
    n: 3, name: '高校生の帰り道', appearance: '高校生',
    sky: '#2F4F7F', ground: '#696969', length: 4000,
    bgm: 'Stage 3_ High.mp3',
    decor: 'night_city', // コンビニ・街灯・ビル
    obstacles: ['motorbike', 'book', 'autodoor'],
    enemyInterval: 65, enemyMax: 6,
    boss: { name: '番長', line: '俺の縄張りに入ったな',
      choices: ['逃げる', '戦う', '話し合おう'], answer: 2,
      drop: 'bat', hp: 300 },
  },
  {
    n: 4, name: '社会人の深夜オフィス', appearance: '社会人',
    sky: '#1C1C1C', ground: '#A9A9A9', length: 5000,
    bgm: 'stage4_university.mp3',
    decor: 'office', // ビル窓・モニター
    obstacles: ['paper', 'card', 'phone'],
    enemyInterval: 60, enemyMax: 7,
    boss: { name: '上司', line: 'まだ帰るのか？',
      choices: ['仕事終わりました', 'すみません', 'もう少し残ります'], answer: 0,
      drop: 'stapler', hp: 350 },
  },
  {
    n: 5, name: 'おじさんの満員電車', appearance: 'おじさん',
    sky: '#0D0D0D', ground: '#808080', length: 5000,
    bgm: 'stage5.mp3',
    decor: 'station', // 電車・黄色線・吊り広告
    obstacles: ['crowd', 'bag', 'traindoor'],
    enemyInterval: 55, enemyMax: 8,
    boss: { name: '部長', line: 'お前の将来を決めてやろうか',
      choices: ['お願いします', '自分で決めます', '考えます'], answer: 1,
      drop: 'golf', hp: 400 },
  },
  {
    n: 6, name: 'おじいさんの縁側ロード', appearance: 'おじいさん',
    sky: '#8B4513', ground: '#DEB887', length: 5000,
    bgm: 'stage6.mp3',
    decor: 'engawa', // 松・庭石・柱
    obstacles: ['curb', 'bonsai', 'goishi'],
    enemyInterval: 50, enemyMax: 9,
    boss: { name: '仙人', line: '儂を超えてみせよ',
      choices: ['超えます', '無理です', '超える必要はない'], answer: 2,
      drop: 'cane', hp: 450 },
  },
  {
    n: 7, name: '勇者の最終決戦', appearance: '勇者',
    sky: '#8B0000', ground: '#2F4F4F', length: 6000,
    bgm: 'stage7.mp3',
    decor: 'final', // 崩れた柱・魔方陣・炎の柱
    obstacles: ['firepillar', 'rock', 'darkvortex'],
    enemyInterval: 45, enemyMax: 10,
    boss: { name: '魔王', line: 'なぜ戦う、勇者よ',
      choices: ['世界のため', '帰りたいから', 'お前を倒すため'], answer: 1,
      drop: 'sword', hp: 500 },
  },
];

// ---- 乗れる足場（マリオ的プラットフォーム） ----
// 各スキンの自然サイズ（描画＝当たり判定サイズ）
const PLATFORM_SKINS = {
  grass: { file: 'images/plat-grass.svg', w: 84, h: 84 },
  pipe:  { file: 'images/plat-pipe.svg',  w: 72, h: 92 },
  crate: { file: 'images/plat-crate.svg', w: 64, h: 64 },
  stone: { file: 'images/plat-stone.svg', w: 72, h: 72 },
  desk:  { file: 'images/plat-desk.svg',  w: 132, h: 76 },
  bench: { file: 'images/plat-bench.svg', w: 132, h: 72 },
  rock:  { file: 'images/plat-rock.svg',  w: 100, h: 76 },
};
// ステージごとに使う足場スキン（世界観に合わせる）
const STAGE_PLATFORMS = {
  1: ['grass', 'pipe'],
  2: ['crate', 'pipe'],
  3: ['stone', 'crate'],
  4: ['desk', 'stone'],
  5: ['bench', 'stone'],
  6: ['rock', 'crate'],
  7: ['stone', 'rock'],
};

const BGM_BOSS = 'boss.mp3';
const BGM_LAST_BOSS = 'last boss.mp3';

// 効果音パラメータ（仕様 10章）
const SFX = {
  jump:    { wave: 'square',   f0: 440,  f1: 220,  dur: 0.10 },
  attack:  { wave: 'square',   f0: 880,  f1: 880,  dur: 0.05 },
  damage:  { wave: 'sawtooth', f0: 200,  f1: 200,  dur: 0.30 },
  bossDown:{ wave: 'sine',     f0: 880,  f1: 1760, dur: 0.50 },
  heal:    { wave: 'sine',     f0: 659,  f1: 659,  dur: 0.20 },
};
