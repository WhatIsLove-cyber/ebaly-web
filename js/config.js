// =========================================================
//  КОНФІГУРАЦІЯ ГРИ
// =========================================================

// API бекенду (Railway)
const API_URL = "https://web-production-b0ac6.up.railway.app";

// Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
const INIT_DATA = tg.initData;

// Вимикаємо закриття свайпом вниз (для ігор)
if (typeof tg.disableVerticalSwipes === 'function') {
  tg.disableVerticalSwipes();
}

// =========================================================
//  ЗАВДАННЯ
// =========================================================
const TASKS = [
  { id: 'order',   name: '🧹 Навести порядок',       reward: 5,   cooldown: 60,    stat: 'discipline', type: 'normal', stickers: ["order_1.webp","order_2.webp","order_3.webp","order_4.webp","order_5.webp"],
    game_id: '2048',     threshold: 256, min_moves: 8,  min_time: 10 },
  { id: 'study',   name: '📚 Вивчити матеріал',      reward: 10,  cooldown: 300,   stat: null,         type: 'normal', stickers: ["study_1.webp","study_2.webp","study_3.webp","study_4.webp","study_5.webp"],
    game_id: 'memory',   threshold: 8,   min_moves: 16, min_time: 15 },
  { id: 'pt',      name: '🏃 Фізична підготовка',     reward: 15,  cooldown: 600,   stat: 'strength',   type: 'normal', stickers: ["pt_1.webp","pt_2.webp","pt_3.webp","pt_4.webp","pt_5.webp"],
    game_id: 'reaction', threshold: 7,   min_moves: 0,  min_time: 15 },
  { id: 'charger', name: '🔌 Хто взяв зарядку?',     reward: 5,   cooldown: 3600,  stat: 'discipline', type: 'meme',   stickers: ["charger_1.webp","charger_2.webp","charger_3.webp","charger_4.webp","charger_5.webp"],
    game_id: 'snake',    threshold: 15,  min_moves: 15, min_time: 20 },
  { id: 'shovel',  name: '🥄 Пошук лопати',          reward: 8,   cooldown: 7200,  stat: null,         type: 'meme',   stickers: ["shovel_1.webp","shovel_2.webp","shovel_3.webp","shovel_4.webp","shovel_5.webp"],
    game_id: 'puzzle',   threshold: 1,   min_moves: 20, min_time: 15 },
  { id: 'kettle',  name: '☕ Розібратись з чайником', reward: 10,  cooldown: 10800, stat: null,         type: 'meme',   stickers: ["kettle_1.webp","kettle_2.webp","kettle_3.webp","kettle_4.webp","kettle_5.webp"],
    game_id: 'sudoku',   threshold: 1,   min_moves: 0,  min_time: 20 },
];

// =========================================================
//  СУНДУКИ
// =========================================================
const CHESTS_DATA = {
  common:   { chest_id: 'common',   name: '📦 Звичайний сундук',    price: 100,  img: 'assets/chests/chest_common.png',   rarity_class: 'common',   chances: { common: 0.900, uncommon: 0.070, rare: 0.025, epic: 0.004, legendary: 0.001 } },
  improved: { chest_id: 'improved', name: '🎁 Покращений сундук',   price: 500,  img: 'assets/chests/chest_improved.png', rarity_class: 'improved', chances: { common: 0.600, uncommon: 0.300, rare: 0.080, epic: 0.018, legendary: 0.002 } },
  elite:    { chest_id: 'elite',    name: '💎 Елітний сундук',       price: 2000, img: 'assets/chests/chest_elite.png',    rarity_class: 'elite',    chances: { common: 0.300, uncommon: 0.450, rare: 0.200, epic: 0.045, legendary: 0.005 } },
  royal:    { chest_id: 'royal',    name: '👑 Королівський сундук',  price: 5000, img: 'assets/chests/chest_royal.png',    rarity_class: 'royal',    chances: { common: 0.100, uncommon: 0.350, rare: 0.400, epic: 0.120, legendary: 0.030 } },
};

// =========================================================
//  СЛОТИ
// =========================================================
const SLOTS = ["shirt", "armor", "helmet", "weapon", "gloves", "backpack"];
const SLOT_NAMES = {
  shirt: "Одяг",
  armor: "Броня",
  helmet: "Каска",
  weapon: "Зброя",
  gloves: "Рукавиці",
  backpack: "Рюкзак",
};
const SLOTS_POWER = ["weapon", "gloves"];
const SLOTS_DEFENSE = ["helmet", "armor", "shirt", "backpack"];

// =========================================================
//  ЕМОДЗІ ДЛЯ РУЛЕТКИ
// =========================================================
const ALL_ITEM_EMOJIS = ['👕','🦺','🪖','🔫','🧤','🎒','🎽','🥾','⛑','🔦','🛡','🎯','📡','🚑','🔧','🚛','⛽','🔌','📻','🥄','📝','☕','🍜','🧯','🧦','🐈'];

// =========================================================
//  СТРІЧКА
// =========================================================
const POST_MAX_LEN = 280;