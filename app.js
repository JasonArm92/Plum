(function () {
'use strict';

/* ---------- error surface ---------- */
function crash(msg) {
  var d = document.createElement('div');
  d.className = 'crash';
  d.textContent = 'Error: ' + msg;
  document.body.appendChild(d);
  setTimeout(function () { d.remove(); }, 12000);
}
window.addEventListener('error', function (e) { crash(e.message); });
window.addEventListener('unhandledrejection', function (e) { crash((e.reason && e.reason.message) || 'promise'); });

/* ---------- helpers ---------- */
var TARGET = 934745.32, CASH = 12480, KEY = 'plum_v18', BAK = 'plum_v18_bak';
var $ = function (s) { return document.querySelector(s); };
var view = $('#view'), tabsEl = $('#tabs');
var gbp = function (n) { return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' }); };
var gbp2 = function (n) { return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }); };
var pct = function (n) { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'; };
var dt = function (t) { return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
var dts = function (t) { return new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
var clamp = function (n, a, b) { return Math.min(b, Math.max(a, n)); };
var uid = function () { return Math.random().toString(36).slice(2, 10); };

function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function seedOf(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

/* ---------- funds ---------- */
var FUNDS = [
  { sym: 'CSPX', name: 'iShares Core S&P 500', price: 512.40, w: 0.155, sec: 'US equity', risk: 4 },
  { sym: 'VUSA', name: 'Vanguard S&P 500', price: 82.16, w: 0.125, sec: 'US equity', risk: 4 },
  { sym: 'IUSA', name: 'iShares S&P 500 Equal Weight', price: 61.88, w: 0.075, sec: 'US equity', risk: 4 },
  { sym: 'VWRL', name: 'Vanguard FTSE All-World', price: 108.32, w: 0.14, sec: 'Global equity', risk: 4 },
  { sym: 'HSBA', name: 'HSBC FTSE All-World', price: 12.74, w: 0.06, sec: 'Global equity', risk: 3 },
  { sym: 'ISF', name: 'iShares Core FTSE 100', price: 7.42, w: 0.07, sec: 'UK equity', risk: 3 },
  { sym: 'VUKE', name: 'Vanguard FTSE 100', price: 33.51, w: 0.045, sec: 'UK equity', risk: 3 },
  { sym: 'EQQQ', name: 'Invesco EQQQ Nasdaq-100', price: 402.15, w: 0.095, sec: 'US tech', risk: 5 },
  { sym: 'IWDA', name: 'iShares Core MSCI World', price: 88.94, w: 0.08, sec: 'Global equity', risk: 4 },
  { sym: 'VFEM', name: 'Vanguard FTSE Emerging Markets', price: 47.20, w: 0.035, sec: 'Emerging', risk: 5 },
  { sym: 'IGLN', name: 'iShares Physical Gold', price: 41.66, w: 0.05, sec: 'Commodity', risk: 3 },
  { sym: 'VAGP', name: 'Vanguard Global Bond', price: 19.28, w: 0.035, sec: 'Bonds', risk: 2 },
  { sym: 'INRG', name: 'iShares Global Clean Energy', price: 6.84, w: 0.02, sec: 'Thematic', risk: 5 },
  { sym: 'WSML', name: 'iShares MSCI World Small Cap', price: 58.30, w: 0.014, sec: 'Small cap', risk: 4 }
];

var CATS = ['Groceries', 'Eating out', 'Transport', 'Shopping', 'Bills', 'Health', 'Subscriptions', 'Entertainment', 'Other'];

var MERCHANTS = [
  { slug: 'tesco', name: 'Tesco', cat: 'Groceries', band: [1800, 8600], cad: 6, dow: [2, 5], w: 1.0, s: { 12: 1.22, 1: .82 } },
  { slug: 'sainsburys', name: "Sainsbury's", cat: 'Groceries', band: [1400, 6200], cad: 11, dow: [3], w: .7, s: { 12: 1.18, 1: .85 } },
  { slug: 'aldi', name: 'Aldi', cat: 'Groceries', band: [1200, 4900], cad: 14, dow: [6], w: .6, s: { 12: 1.1 } },
  { slug: 'lidl', name: 'Lidl', cat: 'Groceries', band: [1000, 4200], cad: 19, dow: [0], w: .45 },
  { slug: 'waitrose', name: 'Waitrose', cat: 'Groceries', band: [2400, 7800], cad: 22, dow: [4], w: .35 },
  { slug: 'ocado', name: 'Ocado', cat: 'Groceries', band: [3200, 9400], cad: 28, dow: [1], w: .3 },
  { slug: 'pret', name: 'Pret A Manger', cat: 'Eating out', band: [420, 1350], cad: 1, dow: [1, 2, 3, 4, 5], w: .55, s: { 1: .8 } },
  { slug: 'costa', name: 'Costa Coffee', cat: 'Eating out', band: [290, 780], cad: 1, dow: [1, 2, 3, 4, 5, 6], w: .4 },
  { slug: 'greggs', name: 'Greggs', cat: 'Eating out', band: [180, 690], cad: 2, dow: [1, 2, 3, 4, 5], w: .5, s: { 1: 1.3 } },
  { slug: 'starbucks', name: 'Starbucks', cat: 'Eating out', band: [340, 860], cad: 5, dow: [0, 6], w: .3 },
  { slug: 'nandos', name: "Nando's", cat: 'Eating out', band: [1600, 4200], cad: 21, dow: [5, 6], w: .5 },
  { slug: 'deliveroo', name: 'Deliveroo', cat: 'Eating out', band: [1450, 3900], cad: 9, dow: [4, 5, 6], w: .45, s: { 1: 1.2, 7: .8 } },
  { slug: 'mcdonalds', name: "McDonald's", cat: 'Eating out', band: [540, 1480], cad: 8, dow: [5, 6], w: .4 },
  { slug: 'tfl', name: 'TfL Travel', cat: 'Transport', band: [280, 940], cad: 1, dow: [1, 2, 3, 4, 5], w: .8 },
  { slug: 'trainline', name: 'Trainline', cat: 'Transport', band: [1450, 8900], cad: 26, dow: [4], w: .35, s: { 7: 1.4, 8: 1.4, 12: 1.5 } },
  { slug: 'uber', name: 'Uber', cat: 'Transport', band: [620, 2800], cad: 7, dow: [5, 6], w: .4 },
  { slug: 'shell', name: 'Shell', cat: 'Transport', band: [3800, 7200], cad: 13, dow: [6], w: .3 },
  { slug: 'bp', name: 'BP', cat: 'Transport', band: [3400, 6900], cad: 17, dow: [3], w: .25 },
  { slug: 'amazon', name: 'Amazon', cat: 'Shopping', band: [700, 6400], cad: 5, dow: [0, 1, 2, 3, 4, 5, 6], w: .85, s: { 11: 1.6, 12: 1.9, 1: .7 } },
  { slug: 'asos', name: 'ASOS', cat: 'Shopping', band: [1900, 8400], cad: 24, dow: [6], w: .4, s: { 11: 1.5, 12: 1.4, 1: .6 } },
  { slug: 'boots', name: 'Boots', cat: 'Health', band: [480, 3400], cad: 18, dow: [6], w: .45 },
  { slug: 'apple', name: 'Apple', cat: 'Subscriptions', band: [299, 1099], cad: 30, dow: [1], w: 1, fixed: true },
  { slug: 'spotify', name: 'Spotify', cat: 'Subscriptions', band: [1199, 1199], cad: 30, dow: [4], w: 1, fixed: true },
  { slug: 'netflix', name: 'Netflix', cat: 'Subscriptions', band: [1099, 1099], cad: 30, dow: [6], w: 1, fixed: true },
  { slug: 'octopus', name: 'Octopus Energy', cat: 'Bills', band: [6400, 15400], cad: 30, dow: [2], w: 1, s: { 1: 1.35, 2: 1.3, 12: 1.25 } }
];

/* ---------- state ---------- */
var S = null;
var stack = [];
var prefs = { theme: 'system', logo: 'system', idle: 5 };

function totalValue(st) { return st.cash + st.holdings.reduce(function (a, h) { return a + h.units * h.price; }, 0); }
function investedValue(st) { return st.holdings.reduce(function (a, h) { return a + h.units * h.price; }, 0); }

function freshState() {
  var st = {
    v: 18, acct: 'PLM-8842-1097', name: 'Jason Armstrong',
    email: 'jason.armstrong@proton.me', phone: '+44 7700 900412',
    addr: '14 Ashcombe Gardens, London, SW12 8QT',
    cash: CASH, holdings: [], orders: [], tx: [], spend: [], pockets: [],
    budgets: {}, cards: [], sched: [], banks: [], rules: null, alerts: [],
    prefs: { notif: { fills: true, divs: true, spend: true, bills: true, product: false } },
    sub: 'Max', onb: false, pin: null, bio: null, fails: 0,
    open: null, openDay: new Date().toDateString(), month: new Date().getMonth()
  };
  var budget = TARGET - CASH, acc = 0;
  FUNDS.forEach(function (f, i) {
    var last = i === FUNDS.length - 1;
    var value = last ? budget - acc : Math.round(budget * f.w * 100) / 100;
    acc += value;
    st.holdings.push({
      sym: f.sym, name: f.name, sec: f.sec, risk: f.risk,
      units: Math.round((value / f.price) * 10000) / 10000,
      price: f.price, cost: Math.round(f.price * 0.71 * 100) / 100, dayOpen: f.price
    });
  });
  st.cards.push({ id: uid(), last4: '4417', exp: '09/29', type: 'Debit', frozen: false, net: 'Visa' });
  st.banks.push({ id: uid(), name: 'Monzo', sort: '04-00-04', last4: '8842', primary: true });
  st.pockets.push(
    { id: uid(), name: 'Japan trip', goal: 4500, saved: 2180, emoji: '\uD83D\uDDFC' },
    { id: uid(), name: 'New kitchen', goal: 12000, saved: 6400, emoji: '\uD83C\uDF73' },
    { id: uid(), name: 'Emergency fund', goal: 20000, saved: 9450, emoji: '\uD83D\uDEE0' }
  );
  CATS.forEach(function (c) { st.budgets[c] = 0; });
  st.budgets.Groceries = 420; st.budgets['Eating out'] = 260;
  st.budgets.Transport = 180; st.budgets.Shopping = 240;
  st.spend = seedSpend(365, 'plum-' + st.acct);
  st.tx = seedTx(st);
  st.open = totalValue(st) - 1840.22;
  return st;
}

function seedSpend(days, seedStr) {
  var r = mulberry(seedOf(seedStr)), out = [];
  var today = new Date(); today.setHours(12, 0, 0, 0);
  for (var back = days; back >= 0; back--) {
    var d = new Date(today); d.setDate(d.getDate() - back);
    var dom = d.getDate(), dow = d.getDay(), month = d.getMonth() + 1;
    var splurge = (dom >= 27 || dom <= 2) ? 1.35 : 1;
    for (var i = 0; i < MERCHANTS.length; i++) {
      var m = MERCHANTS[i];
      if (m.dow.indexOf(dow) < 0) continue;
      if (m.cad > 1 && r() > 1 / m.cad) continue;
      if (!m.fixed && r() > m.w) continue;
      var amt = m.fixed ? m.band[0] : Math.round(m.band[0] + (m.band[1] - m.band[0]) * ((r() + r() + r()) / 3));
      var season = m.s && m.s[month] ? m.s[month] : 1;
      amt *= season * ((m.cat === 'Eating out' || m.cat === 'Shopping') ? splurge : 1);
      if (!m.fixed) amt *= 0.9 + r() * 0.25;
      amt = Math.max(60, Math.round(amt));
      var t = new Date(d);
      t.setHours(7 + Math.floor(r() * 14), Math.floor(r() * 60), 0, 0);
      out.push({
        id: 's' + t.getTime() + m.slug, t: t.getTime(), slug: m.slug, name: m.name,
        cat: m.cat, amount: -(amt / 100),
        roundup: Math.round((Math.ceil(amt / 100) * 100 - amt)) / 100
      });
    }
  }
  return out.sort(function (a, b) { return b.t - a.t; });
}

function seedTx(st) {
  var r = mulberry(seedOf('tx' + st.acct)), out = [], now = Date.now(), i;
  for (i = 0; i < 26; i++) {
    var f = FUNDS[Math.floor(r() * FUNDS.length)];
    var kind = r() < 0.68 ? 'buy' : 'sell';
    var amt = Math.round((60 + r() * 1400) * 100) / 100;
    out.push({ id: uid(), t: now - (Math.floor(r() * 330) + 2) * 864e5, kind: kind, sym: f.sym, name: f.name, amount: amt, units: amt / f.price, status: 'done' });
  }
  for (i = 0; i < 9; i++) {
    var g = FUNDS[Math.floor(r() * FUNDS.length)];
    out.push({ id: uid(), t: now - (Math.floor(r() * 300) + 3) * 864e5, kind: 'div', sym: g.sym, name: g.name, amount: Math.round((4 + r() * 90) * 100) / 100, units: 0, status: 'done' });
  }
  for (i = 1; i <= 11; i++) {
    out.push({ id: uid(), t: now - i * 30.4 * 864e5, kind: 'fee', sym: '', name: 'Monthly fee', amount: 14.99, units: 0, status: 'done' });
  }
  return out.sort(function (a, b) { return b.t - a.t; });
}

function seriesFor(sym, points, drift) {
  var r = mulberry(seedOf(sym + points)), out = [], v = 100;
  for (var i = 0; i < points; i++) { v += (r() - 0.5) * 3.4 + drift; out.push(Math.max(8, v)); }
  return out;
}

/* ---------- persistence ---------- */
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
  try { if (Math.random() < 0.08) localStorage.setItem(BAK, JSON.stringify(S)); } catch (e) { }
}
function load() {
  var keys = [KEY, BAK];
  for (var i = 0; i < keys.length; i++) {
    try {
      var raw = localStorage.getItem(keys[i]);
      if (!raw) continue;
      var st = JSON.parse(raw);
      if (!st || st.v !== 18 || !st.holdings || !st.holdings.length) continue;
      if (st.openDay !== new Date().toDateString()) { st.open = totalValue(st); st.openDay = new Date().toDateString(); }
      return st;
    } catch (e) { }
  }
  return null;
}

/* ---------- ui atoms ---------- */
function toast(msg, ms) {
  var el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(function () { el.remove(); }, ms || 2400);
}
function sheet(html) {
  var m = $('#modal');
  m.innerHTML = '<div class="sheet"><div class="sheet-inner">' + html + '</div></div>';
  m.hidden = false;
  m.querySelector('.sheet').addEventListener('click', function (e) {
    if (e.target.classList.contains('sheet')) closeSheet();
  });
}
function closeSheet() { var m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
window.closeSheet = closeSheet;

function applyTheme() {
  var dark = prefs.theme === 'dark' || (prefs.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  if (prefs.logo === 'system') delete document.documentElement.dataset.logo;
  else document.documentElement.dataset.logo = prefs.logo;
  var meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = dark ? '#12071E' : '#FBF6E9';
  try { localStorage.setItem('plum_prefs', JSON.stringify(prefs)); } catch (e) { }
}
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) { }

var brand = function (size) {
  size = size || 26;
  return '<span class="logo-lockup" style="width:' + size + 'px;height:' + size + 'px">' +
    '<img class="logo-purple" src="icon-purple.svg" alt="Plum">' +
    '<img class="logo-white" src="icon-white.svg" alt=""></span>';
};
var header = function (title, sub) {
  return '<div class="between" style="margin-bottom:18px">' +
    '<button class="icon-btn" data-back aria-label="Back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>' +
    '<div style="text-align:center;flex:1"><h3>' + esc(title) + '</h3>' + (sub ? '<p class="tiny muted">' + esc(sub) + '</p>' : '') + '</div>' +
    '<span style="width:42px"></span></div>';
};
function spark(series, w, h, colour) {
  w = w || 300; h = h || 64; colour = colour || 'var(--violet)';
  var min = Math.min.apply(null, series), max = Math.max.apply(null, series), span = (max - min) || 1;
  var pts = series.map(function (v, i) {
    return ((i / (series.length - 1)) * w).toFixed(1) + ',' + (h - ((v - min) / span) * (h - 6) - 3).toFixed(1);
  }).join(' ');
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" style="width:100%;height:' + h + 'px;display:block">' +
    '<polyline points="' + pts + '" fill="none" stroke="' + colour + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>';
}
function logo(slug, name) {
  try { return window.PLUM_LOGOS.forMerchant(slug, name); }
  catch (e) { return '<span class="logo" style="display:grid;place-items:center;background:var(--chip);font-size:12px;font-weight:800">?</span>'; }
}

/* ---------- router ---------- */
var SCREENS = {};
var AFTER = {};

function render(name, params) {
  params = params || {};
  var fn = SCREENS[name];
  if (typeof fn !== 'function') { fn = SCREENS.home; name = 'home'; }
  var out = '';
  try { out = fn(params) || ''; } catch (e) { crash(name + ': ' + e.message); out = ''; }
  view.className = 'view' + (['onb1', 'onb2', 'onb3', 'onb4', 'onb5', 'lock'].indexOf(name) >= 0 ? ' no-tabs' : '');
  tabsEl.hidden = view.className.indexOf('no-tabs') >= 0;
  view.innerHTML = out;
  view.classList.remove('fade'); void view.offsetWidth; view.classList.add('fade');
  var tabName = ['home', 'invest', 'spend', 'brain', 'profile'].filter(function (t) { return name.indexOf(t) === 0; })[0];
  Array.prototype.forEach.call(tabsEl.querySelectorAll('.tab'), function (a) {
    a.classList.toggle('active', a.dataset.tab === tabName);
  });
  try {
    Array.prototype.forEach.call(view.querySelectorAll('[data-go]'), function (el) {
      el.onclick = function () { go(el.dataset.go, JSON.parse(el.dataset.p || '{}')); };
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-back]'), function (el) { el.onclick = back; });
    if (AFTER[name]) AFTER[name](params);
  } catch (e) { crash('wire ' + name + ': ' + e.message); }
  window.scrollTo(0, 0);
}
function go(name, params, replace) {
  if (!replace) stack.push({ name: name, params: params || {} });
  render(name, params || {});
}
function back() {
  stack.pop();
  var prev = stack[stack.length - 1];
  if (prev) render(prev.name, prev.params);
  else go('home', {}, true);
}
window.addEventListener('popstate', function () { if (stack.length > 1) back(); });

/* ---------- crypto ---------- */
function b64d(s) {
  var t = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(t), function (c) { return c.charCodeAt(0); });
}
function hashPin(pin, saltB64) {
  var salt = saltB64 ? b64d(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  return crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
    .then(function (km) { return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: 150000, hash: 'SHA-256' }, km, 256); })
    .then(function (bits) {
      var arr = new Uint8Array(bits);
      return {
        hash: Array.prototype.map.call(arr, function (b) { return b.toString(16).padStart(2, '0'); }).join(''),
        salt: btoa(String.fromCharCode.apply(null, salt))
      };
    });
}

/* ---------- onboarding ---------- */
var ONB = [
  { e: '\uD83C\uDF51', h: 'Your money, on autopilot', p: 'Plum moves a little into savings each week and invests what you can afford to grow.' },
  { e: '\uD83D\uDCC8', h: 'Invest from \u00A32', p: 'Build a global portfolio of funds and shares. Start small, stay consistent.' },
  { e: '\uD83E\uDDE0', h: 'The Brain does the maths', p: 'Rules that sweep spare change, top up pockets and trim spending when you overshoot.' },
  { e: '\uD83D\uDD12', h: 'Locked down properly', p: 'Fingerprint unlock, a six-digit PIN and instant card freeze.' },
  { e: '\uD83D\uDC9C', h: 'Ready when you are', p: 'Set up takes about two minutes. You can change everything later.' }
];
ONB.forEach(function (o, i) {
  SCREENS['onb' + (i + 1)] = function () {
    return '<div style="min-height:88dvh;display:flex;flex-direction:column">' +
      '<div class="between" style="padding-top:6px">' + brand(30) + '<span class="tiny muted">' + (i + 1) + ' / 5</span></div>' +
      '<div style="flex:1;display:grid;place-items:center;text-align:center;padding:20px 0"><div>' +
      '<div style="font-size:72px;margin-bottom:22px">' + o.e + '</div>' +
      '<h1>' + o.h + '</h1><p class="muted" style="margin-top:14px;font-size:16px;max-width:300px">' + o.p + '</p></div></div>' +
      '<button class="btn wide" data-go="' + (i === 4 ? 'lock' : 'onb' + (i + 2)) + '">' + (i === 4 ? 'Create my account' : 'Continue') + '</button>' +
      (i < 4 ? '<button class="btn wide ghost" style="margin-top:10px" data-go="lock">Skip</button>' : '') + '</div>';
  };
});

/* ---------- lock ---------- */
SCREENS.lock = function () {
  return '<div style="min-height:90dvh;display:flex;flex-direction:column;justify-content:center;text-align:center">' +
    '<div style="margin:0 auto 24px">' + brand(84) + '</div>' +
    '<h2>Welcome back, Jason</h2><p class="muted small" style="margin-top:8px">Unlock to see your money</p>' +
    '<div id="lockmsg" class="small" style="min-height:20px;margin-top:18px;color:var(--neg)"></div>' +
    '<button class="btn violet wide" id="bio" style="margin-top:14px">Use fingerprint</button>' +
    '<button class="btn wide ghost" style="margin-top:10px" id="usepin">Use PIN</button>' +
    '<div id="pinbox" hidden style="margin-top:18px">' +
    '<input class="field mono center" id="pin" inputmode="numeric" maxlength="6" placeholder="••••••" style="letter-spacing:.5em;font-size:22px">' +
    '<button class="btn wide" style="margin-top:12px" id="pinok">Unlock</button></div></div>';
};
AFTER.lock = function () {
  var pin = $('#pin'), box = $('#pinbox'), msg = $('#lockmsg');
  function done() { stack = [{ name: 'home', params: {} }]; render('home'); }
  $('#usepin').onclick = function () { box.hidden = false; pin.focus(); };
  $('#pinok').onclick = function () {
    if (!S.pin) {
      hashPin('123456').then(function (p) { S.pin = p; S.onb = true; save(); done(); });
      return;
    }
    hashPin(pin.value, S.pin.salt).then(function (h) {
      if (h.hash === S.pin.hash) { S.fails = 0; S.onb = true; save(); done(); }
      else { S.fails = (S.fails || 0) + 1; save(); msg.textContent = 'Wrong PIN'; }
    });
  };
  $('#bio').onclick = function () {
    if (!S.bio) { msg.textContent = 'No fingerprint enrolled — use your PIN'; box.hidden = false; return; }
    navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: b64d(S.bio), type: 'public-key' }],
        userVerification: 'required', timeout: 30000
      }
    }).then(function (c) { if (c) done(); }).catch(function () { msg.textContent = 'Fingerprint not recognised'; });
  };
};

/* ---------- home ---------- */
function greet() { var h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; }

SCREENS.home = function () {
  var total = totalValue(S);
  var change = total - (S.open || total);
  var pctc = (change / (S.open || total)) * 100;
  var invest = investedValue(S);
  var recent = S.tx.slice(0, 4).map(function (t) {
    var glyph = t.kind === 'buy' ? '↓' : t.kind === 'sell' ? '↑' : t.kind === 'div' ? '¤' : '£';
    return '<div class="item"><span class="logo" style="display:grid;place-items:center;background:var(--chip);font-weight:800;font-size:13px">' + glyph + '</span>' +
      '<span class="grow"><span class="name">' + esc(t.name) + '</span><span class="sub">' + dt(t.t) + '</span></span>' +
      '<span class="mono small ' + (t.kind === 'buy' ? '' : 'pos') + '">' + (t.kind === 'buy' ? '-' : '+') + gbp2(t.amount) + '</span></div>';
  }).join('');
  var pockets = S.pockets.slice(0, 3).map(function (p) {
    return '<button class="item" data-go="pocket" data-p=\'{"id":"' + p.id + '"}\'>' +
      '<span class="logo" style="display:grid;place-items:center;background:var(--chip);font-size:19px">' + p.emoji + '</span>' +
      '<span class="grow"><span class="name">' + esc(p.name) + '</span><span class="sub">' + gbp(p.saved) + ' of ' + gbp(p.goal) + '</span></span>' +
      '<span class="small muted mono">' + Math.round((p.saved / p.goal) * 100) + '%</span></button>';
  }).join('');
  return '<div class="between" style="margin-bottom:6px">' +
    '<div class="row">' + brand(30) + '<div><p class="tiny muted">Good ' + greet() + '</p><h3>Jason</h3></div></div>' +
    '<div class="row"><button class="icon-btn" data-go="search" aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button>' +
    '<button class="icon-btn" data-go="notifs" aria-label="Notifications"><svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9z"/><path d="M10 18a2 2 0 0 0 4 0"/></svg></button></div></div>' +
    '<p class="tiny muted" style="margin-top:14px">Total balance</p>' +
    '<h1 class="mono" style="font-size:40px" id="total">' + gbp(total) + '</h1>' +
    '<p class="small mono ' + (change >= 0 ? 'pos' : 'neg') + '">' + (change >= 0 ? '▲' : '▼') + ' ' + gbp(Math.abs(change)) + ' (' + pct(pctc) + ') today</p>' +
    spark(seriesFor('home', 40, change > 0 ? .3 : -.3), 320, 56, change >= 0 ? 'var(--pos)' : 'var(--neg)') +
    '<div class="row" style="margin-top:16px"><button class="btn wide" data-go="order" data-p=\'{"kind":"buy"}\'>Invest</button>' +
    '<button class="btn wide ghost" data-go="pockets">Move</button></div>' +
    '<div class="card flat" style="margin-top:20px"><div class="between"><p class="tiny muted">Cash available</p><p class="tiny muted">Invested</p></div>' +
    '<div class="between" style="margin-top:4px"><h3 class="mono">' + gbp(S.cash) + '</h3><h3 class="mono">' + gbp(invest) + '</h3></div>' +
    '<div class="bar" style="margin-top:12px"><i style="width:' + ((invest / total) * 100).toFixed(1) + '%"></i></div>' +
    '<p class="small muted" style="margin-top:10px">' + ((invest / total) * 100).toFixed(1) + '% of your money is invested</p></div>' +
    '<div class="between" style="margin:24px 0 12px"><h3>Your allowance</h3><span class="chip">' + gbp2(7411) + ' left</span></div>' +
    '<div class="card flat"><div class="bar"><i style="width:' + (((20000 - 7411) / 20000) * 100) + '%"></i></div>' +
    '<p class="small muted" style="margin-top:10px">' + gbp(20000 - 7411) + ' of £20,000 used this tax year</p>' +
    '<p class="tiny muted" style="margin-top:6px">Resets 6 April</p></div>' +
    '<div class="between" style="margin:24px 0 12px"><h3>Pockets</h3><button class="small muted" data-go="pockets">All</button></div>' +
    '<div class="list">' + pockets + '</div>' +
    '<div class="between" style="margin:24px 0 12px"><h3>Recent</h3><button class="small muted" data-go="activity">All</button></div>' +
    '<div class="list">' + recent + '</div>';
};

/* ---------- invest ---------- */
SCREENS.invest = function () {
  var rows = S.holdings.map(function (h) {
    var ch = ((h.price - h.dayOpen) / h.dayOpen) * 100;
    return '<button class="item" data-go="detail" data-p=\'{"sym":"' + h.sym + '"}\'>' +
      '<span class="logo" style="display:grid;place-items:center;background:var(--chip);font-size:11px;font-weight:800">' + h.sym + '</span>' +
      '<span class="grow"><span class="name">' + esc(h.name) + '</span><span class="sub">' + h.sec + ' · risk ' + h.risk + '/5</span></span>' +
      '<span style="text-align:right"><span class="mono small" style="display:block">' + gbp(h.units * h.price) + '</span>' +
      '<span class="mono tiny ' + (ch >= 0 ? 'pos' : 'neg') + '">' + pct(ch) + '</span></span></button>';
  }).join('');
  return '<div class="between"><h1>Invest</h1><button class="icon-btn" data-go="search" aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button></div>' +
    '<p class="muted small" style="margin-top:6px">' + gbp(investedValue(S)) + ' invested across ' + S.holdings.length + ' funds</p>' +
    '<div class="seg" style="margin-top:16px"><button class="on">Portfolio</button><button data-go="activity">Activity</button><button data-go="docs">Documents</button></div>' +
    '<div class="list" style="margin-top:16px">' + rows + '</div>' +
    '<button class="btn wide" style="margin-top:18px" data-go="order" data-p=\'{"kind":"buy"}\'>Buy funds</button>';
};

SCREENS.detail = function (p) {
  var h = null;
  S.holdings.forEach(function (x) { if (x.sym === p.sym) h = x; });
  if (!h) { go('invest', {}, true); return ''; }
  var range = S.range || '1M';
  var pts = range === '1D' ? 40 : range === '1W' ? 56 : range === '1M' ? 90 : 240;
  var pl = (h.price - h.cost) * h.units;
  var chips = ['1D', '1W', '1M', '1Y'].map(function (r) {
    return '<button class="chip ' + (r === range ? 'on' : '') + '" data-r="' + r + '">' + r + '</button>';
  }).join('');
  return header(h.name, h.sec) +
    '<h1 class="mono">' + gbp2(h.price) + '</h1>' +
    '<p class="small mono ' + ((h.price - h.dayOpen) >= 0 ? 'pos' : 'neg') + '">' + pct(((h.price - h.dayOpen) / h.dayOpen) * 100) + ' today</p>' +
    spark(seriesFor(h.sym + range, pts, range === '1Y' ? .22 : .1)) +
    '<div class="row" style="margin-top:12px">' + chips + '</div>' +
    '<div class="card flat" style="margin-top:18px">' +
    '<div class="between"><span class="small muted">Holding value</span><span class="mono">' + gbp(h.units * h.price) + '</span></div>' +
    '<div class="between" style="margin-top:8px"><span class="small muted">Units</span><span class="mono">' + h.units.toFixed(4) + '</span></div>' +
    '<div class="between" style="margin-top:8px"><span class="small muted">Average cost</span><span class="mono">' + gbp2(h.cost) + '</span></div>' +
    '<div class="between" style="margin-top:8px"><span class="small muted">Profit / loss</span><span class="mono ' + (pl >= 0 ? 'pos' : 'neg') + '">' + gbp(pl) + '</span></div></div>' +
    '<div class="row" style="margin-top:16px"><button class="btn wide" data-go="order" data-p=\'{"kind":"buy","sym":"' + h.sym + '"}\'>Buy</button>' +
    '<button class="btn wide ghost" data-go="order" data-p=\'{"kind":"sell","sym":"' + h.sym + '"}\'>Sell</button></div>' +
    '<p class="tiny muted" style="margin-top:22px">About this fund</p>' +
    '<p class="small muted" style="margin-top:6px">' + esc(h.name) + ' tracks ' + h.sec.toLowerCase() + ' markets. Accumulating, GBP hedged, OCF 0.07%. Capital at risk.</p>';
};
AFTER.detail = function (p) {
  Array.prototype.forEach.call(view.querySelectorAll('[data-r]'), function (b) {
    b.onclick = function () { S.range = b.dataset.r; save(); render('detail', p); };
  });
};

/* ---------- order ---------- */
SCREENS.order = function (p) {
  var kind = p.kind || 'buy';
  var opts = S.holdings.map(function (h) {
    return '<option value="' + h.sym + '"' + (h.sym === p.sym ? ' selected' : '') + '>' + esc(h.name) + ' — ' + gbp2(h.price) + '</option>';
  }).join('');
  return header(kind === 'buy' ? 'Buy funds' : 'Sell funds', kind === 'buy' ? 'Cash: ' + gbp(S.cash) : 'Holding: ' + gbp(investedValue(S))) +
    '<div class="seg"><button class="' + (kind === 'buy' ? 'on' : '') + '" data-k="buy">Buy</button><button class="' + (kind === 'sell' ? 'on' : '') + '" data-k="sell">Sell</button></div>' +
    '<label class="label" style="margin-top:18px">Fund</label><select class="field" id="fund">' + opts + '</select>' +
    '<label class="label" style="margin-top:14px">Amount</label><input class="field mono" id="amt" inputmode="decimal" placeholder="0.00" value="100">' +
    '<div class="row" style="margin-top:10px">' + [25, 100, 500, 1000].map(function (v) {
      return '<button class="chip" data-amt="' + v + '">' + gbp(v) + '</button>';
    }).join('') + '</div>' +
    '<div class="card flat" style="margin-top:18px"><div class="between"><span class="small muted">Estimated units</span><span class="mono" id="units">—</span></div>' +
    '<div class="between" style="margin-top:8px"><span class="small muted">Dealing fee</span><span class="mono">£0.00</span></div></div>' +
    '<button class="btn wide violet" style="margin-top:18px" id="next">Review order</button>';
};
AFTER.order = function (p) {
  var amt = $('#amt'), units = $('#units'), fund = $('#fund');
  function calc() {
    var h = null;
    S.holdings.forEach(function (x) { if (x.sym === fund.value) h = x; });
    var v = parseFloat(amt.value) || 0;
    units.textContent = h ? (v / h.price).toFixed(4) + ' units' : '—';
  }
  amt.oninput = calc; fund.onchange = calc; calc();
  Array.prototype.forEach.call(view.querySelectorAll('[data-amt]'), function (b) {
    b.onclick = function () { amt.value = b.dataset.amt; calc(); };
  });
  Array.prototype.forEach.call(view.querySelectorAll('[data-k]'), function (b) {
    b.onclick = function () { p.kind = b.dataset.k; render('order', p); };
  });
  $('#next').onclick = function () {
    var v = parseFloat(amt.value);
    if (!v || v < 2) return toast('Minimum is £2');
    if (p.kind === 'buy' && v > S.cash) return toast('Not enough cash');
    go('review', { kind: p.kind, sym: fund.value, amt: v });
  };
};

SCREENS.review = function (p) {
  var h = null;
  S.holdings.forEach(function (x) { if (x.sym === p.sym) h = x; });
  if (!h) { go('order', {}, true); return ''; }
  return header('Check your order') +
    '<div class="card"><p class="tiny muted">' + (p.kind === 'buy' ? 'Buying' : 'Selling') + '</p>' +
    '<h2 style="margin-top:4px">' + esc(h.name) + '</h2><hr class="hr">' +
    '<div class="between"><span class="small muted">Amount</span><span class="mono">' + gbp2(p.amt) + '</span></div>' +
    '<div class="between" style="margin-top:8px"><span class="small muted">Units at ' + gbp2(h.price) + '</span><span class="mono">' + (p.amt / h.price).toFixed(4) + '</span></div>' +
    '<div class="between" style="margin-top:8px"><span class="small muted">Settlement</span><span class="small">Next dealing point</span></div></div>' +
    '<p class="tiny muted" style="margin-top:14px">Orders placed after 16:30 or at weekends fill at the next valuation point. You can cancel until then.</p>' +
    '<button class="btn wide violet" style="margin-top:16px" id="confirm">Confirm ' + (p.kind === 'buy' ? 'buy' : 'sell') + '</button>' +
    '<button class="btn wide ghost" style="margin-top:10px" data-back>Back</button>';
};
AFTER.review = function (p) { $('#confirm').onclick = function () { placeOrder(p); }; };

SCREENS.receipt = function (p) {
  var o = null;
  S.orders.forEach(function (x) { if (x.id === p.id) o = x; });
  if (!o) { go('home', {}, true); return ''; }
  return header('Order placed', o.status) +
    '<div class="card center" style="padding:30px 18px"><div style="font-size:44px">' + (o.status === 'filled' ? '\u2705' : '\u23F3') + '</div>' +
    '<h2 style="margin-top:12px">' + (o.status === 'filled' ? 'Filled' : 'Queued') + '</h2>' +
    '<p class="muted small" style="margin-top:8px">' + esc(o.name) + ' · ' + gbp2(o.amount) + '</p>' +
    '<p class="tiny muted" style="margin-top:8px">Ref ' + o.id.toUpperCase() + '</p></div>' +
    (o.status !== 'filled' ? '<button class="btn wide ghost" style="margin-top:14px" id="undo">Cancel order</button>' : '') +
    '<button class="btn wide" style="margin-top:10px" data-go="home">Done</button>';
};
AFTER.receipt = function (p) {
  var u = $('#undo');
  if (!u) return;
  u.onclick = function () {
    S.orders = S.orders.filter(function (o) { return o.id !== p.id; });
    if (p.kind === 'buy') S.cash += p.amt; else S.cash -= p.amt;
    save(); toast('Order cancelled'); go('home');
  };
};

function placeOrder(p) {
  var h = null;
  S.holdings.forEach(function (x) { if (x.sym === p.sym) h = x; });
  if (!h) return;
  var id = uid();
  var order = { id: id, kind: p.kind, sym: p.sym, name: h.name, amount: p.amt, units: p.amt / h.price, t: Date.now(), status: 'queued' };
  S.orders.unshift(order);
  if (p.kind === 'buy') { S.cash -= p.amt; h.units += order.units; }
  else { S.cash += p.amt; h.units = Math.max(0, h.units - order.units); }
  S.tx.unshift({ id: id, t: Date.now(), kind: p.kind, sym: p.sym, name: h.name, amount: p.amt, units: order.units, status: 'queued' });
  save();
  go('receipt', { id: id }, true);
  setTimeout(function () {
    order.status = 'filled';
    S.tx.forEach(function (x) { if (x.id === id) x.status = 'filled'; });
    save();
    var top = stack[stack.length - 1];
    if (top && top.name === 'receipt') render('receipt', { id: id });
    toast('Order filled');
  }, 3200);
}

/* ---------- activity / search ---------- */
SCREENS.activity = function () {
  var rows = S.tx.map(function (t) {
    var glyph = t.kind === 'buy' ? '↓' : t.kind === 'sell' ? '↑' : t.kind === 'div' ? '¤' : '£';
    return '<div class="item"><span class="logo" style="display:grid;place-items:center;background:var(--chip);font-weight:800;font-size:13px">' + glyph + '</span>' +
      '<span class="grow"><span class="name">' + esc(t.name) + '</span><span class="sub">' + dts(t.t) + ' · ' + t.kind + '</span></span>' +
      '<span class="mono small ' + (t.kind === 'buy' ? '' : 'pos') + '">' + (t.kind === 'buy' ? '-' : '+') + gbp2(t.amount) + '</span></div>';
  }).join('');
  return header('Activity', 'Trades, dividends and fees') +
    '<input class="field" id="q" placeholder="Search activity"><div class="list" style="margin-top:12px" id="rows">' + rows + '</div>';
};
AFTER.activity = function () {
  var q = $('#q');
  q.oninput = function () {
    var v = q.value.toLowerCase();
    Array.prototype.forEach.call($('#rows').querySelectorAll('.item'), function (el) {
      el.style.display = el.textContent.toLowerCase().indexOf(v) >= 0 ? '' : 'none';
    });
  };
};

SCREENS.search = function () {
  return header('Search') + '<input class="field" id="q" placeholder="Funds, merchants" autofocus><div id="out" style="margin-top:12px"></div>';
};
AFTER.search = function () {
  var q = $('#q'), out = $('#out');
  q.oninput = function () {
    var v = q.value.toLowerCase().trim();
    if (!v) { out.innerHTML = ''; return; }
    var funds = S.holdings.filter(function (h) { return (h.name + h.sym).toLowerCase().indexOf(v) >= 0; });
    var merch = MERCHANTS.filter(function (m) { return m.name.toLowerCase().indexOf(v) >= 0; }).slice(0, 5);
    out.innerHTML = (funds.length ? '<p class="tiny muted">Funds</p><div class="list">' + funds.map(function (h) {
      return '<button class="item" data-go="detail" data-p=\'{"sym":"' + h.sym + '"}\'><span class="grow"><span class="name">' + esc(h.name) + '</span></span></button>';
    }).join('') + '</div>' : '') + (merch.length ? '<p class="tiny muted" style="margin-top:14px">Merchants</p><div class="list">' + merch.map(function (m) {
      return '<div class="item">' + logo(m.slug, m.name) + '<span class="grow"><span class="name">' + esc(m.name) + '</span></span></div>';
    }).join('') + '</div>' : '');
    Array.prototype.forEach.call(out.querySelectorAll('[data-go]'), function (el) {
      el.onclick = function () { go(el.dataset.go, JSON.parse(el.dataset.p || '{}')); };
    });
  };
};

/* ---------- spend ---------- */
SCREENS.spend = function () {
  var month = typeof S.month === 'number' ? S.month : new Date().getMonth();
  var rows = S.spend.filter(function (x) { return new Date(x.t).getMonth() === month; });
  var spent = rows.reduce(function (a, x) { return a + Math.abs(x.amount); }, 0);
  var byCat = {};
  rows.forEach(function (x) { byCat[x.cat] = (byCat[x.cat] || 0) + Math.abs(x.amount); });
  var top = Object.keys(byCat).map(function (k) { return [k, byCat[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 4);
  var chart = top.map(function (pair) {
    return '<div style="margin-bottom:12px"><div class="between"><span class="small">' + esc(pair[0]) + '</span><span class="small mono">' + gbp(pair[1]) + '</span></div>' +
      '<div class="bar" style="margin-top:5px"><i style="width:' + ((pair[1] / spent) * 100).toFixed(1) + '%"></i></div></div>';
  }).join('');
  var list = rows.length ? rows.slice(0, 60).map(function (x) {
    return '<button class="item" data-go="tx" data-p=\'{"id":"' + x.id + '"}\'>' + logo(x.slug, x.name) +
      '<span class="grow"><span class="name">' + esc(x.name) + '</span><span class="sub">' + dt(x.t) + ' · ' + esc(x.cat) + '</span></span>' +
      '<span class="mono small">' + gbp(Math.abs(x.amount)) + '</span></button>';
  }).join('') : '<div class="item"><span class="grow"><span class="name">Nothing here yet</span><span class="sub">Spending appears as it clears</span></span></div>';
  return '<div class="between"><h1>Spend</h1><button class="icon-btn" data-go="budgets" aria-label="Budgets"><svg viewBox="0 0 24 24"><path d="M4 18V9m5 9V5m5 13v-6m5 6v-9"/></svg></button></div>' +
    '<div class="between" style="margin-top:14px"><button class="icon-btn" id="prev" aria-label="Previous"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>' +
    '<div class="center"><p class="tiny muted">' + new Date(2026, month).toLocaleDateString('en-GB', { month: 'long' }) + '</p><h2 class="mono">' + gbp(spent) + '</h2></div>' +
    '<button class="icon-btn" id="next" aria-label="Next"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></div>' +
    (top.length ? '<div class="card flat" style="margin-top:16px">' + chart + '</div>' : '') +
    '<div class="between" style="margin:22px 0 10px"><h3>Transactions</h3><button class="small muted" data-go="recurring">Recurring</button></div>' +
    '<div class="list">' + list + '</div>';
};
AFTER.spend = function () {
  var m = typeof S.month === 'number' ? S.month : new Date().getMonth();
  $('#prev').onclick = function () { S.month = clamp(m - 1, 0, 11); render('spend', {}); };
  $('#next').onclick = function () { S.month = clamp(m + 1, 0, 11); render('spend', {}); };
};

SCREENS.tx = function (p) {
  var x = null;
  S.spend.forEach(function (t) { if (t.id === p.id) x = t; });
  if (!x) { go('spend', {}, true); return ''; }
  return header('Transaction') +
    '<div class="card center" style="padding:26px 18px">' + logo(x.slug, x.name) +
    '<h2 style="margin-top:12px">' + esc(x.name) + '</h2>' +
    '<h1 class="mono" style="margin-top:6px">' + gbp2(Math.abs(x.amount)) + '</h1>' +
    '<p class="tiny muted" style="margin-top:8px">' + dts(x.t) + '</p></div>' +
    '<div class="list" style="margin-top:14px">' +
    '<div class="item"><span class="grow"><span class="name">Category</span></span><span class="small muted">' + esc(x.cat) + '</span></div>' +
    '<div class="item"><span class="grow"><span class="name">Round-up</span></span><span class="small mono">' + gbp2(x.roundup || 0) + '</span></div>' +
    '<div class="item"><span class="grow"><span class="name">Card</span></span><span class="small muted">•••• 4417</span></div></div>' +
    '<button class="btn wide ghost" style="margin-top:14px" id="recat">Change category</button>' +
    '<button class="btn wide ghost" style="margin-top:10px" id="split">Split transaction</button>';
};
AFTER.tx = function (p) {
  var recat = $('#recat'), split = $('#split');
  if (recat) recat.onclick = function () {
    sheet('<h3>Category</h3><div class="row" style="flex-wrap:wrap;margin-top:12px;gap:8px">' + CATS.map(function (c) {
      return '<button class="chip" data-set="' + c + '">' + c + '</button>';
    }).join('') + '</div>');
    setTimeout(function () {
      var m = $('#modal');
      if (!m) return;
      Array.prototype.forEach.call(m.querySelectorAll('[data-set]'), function (b) {
        b.onclick = function () {
          S.spend.forEach(function (t) { if (t.id === p.id) t.cat = b.dataset.set; });
          save(); closeSheet(); toast('Category updated'); render('tx', p);
        };
      });
    }, 0);
  };
  if (split) split.onclick = function () {
    var x = null;
    S.spend.forEach(function (t) { if (t.id === p.id) x = t; });
    if (!x) return;
    var half = Math.round(Math.abs(x.amount) / 2 * 100) / 100;
    x.amount = -half; x.cat = 'Other';
    var copy = {}; for (var k in x) copy[k] = x[k];
    copy.id = uid(); copy.cat = 'Groceries';
    S.spend.unshift(copy);
    save(); toast('Split into two'); render('tx', p);
  };
};

SCREENS.budgets = function () {
  var rows = CATS.filter(function (c) { return S.budgets[c]; }).map(function (c) {
    var spent = 0;
    S.spend.forEach(function (x) { if (x.cat === c && new Date(x.t).getMonth() === new Date().getMonth()) spent += Math.abs(x.amount); });
    var lim = S.budgets[c];
    return '<div class="item"><span class="grow"><span class="name">' + esc(c) + '</span>' +
      '<span class="sub">' + gbp(spent) + ' of ' + gbp(lim) + '</span>' +
      '<div class="bar" style="margin-top:6px"><i style="width:' + clamp((spent / lim) * 100, 0, 100).toFixed(1) + '%;' + (spent > lim ? 'background:var(--neg)' : '') + '"></i></div></span></div>';
  }).join('');
  return header('Budgets', 'Monthly limits') + '<div class="list">' + rows + '</div>' +
    '<p class="tiny muted" style="margin-top:16px">Tap a category to set a limit</p>' +
    '<div class="row" style="flex-wrap:wrap;margin-top:10px;gap:8px">' + CATS.map(function (c) {
      return '<button class="chip" data-cat="' + c + '">' + esc(c) + '</button>';
    }).join('') + '</div>';
};
AFTER.budgets = function () {
  Array.prototype.forEach.call(view.querySelectorAll('[data-cat]'), function (b) {
    b.onclick = function () {
      var c = b.dataset.cat;
      sheet('<h3>' + esc(c) + ' budget</h3><label class="label" style="margin-top:12px">Monthly limit</label>' +
        '<input class="field mono" id="lim" inputmode="decimal" value="' + (S.budgets[c] || '') + '">' +
        '<button class="btn wide" style="margin-top:12px" id="setb">Save</button>');
      setTimeout(function () {
        var btn = $('#setb');
        if (btn) btn.onclick = function () {
          S.budgets[c] = Math.max(0, parseFloat($('#lim').value) || 0);
          save(); closeSheet(); render('budgets', {});
        };
      }, 0);
    };
  });
};

function detectRecurring(tx) {
  var by = {};
  tx.forEach(function (x) { (by[x.slug] = by[x.slug] || []).push(x); });
  return Object.keys(by).filter(function (k) { return by[k].length >= 3; }).map(function (k) {
    var l = by[k];
    var gaps = l.slice(1).map(function (x, i) { return (l[i].t - x.t) / 864e5; }).sort(function (a, b) { return a - b; });
    var cadence = gaps[Math.floor(gaps.length / 2)];
    var amounts = l.map(function (x) { return Math.abs(x.amount); });
    var spread = (Math.max.apply(null, amounts) - Math.min.apply(null, amounts)) / Math.max.apply(null, amounts);
    return { name: l[0].name, cadence: cadence, spread: spread, amount: amounts[0] };
  }).filter(function (x) { return x.cadence > 5 && x.cadence < 40 && x.spread < 0.12; });
}

SCREENS.recurring = function () {
  var found = detectRecurring(S.spend);
  var body = found.length ? '<div class="list">' + found.map(function (f) {
    return '<div class="item"><span class="grow"><span class="name">' + esc(f.name) + '</span>' +
      '<span class="sub">Every ~' + Math.round(f.cadence) + ' days · ' + gbp2(f.amount) + '</span></span>' +
      '<span class="chip">' + gbp2(f.amount * 12) + '/yr</span></div>';
  }).join('') + '</div>' : '<p class="muted small">Nothing recurring detected yet.</p>';
  return header('Recurring', 'Detected from your spending') + body;
};

/* ---------- pockets / scheduled ---------- */
SCREENS.pockets = function () {
  var rows = S.pockets.map(function (p) {
    return '<button class="item" data-go="pocket" data-p=\'{"id":"' + p.id + '"}\'>' +
      '<span class="logo" style="display:grid;place-items:center;background:var(--chip);font-size:19px">' + p.emoji + '</span>' +
      '<span class="grow"><span class="name">' + esc(p.name) + '</span><span class="sub">' + gbp(p.saved) + ' of ' + gbp(p.goal) + '</span>' +
      '<div class="bar" style="margin-top:6px"><i style="width:' + clamp((p.saved / p.goal) * 100, 0, 100).toFixed(1) + '%"></i></div></span></button>';
  }).join('');
  return header('Pockets', 'Money set aside') + '<div class="list">' + rows + '</div>' +
    '<button class="btn wide" style="margin-top:16px" id="new">New pocket</button>' +
    '<button class="btn wide ghost" style="margin-top:10px" data-go="sched">Scheduled transfers</button>';
};
AFTER.pockets = function () {
  $('#new').onclick = function () {
    sheet('<h3>New pocket</h3><label class="label" style="margin-top:12px">Name</label><input class="field" id="pn">' +
      '<label class="label" style="margin-top:12px">Goal</label><input class="field mono" id="pg" inputmode="decimal">' +
      '<button class="btn wide" style="margin-top:12px" id="mk">Create</button>');
    setTimeout(function () {
      var b = $('#mk');
      if (b) b.onclick = function () {
        var n = $('#pn').value.trim();
        if (!n) return toast('Name it first');
        S.pockets.push({ id: uid(), name: n, goal: Math.max(50, parseFloat($('#pg').value) || 500), saved: 0, emoji: '\uD83C\uDFAF' });
        save(); closeSheet(); render('pockets', {});
      };
    }, 0);
  };
};

SCREENS.pocket = function (p) {
  var pk = null;
  S.pockets.forEach(function (x) { if (x.id === p.id) pk = x; });
  if (!pk) { go('pockets', {}, true); return ''; }
  return header(pk.name) +
    '<div class="card center"><div style="font-size:44px">' + pk.emoji + '</div>' +
    '<h1 class="mono" style="margin-top:8px">' + gbp(pk.saved) + '</h1>' +
    '<p class="small muted">Goal ' + gbp(pk.goal) + '</p>' +
    '<div class="bar" style="margin-top:12px"><i style="width:' + clamp((pk.saved / pk.goal) * 100, 0, 100).toFixed(1) + '%"></i></div></div>' +
    '<button class="btn wide" style="margin-top:14px" id="add">Add money</button>' +
    '<button class="btn wide ghost" style="margin-top:10px" id="edit">Edit goal</button>';
};
AFTER.pocket = function (p) {
  $('#add').onclick = function () {
    var pk = null;
    S.pockets.forEach(function (x) { if (x.id === p.id) pk = x; });
    if (!pk) return;
    sheet('<h3>Add to ' + esc(pk.name) + '</h3><label class="label" style="margin-top:12px">Amount</label>' +
      '<input class="field mono" id="pa" inputmode="decimal" value="25">' +
      '<button class="btn wide" style="margin-top:12px" id="ok">Move from cash</button>');
    setTimeout(function () {
      var b = $('#ok');
      if (b) b.onclick = function () {
        var v = parseFloat($('#pa').value) || 0;
        if (v > S.cash) return toast('Not enough cash');
        pk.saved += v; S.cash -= v; save(); closeSheet(); toast('Moved'); render('pocket', p);
      };
    }, 0);
  };
  $('#edit').onclick = function () {
    var pk = null;
    S.pockets.forEach(function (x) { if (x.id === p.id) pk = x; });
    if (!pk) return;
    sheet('<h3>Goal</h3><input class="field mono" id="pg" inputmode="decimal" value="' + pk.goal + '">' +
      '<button class="btn wide" style="margin-top:12px" id="ok">Save</button>');
    setTimeout(function () {
      var b = $('#ok');
      if (b) b.onclick = function () { pk.goal = Math.max(50, parseFloat($('#pg').value) || 500); save(); closeSheet(); render('pocket', p); };
    }, 0);
  };
};

SCREENS.sched = function () {
  var rows = S.sched.length ? '<div class="list">' + S.sched.map(function (s) {
    return '<div class="item"><span class="grow"><span class="name">' + esc(s.label) + '</span>' +
      '<span class="sub">' + esc(s.when) + ' · ' + gbp2(s.amount) + '</span></span>' +
      '<button class="chip" data-del="' + s.id + '">Stop</button></div>';
  }).join('') + '</div>' : '<p class="muted small">No scheduled transfers.</p>';
  return header('Scheduled', 'Automatic transfers') + rows +
    '<button class="btn wide" style="margin-top:16px" id="new">Schedule a transfer</button>';
};
AFTER.sched = function () {
  $('#new').onclick = function () {
    sheet('<h3>Schedule a transfer</h3><label class="label" style="margin-top:12px">Label</label><input class="field" id="sl" value="Weekly invest">' +
      '<label class="label" style="margin-top:12px">Amount</label><input class="field mono" id="sa" inputmode="decimal" value="20">' +
      '<label class="label" style="margin-top:12px">When</label>' +
      '<select class="field" id="sw"><option>Every Monday</option><option>Every payday</option><option>1st of the month</option></select>' +
      '<button class="btn wide" style="margin-top:12px" id="ok">Schedule</button>');
    setTimeout(function () {
      var b = $('#ok');
      if (b) b.onclick = function () {
        S.sched.push({ id: uid(), label: $('#sl').value || 'Transfer', amount: parseFloat($('#sa').value) || 20, when: $('#sw').value });
        save(); closeSheet(); render('sched', {});
      };
    }, 0);
  };
  Array.prototype.forEach.call(view.querySelectorAll('[data-del]'), function (b) {
    b.onclick = function () {
      S.sched = S.sched.filter(function (s) { return s.id !== b.dataset.del; });
      save(); render('sched', {});
    };
  });
};

/* ---------- brain ---------- */
SCREENS.brain = function () {
  if (!S.rules) {
    S.rules = [
      { id: 'sweep', label: 'Weekly sweep', detail: 'Move £8 to Emergency fund each Monday', on: true },
      { id: 'roundup', label: 'Round-ups', detail: 'Invest spare change from every purchase', on: true },
      { id: 'cap', label: 'Spending cap', detail: 'Pause investing if Eating out passes £260', on: true }
    ];
    S.swept = S.swept || 214.4; S.roundups = S.roundups || 38.12;
    save();
  }
  var rows = S.rules.map(function (r) {
    return '<div class="item"><span class="grow"><span class="name">' + esc(r.label) + '</span><span class="sub">' + esc(r.detail) + '</span></span>' +
      '<button class="chip ' + (r.on ? 'on' : '') + '" data-rule="' + r.id + '">' + (r.on ? 'On' : 'Off') + '</button></div>';
  }).join('');
  return '<h1>Brain</h1><p class="muted small" style="margin-top:6px">Rules that run your money for you</p>' +
    '<div class="list" style="margin-top:16px">' + rows + '</div>' +
    '<div class="card flat" style="margin-top:16px"><p class="tiny muted">This month</p>' +
    '<div class="between" style="margin-top:6px"><span class="small">Swept to pockets</span><span class="mono small">' + gbp(S.swept || 0) + '</span></div>' +
    '<div class="between" style="margin-top:6px"><span class="small">Round-ups invested</span><span class="mono small">' + gbp(S.roundups || 0) + '</span></div></div>';
};
AFTER.brain = function () {
  Array.prototype.forEach.call(view.querySelectorAll('[data-rule]'), function (b) {
    b.onclick = function () {
      S.rules.forEach(function (r) { if (r.id === b.dataset.rule) r.on = !r.on; });
      save(); render('brain', {});
    };
  });
};

/* ---------- profile ---------- */
SCREENS.profile = function () {
  var links = [['personal', 'Personal details'], ['banks', 'Bank accounts'], ['cards', 'Cards'],
    ['docs', 'Documents'], ['history', 'History since 1992'], ['subs', 'Subscription'],
    ['prefs', 'Notifications'], ['theme', 'Appearance']].map(function (pair) {
      return '<button class="item" data-go="' + pair[0] + '"><span class="grow"><span class="name">' + pair[1] + '</span></span><span class="muted">›</span></button>';
    }).join('');
  return '<div class="between"><h1>Profile</h1><button class="icon-btn" data-go="theme" aria-label="Appearance"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg></button></div>' +
    '<div class="card" style="margin-top:14px;display:flex;align-items:center;gap:13px">' +
    '<div class="logo" style="display:grid;place-items:center;background:var(--violet);color:#fff;font-weight:800">JA</div>' +
    '<div><h3>' + esc(S.name) + '</h3><p class="small muted">' + esc(S.email) + '</p></div></div>' +
    '<p class="tiny muted" style="margin:22px 0 10px">Account</p><div class="list">' + links + '</div>' +
    '<p class="tiny muted" style="margin:22px 0 10px">Security</p><div class="list">' +
    '<button class="item" id="enrol"><span class="grow"><span class="name">Fingerprint</span><span class="sub">' + (S.bio ? 'Enrolled' : 'Not set up') + '</span></span><span class="muted">›</span></button>' +
    '<button class="item" id="changepin"><span class="grow"><span class="name">Change PIN</span></span><span class="muted">›</span></button>' +
    '<button class="item" data-go="legal"><span class="grow"><span class="name">Legal</span></span><span class="muted">›</span></button></div>' +
    '<button class="btn wide ghost" style="margin-top:20px" id="reset">Reset app</button>' +
    '<p class="tiny muted center" style="margin-top:16px">Plum · v18</p>';
};
AFTER.profile = function () {
  $('#enrol').onclick = function () {
    navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'Plum' },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: S.email, displayName: S.name },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000
      }
    }).then(function (cred) {
      if (!cred) return;
      S.bio = btoa(String.fromCharCode.apply(null, new Uint8Array(cred.rawId))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      save(); toast('Fingerprint enrolled'); render('profile', {});
    }).catch(function () { toast('Enrolment cancelled'); });
  };
  $('#changepin').onclick = function () {
    sheet('<h3>New PIN</h3><input class="field mono center" id="np" inputmode="numeric" maxlength="6" placeholder="6 digits" style="letter-spacing:.4em">' +
      '<button class="btn wide" style="margin-top:12px" id="ok">Save PIN</button>');
    setTimeout(function () {
      var b = $('#ok');
      if (b) b.onclick = function () {
        var v = $('#np').value;
        if (!/^\d{6}$/.test(v)) return toast('Six digits');
        hashPin(v).then(function (p) { S.pin = p; save(); closeSheet(); toast('PIN updated'); });
      };
    }, 0);
  };
  $('#reset').onclick = function () {
    localStorage.removeItem(KEY); localStorage.removeItem(BAK);
    stack = []; S = freshState(); save(); go('onb1', {}, true);
  };
};

SCREENS.theme = function () {
  var t = [['system', 'Match device'], ['light', 'Light'], ['dark', 'Dark']].map(function (pair) {
    return '<button class="item" data-theme="' + pair[0] + '"><span class="grow"><span class="name">' + pair[1] + '</span></span>' +
      '<span class="muted">' + (prefs.theme === pair[0] ? '✓' : '') + '</span></button>';
  }).join('');
  var l = [['system', 'Match theme'], ['light', 'Purple mark'], ['dark', 'White mark']].map(function (pair) {
    return '<button class="item" data-logo="' + pair[0] + '"><span class="grow"><span class="name">' + pair[1] + '</span></span>' +
      '<span class="muted">' + (prefs.logo === pair[0] ? '✓' : '') + '</span></button>';
  }).join('');
  return header('Appearance') + '<div class="list">' + t + '</div>' +
    '<p class="tiny muted" style="margin:20px 0 10px">Logo</p><div class="list">' + l + '</div>';
};
AFTER.theme = function () {
  Array.prototype.forEach.call(view.querySelectorAll('[data-theme]'), function (b) {
    b.onclick = function () { prefs.theme = b.dataset.theme; applyTheme(); render('theme', {}); };
  });
  Array.prototype.forEach.call(view.querySelectorAll('[data-logo]'), function (b) {
    b.onclick = function () { prefs.logo = b.dataset.logo; applyTheme(); render('theme', {}); };
  });
};

SCREENS.prefs = function () {
  var rows = [['fills', 'Order fills'], ['divs', 'Dividends'], ['spend', 'Spending alerts'], ['bills', 'Bill reminders'], ['product', 'Product news']].map(function (pair) {
    return '<div class="item"><span class="grow"><span class="name">' + pair[1] + '</span></span>' +
      '<button class="chip ' + (S.prefs.notif[pair[0]] ? 'on' : '') + '" data-notif="' + pair[0] + '">' + (S.prefs.notif[pair[0]] ? 'On' : 'Off') + '</button></div>';
  }).join('');
  return header('Notifications') + '<div class="list">' + rows + '</div>';
};
AFTER.prefs = function () {
  Array.prototype.forEach.call(view.querySelectorAll('[data-notif]'), function (b) {
    b.onclick = function () { S.prefs.notif[b.dataset.notif] = !S.prefs.notif[b.dataset.notif]; save(); render('prefs', {}); };
  });
};

SCREENS.notifs = function () {
  return header('Notifications') + '<p class="muted small">Nothing new right now.</p>';
};

SCREENS.personal = function () {
  return header('Personal details') +
    '<label class="label">Full name</label><input class="field" id="f-name" value="' + esc(S.name) + '">' +
    '<label class="label" style="margin-top:12px">Email</label><input class="field" id="f-email" value="' + esc(S.email) + '">' +
    '<label class="label" style="margin-top:12px">Phone</label><input class="field" id="f-phone" value="' + esc(S.phone) + '">' +
    '<label class="label" style="margin-top:12px">Address</label><input class="field" id="f-addr" value="' + esc(S.addr) + '">' +
    '<button class="btn wide" style="margin-top:16px" id="save">Save changes</button>';
};
AFTER.personal = function () {
  $('#save').onclick = function () {
    S.name = $('#f-name').value || S.name;
    S.email = $('#f-email').value || S.email;
    S.phone = $('#f-phone').value || S.phone;
    S.addr = $('#f-addr').value || S.addr;
    save(); toast('Saved');
  };
};

SCREENS.banks = function () {
  var rows = S.banks.map(function (b) {
    return '<div class="item"><span class="grow"><span class="name">' + esc(b.name) + '</span>' +
      '<span class="sub">' + esc(b.sort) + ' · •••• ' + esc(b.last4) + (b.primary ? ' · primary' : '') + '</span></span></div>';
  }).join('');
  return header('Bank accounts') + '<div class="list">' + rows + '</div>' +
    '<button class="btn wide" style="margin-top:16px" id="add">Add account</button>';
};
AFTER.banks = function () {
  $('#add').onclick = function () {
    S.banks.push({ id: uid(), name: 'Barclays', sort: '20-45-11', last4: String(1000 + Math.floor(Math.random() * 8999)), primary: false });
    save(); render('banks', {});
  };
};

SCREENS.cards = function () {
  return header('Cards') + S.cards.map(function (c) {
    return '<div class="card" style="margin-bottom:12px;background:linear-gradient(135deg,var(--violet),var(--violet-2));color:#fff;border:0">' +
      '<div class="between"><p class="tiny" style="opacity:.8">' + esc(c.type) + '</p><p class="tiny" style="opacity:.8">' + esc(c.net) + '</p></div>' +
      '<h2 class="mono" style="margin-top:24px;letter-spacing:.08em">•••• ' + esc(c.last4) + '</h2>' +
      '<p class="small" style="opacity:.85;margin-top:8px">' + esc(c.exp) + (c.frozen ? ' · frozen' : '') + '</p></div>' +
      '<div class="row"><button class="btn wide ghost" data-freeze="' + c.id + '">' + (c.frozen ? 'Unfreeze' : 'Freeze') + '</button>' +
      '<button class="btn wide ghost" data-go="cardsettings">Settings</button></div>';
  }).join('');
};
AFTER.cards = function () {
  Array.prototype.forEach.call(view.querySelectorAll('[data-freeze]'), function (b) {
    b.onclick = function () {
      S.cards.forEach(function (c) { if (c.id === b.dataset.freeze) c.frozen = !c.frozen; });
      save(); toast('Card updated'); render('cards', {});
    };
  });
};

SCREENS.cardsettings = function () {
  var rows = [['Online payments', 1], ['Contactless', 1], ['ATM withdrawals', 1], ['Gambling', 0], ['Overseas', 1]].map(function (pair) {
    return '<div class="item"><span class="grow"><span class="name">' + pair[0] + '</span></span>' +
      '<span class="chip ' + (pair[1] ? 'on' : '') + '">' + (pair[1] ? 'On' : 'Off') + '</span></div>';
  }).join('');
  return header('Card settings') + '<div class="list">' + rows + '</div>';
};

SCREENS.subs = function () {
  var rows = [['Basic', '£0', ''], ['Plus', '£3.99', '£1,000 fee-free'], ['Boost', '£7.99', 'Priority support'], ['Max', '£14.99', '0.15% fee']].map(function (t) {
    return '<button class="item" data-sub="' + t[0] + '"><span class="grow"><span class="name">' + t[0] + '</span>' +
      (t[2] ? '<span class="sub">' + t[2] + '</span>' : '') + '</span><span class="mono small">' + t[1] + '</span></button>';
  }).join('');
  return header('Subscription', 'Current plan') +
    '<div class="card" style="background:var(--ink);color:var(--cream)"><p class="tiny" style="opacity:.7">Your plan</p>' +
    '<h2 style="margin-top:4px">Plum ' + esc(S.sub) + '</h2>' +
    '<p class="small" style="opacity:.75;margin-top:8px">0.15% annual fee on invested balances</p></div>' +
    '<div class="list" style="margin-top:16px">' + rows + '</div>';
};
AFTER.subs = function () {
  Array.prototype.forEach.call(view.querySelectorAll('[data-sub]'), function (b) {
    b.onclick = function () { S.sub = b.dataset.sub; save(); toast('Plan changed'); render('subs', {}); };
  });
};

SCREENS.legal = function () {
  var rows = ['Terms of service', 'Privacy policy', 'Client agreement', 'Complaints'].map(function (l) {
    return '<div class="item"><span class="grow"><span class="name">' + l + '</span></span></div>';
  }).join('');
  return header('Legal') + '<div class="list">' + rows + '</div>';
};

SCREENS.docs = function () {
  return header('Documents') + '<div class="list">' +
    '<button class="item" id="stmt"><span class="grow"><span class="name">Annual statement</span><span class="sub">PDF</span></span><span class="muted">›</span></button>' +
    '<button class="item" id="txstmt"><span class="grow"><span class="name">Transaction statement</span><span class="sub">PDF · 12 months</span></span><span class="muted">›</span></button>' +
    '<button class="item" id="tax"><span class="grow"><span class="name">Tax pack</span><span class="sub">PDF</span></span><span class="muted">›</span></button></div>';
};
AFTER.docs = function () {
  function mk(lines) {
    return function () { sharePdf(buildPdf(lines, 'Plum statement'), 'plum-statement.pdf'); toast('Preparing PDF'); };
  }
  $('#stmt').onclick = mk(['Account ' + S.acct, 'Holder ' + S.name, 'As at ' + dt(Date.now()), '', 'Holdings'].concat(
    S.holdings.map(function (h) { return '  ' + h.sym + '  ' + h.units.toFixed(4) + ' @ ' + h.price.toFixed(2) + '  ' + (h.units * h.price).toFixed(2); }),
    ['', 'Cash ' + S.cash.toFixed(2), 'Total ' + totalValue(S).toFixed(2)]));
  $('#txstmt').onclick = mk(['Transaction statement', ''].concat(
    S.tx.map(function (t) { return dt(t.t) + '  ' + t.kind + '  ' + t.name + '  ' + t.amount.toFixed(2); })));
  $('#tax').onclick = mk(['Tax pack', '', 'Contributions this year  ' + (20000 - 7411), 'Allowance remaining  7411']);
};

SCREENS.history = function () {
  var rows = buildHistory().map(function (r) {
    return '<div class="item"><span class="grow"><span class="name">' + r.y + ' · ' + r.wrapper + '</span>' +
      '<span class="sub">Added ' + gbp(r.contributed) + '</span></span><span class="mono small">' + gbp(r.bal) + '</span></div>';
  }).join('');
  return header('History', '1992 to today') +
    '<p class="small muted">Your money has moved through three tax wrappers. Contributions at each year\'s limit.</p>' +
    '<div class="list" style="margin-top:14px">' + rows + '</div>';
};
function buildHistory() {
  var rows = [], bal = TARGET;
  for (var y = 2026; y >= 1992; y--) {
    var wrapper = y < 1996 ? 'TESSA' : y < 1999 ? 'PEP' : 'ISA';
    var limit = y < 1996 ? 9000 : y < 1999 ? 6000 : Math.min(20000, 7000 + (y - 1999) * 650);
    var contributed = Math.round(Math.min(limit, bal * 0.055));
    rows.push({ y: y, wrapper: wrapper, contributed: contributed, bal: Math.round(bal) });
    bal = Math.max(400, Math.round((bal - contributed) / 1.072));
  }
  return rows;
}

/* ---------- pdf ---------- */
function buildPdf(lines, title) {
  var perPage = 46, pages = [], i;
  for (i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  var objs = [];
  function add(s) { objs.push(s); return objs.length; }
  var font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  var fontB = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  var pageIds = [], contentIds = [];
  function clean(s) { return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  pages.forEach(function (pg) {
    var s = 'BT /F2 15 Tf 56 780 Td (' + clean(title) + ') Tj ET\n';
    s += 'BT /F1 9 Tf 56 762 Td (Plum · ' + clean(S.acct) + ') Tj ET\n';
    pg.forEach(function (l, k) { s += 'BT /F1 9 Tf 56 ' + (740 - k * 14) + ' Td (' + clean(l) + ') Tj ET\n'; });
    s += 'BT /F1 8 Tf 56 40 Td (Page ' + (contentIds.length + 1) + ' of ' + pages.length + ') Tj ET\n';
    contentIds.push(add('<< /Length ' + s.length + ' >>\nstream\n' + s + 'endstream'));
  });
  var pagesId = objs.length + pages.length + 1;
  pages.forEach(function (c) {
    pageIds.push(add('<< /Type /Page /Parent ' + pagesId + ' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' + font + ' 0 R /F2 ' + fontB + ' 0 R >> >> /Contents ' + c + ' 0 R >>'));
  });
  var pagesObj = add('<< /Type /Pages /Count ' + pages.length + ' /Kids [' + pageIds.map(function (n) { return n + ' 0 R'; }).join(' ') + '] >>');
  var cat = add('<< /Type /Catalog /Pages ' + pagesObj + ' 0 R >>');
  var out = '%PDF-1.4\n', offsets = [];
  objs.forEach(function (o, n) { offsets.push(out.length); out += (n + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  var xref = out.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  offsets.forEach(function (o) { out += String(o).padStart(10, '0') + ' 00000 n \n'; });
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + cat + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  return new Blob([out], { type: 'application/pdf' });
}
function sharePdf(blob, name) {
  var file = new File([blob], name, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: name });
  else { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
}

/* ---------- ticks ---------- */
setInterval(function () {
  if (!S || !S.holdings) return;
  S.holdings.forEach(function (h) {
    h.price = Math.max(0.5, Math.round(h.price * (1 + (Math.random() - 0.499) * 0.0016) * 100) / 100);
  });
  var el = $('#total');
  if (!el) return;
  var total = totalValue(S);
  var ch = total - (S.open || total);
  el.textContent = gbp(total);
  var line = el.nextElementSibling;
  if (line) {
    line.className = 'small mono ' + (ch >= 0 ? 'pos' : 'neg');
    line.textContent = (ch >= 0 ? '▲' : '▼') + ' ' + gbp(Math.abs(ch)) + ' (' + pct((ch / (S.open || total)) * 100) + ') today';
  }
}, 2600);

/* ---------- boot ---------- */
function boot() {
  try { var p = JSON.parse(localStorage.getItem('plum_prefs') || '{}'); for (var k in p) prefs[k] = p[k]; } catch (e) { }
  applyTheme();

  S = load();
  if (!S) { S = freshState(); save(); }
  if (window.PLUM_LOGOS) { try { window.PLUM_LOGOS.mount(); } catch (e) { } }

  if (!S.onb) { stack = [{ name: 'onb1', params: {} }]; render('onb1'); }
  else { stack = [{ name: 'lock', params: {} }]; render('lock'); }

  Array.prototype.forEach.call(tabsEl.querySelectorAll('.tab'), function (a) {
    a.onclick = function () { stack = [{ name: a.dataset.tab, params: {} }]; render(a.dataset.tab); };
  });

  window.addEventListener('online', function () { $('#offline').hidden = true; });
  window.addEventListener('offline', function () { $('#offline').hidden = false; });
  if (!navigator.onLine) $('#offline').hidden = false;

  var idle;
  function reset() {
    clearTimeout(idle);
    idle = setTimeout(function () {
      if (S && S.onb) { stack = [{ name: 'lock', params: {} }]; render('lock'); }
    }, 300000);
  }
  ['touchstart', 'keydown', 'click'].forEach(function (ev) { document.addEventListener(ev, reset, { passive: true }); });
  reset();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', function () {
          if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Update ready — reopen to apply', 5000);
        });
      });
    }).catch(function () { });
  }
}

boot();
})();
