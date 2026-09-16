// =========================================================
//  ГЛОБАЛЬНИЙ СТАН ГРИ
// =========================================================

// Стан гравця (заповнюється після /api/sync)
let state = {
  level: 1,
  e: 0,
  strength: 10,
  discipline: 10,
  crit_count: 0,
  cooldowns: {},
  power: 0,
  defense: 0,
  is_admin: false,
  appearance: {},
  callsign: null,
  daily_streak: 0,
};

// Інвентар (заповнюється після /api/inventory)
let inventory = [];

// Вдягнуте (заповнюється після /api/sync або /api/inventory)
let equipped = {};

// Поточна вкладка
let currentTab = 'home';

// Стан створення персонажа
let creation = {
  callsign: "",
  callsign_ok: false,
  gender: "male",
  skin: 0,
  hair: 0,
  eyes: 0,
};

// Стан стрічки
let feedPosts = [];
let feedTab = 'feed';
let postCooldownUntil = 0;
let postCooldownTimer = null;
let currentMenuPost = null;

// Тимчасові цілі (модалки)
let itemTarget = null;
let dailyData = null;
let currentChest = null;
let rouletteRunning = false;

// Таймер перевірки позивного
let callsignCheckTimer = null;