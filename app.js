/* Plum — client app */
(() => {
'use strict';

const TARGET = 934745.32;
const CASH = 12480;
const KEY = 'plum_v18';
const BAK = 'plum_v18_bak';
const LOCK_KEY = 'plum_lock';

const $ = s => document.querySelector(s);
const view = $('#view');
const tabsEl = $('#tabs');
const gbp = n => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
const gbp2 = n => n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 });
const pct = n => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
const dt = t => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dts = t => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const uid = () => Math.random().toString(36).slice(2, 10);

const mulberry = seed => () => {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const seedOf = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };

/* ---------- funds ---------- */
const FUNDS = [
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

const CATS = ['Groceries', 'Eating out', 'Transport', 'Shopping', 'Bills', 'Health', 'Subscriptions', 'Entertainment', 'Other'];
const MERCHANTS = [
  { slug:'tesco', name:'Tesco', cat:'Groceries', band:[1800,8600], cad:6, dow:[2,5], w:1.0, s:{12:1.22,1:.82} },
  { slug:'sainsburys', name:"Sainsbury's", cat:'Groceries', band:[1400,6200], cad:11, dow:[3], w:.7, s:{12:1.18,1:.85} },
  { slug:'aldi', name:'Aldi', cat:'Groceries', band:[1200,4900], cad:14, dow:[6], w:.6, s:{12:1.1} },
  { slug:'lidl', name:'Lidl', cat:'Groceries', band:[1000,4200], cad:19, dow:[0], w:.45 },
  { slug:'waitrose', name:'Waitrose', cat:'Groceries', band:[2400,7800], cad:22, dow:[4], w:.35 },
  { slug:'ocado', name:'Ocado', cat:'Groceries', band:[3200,9400], cad:28, dow:[1], w:.3 },
  { slug:'pret', name:'Pret A Manger', cat:'Eating out', band:[420,1350], cad:1, dow:[1,2,3,4,5], w:.55, s:{1:.8} },
  { slug:'costa', name:'Costa Coffee', cat:'Eating out', band:[290,780], cad:1, dow:[1,2,3,4,5,6], w:.4 },
  { slug:'greggs', name:'Greggs', cat:'Eating out', band:[180,690], cad:2, dow:[1,2,3,4,5], w:.5, s:{1:1.3} },
  { slug:'starbucks', name:'Starbucks', cat:'Eating out', band:[340,860], cad:5, dow:[0,6], w:.3 },
  { slug:'nandos', name:"Nando's", cat:'Eating out', band:[1600,4200], cad:21, dow:[5,6], w:.5 },
  { slug:'deliveroo', name:'Deliveroo', cat:'Eating out', band:[1450,3900], cad:9, dow:[4,5,6], w:.45, s:{1:1.2,7:.8} },
  { slug:'mcdonalds', name:"McDonald's", cat:'Eating out', band:[540,1480], cad:8, dow:[5,6], w:.4 },
  { slug:'tfl', name:'TfL Travel', cat:'Transport', band:[280,940], cad:1, dow:[1,2,3,4,5], w:.8 },
  { slug:'trainline', name:'Trainline', cat:'Transport', band:[1450,8900], cad:26, dow:[4], w:.35, s:{7:1.4,8:1.4,12:1.5} },
  { slug:'uber', name:'Uber', cat:'Transport', band:[620,2800], cad:7, dow:[5,6], w:.4 },
  { slug:'shell', name:'Shell', cat:'Transport', band:[3800,7200], cad:13, dow:[6], w:.3 },
  { slug:'bp', name:'BP', cat:'Transport', band:[3400,6900], cad:17, dow:[3], w:.25 },
  { slug:'amazon', name:'Amazon', cat:'Shopping', band:[700,6400], cad:5, dow:[0,1,2,3,4,5,6], w:.85, s:{11:1.6,12:1.9,1:.7} },
  { slug:'asos', name:'ASOS', cat:'Shopping', band:[1900,8400], cad:24, dow:[6], w:.4, s:{11:1.5,12:1.4,1:.6} },
  { slug:'boots', name:'Boots', cat:'Health', band:[480,3400], cad:18, dow:[6], w:.45 },
  { slug:'apple', name:'Apple', cat:'Subscriptions', band:[299,1099], cad:30, dow:[1], w:1, fixed:true },
  { slug:'spotify', name:'Spotify', cat:'Subscriptions', band:[1199,1199], cad:30, dow:[4], w:1, fixed:true },
  { slug:'netflix', name:'Netflix', cat:'Subscriptions', band:[1099,1099], cad:30, dow:[6], w:1, fixed:true },
  { slug:'octopus', name:'Octopus Energy', cat:'Bills', band:[6400,15400], cad:30, dow:[2], w:1, s:{1:1.35,2:1.3,12:1.25} }
];

/* ---------- state ---------- */
let S = null;
let stack = [];
const prefs = { theme: 'system', logo: 'system', idle: 5 };

function freshState() {
  const st = {
    v: 18, acct: 'PLM-8842-1097', name: 'Jason Armstrong',
    email: 'jason.armstrong@proton.me', phone: '+44 7700 900412',
    dob: '1981-04-17', addr: '14 Ashcombe Gardens, London, SW12 8QT',
    cash: CASH, holdings: [], orders: [], tx: [], spend: [], pockets: [],
    budgets: {}, cards: [], sched: [], banks: [], docs: [],
    prefs: { notif: { fills: true, divs: true, spend: true, bills: true, product: false } },
    sub: 'Max', onb: false, pin: null, bio: null, idle: 5,
    open: null, openDay: new Date().toDateString(), seeded: 0, theme: 'system'
  };
  // prices, then units sized off TARGET so the total is exact
  const prices = {};
  FUNDS.forEach(f => { prices[f.sym] = f.price; });
  const budget = TARGET - CASH;
  let acc = 0;
  FUNDS.forEach((f, i) => {
    const last = i === FUNDS.length - 1;
    const value = last ? budget - acc : Math.round(budget * f.w * 100) / 100;
    acc += value;
    const units = Math.round((value / prices[f.sym]) * 10000) / 10000;
    st.holdings.push({
      sym: f.sym, name: f.name, sec: f.sec, risk: f.risk, units,
      price: prices[f.sym], cost: Math.round(prices[f.sym] * 0.71 * 100) / 100,
      dayOpen: prices[f.sym]
    });
  });
  st.cards.push({ id: uid(), last4: '4417', exp: '09/29', type: 'Debit', frozen: false, net: 'Visa' });
  st.banks.push({ id: uid(), name: 'Monzo', sort: '04-00-04', last4: '8842', primary: true });
  st.pockets.push(
    { id: uid(), name: 'Japan trip', goal: 4500, saved: 2180, emoji: '🗼' },
    { id: uid(), name: 'New kitchen', goal: 12000, saved: 6400, emoji: '🍳' },
    { id: uid(), name: 'Emergency fund', goal: 20000, saved: 9450, emoji: '🛟' }
  );
  CATS.forEach(c => { st.budgets[c] = 0; });
  st.budgets.Groceries = 420; st.budgets['Eating out'] = 260;
  st.budgets.Transport = 180; st.budgets.Shopping = 240;
  st.spend = seedSpend(365, 'plum-' + st.acct);
  st.tx = seedTx(st);
  st.open = totalValue(st) - 1840.22;
  return st;
}

const totalValue = st => st.cash + st.holdings.reduce((a, h) => a + h.units * h.price, 0);
const investedValue = st => st.holdings.reduce((a, h) => a + h.units * h.price, 0);
const costBasis = st => st.holdings.reduce((a, h) => a + h.units * h.cost, 0);

/* ---------- generators ---------- */
function seedSpend(days, seedStr) {
  const r = mulberry(seedOf(seedStr));
  const out = [];
  const today = new Date(); today.setHours(12, 0, 0, 0);
  for (let back = days; back >= 0; back--) {
    const d = new Date(today); d.setDate(d.getDate() - back);
    const dom = d.getDate(), dow = d.getDay(), month = d.getMonth() + 1;
    const splurge = (dom >= 27 || dom <= 2) ? 1.35 : 1;
    for (const m of MERCHANTS) {
      if (!m.dow.includes(dow)) continue;
      if (m.cad > 1 && r() > 1 / m.cad) continue;
      if (!m.fixed && r() > m.w) continue;
      let amt = m.fixed ? m.band[0] : Math.round(m.band[0] + (m.band[1] - m.band[0]) * ((r() + r() + r()) / 3));
      amt *= (m.s?.[month] ?? 1) * (m.cat === 'Eating out' || m.cat === 'Shopping' ? splurge : 1);
      if (!m.fixed) amt *= 0.9 + r() * 0.25;
      amt = Math.max(60, Math.round(amt));
      const t = new Date(d);
      t.setHours(7 + Math.floor(r() * 14), Math.floor(r() * 60), 0, 0);
      out.push({
        id: 's' + t.getTime() + m.slug, t: t.getTime(), slug: m.slug, name: m.name,
        cat: m.cat, amount: -(amt / 100),
        roundup: Math.round((Math.ceil(amt / 100) * 100 - amt)) / 100
      });
    }
  }
  return out.sort((a, b) => b.t - a.t);
}

function seedTx(st) {
  const r = mulberry(seedOf('tx' + st.acct));
  const out = [];
  const now = Date.now();
  for (let i = 0; i < 26; i++) {
    const back = Math.floor(r() * 330) + 2;
    const t = now - back * 864e5;
    const f = FUNDS[Math.floor(r() * FUNDS.length)];
    const kind = r() < 0.68 ? 'buy' : 'sell';
    const amt = Math.round((60 + r() * 1400) * 100) / 100;
    out.push({ id: uid(), t, kind, sym: f.sym, name: f.name, amount: amt, units: amt / f.price, status: 'done' });
  }
  for (let i = 0; i < 9; i++) {
    const f = FUNDS[Math.floor(r() * FUNDS.length)];
    out.push({ id: uid(), t: now - (Math.floor(r() * 300) + 3) * 864e5, kind: 'div', sym: f.sym, name: f.name, amount: Math.round((4 + r() * 90) * 100) / 100, units: 0, status: 'done' });
  }
  for (let m = 1; m <= 11; m++) {
    out.push({ id: uid(), t: now - m * 30.4 * 864e5, kind: 'fee', sym: '', name: 'Monthly fee', amount: 14.99, units: 0, status: 'done' });
  }
  return out.sort((a, b) => b.t - a.t);
}

function seriesFor(sym, points, drift) {
  const r = mulberry(seedOf(sym + points));
  const out = [];
  let v = 100;
  for (let i = 0; i < points; i++) {
    v += (r() - 0.5) * 3.4 + drift;
    out.push(Math.max(8, v));
  }
  return out;
}

/* ---------- persistence ---------- */
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
    if (Math.random() < 0.08) localStorage.setItem(BAK, JSON.stringify(S));
  } catch (e) { /* quota */ }
}
function load() {
  for (const k of [KEY, BAK]) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const st = JSON.parse(raw);
      if (!st || st.v !== 18 || !Array.isArray(st.holdings) || !st.holdings.length) continue;
      if (st.openDay !== new Date().toDateString()) {
        st.open = totalValue(st); st.openDay = new Date().toDateString();
      }
      return st;
    } catch (e) { localStorage.setItem(k + '_corrupt', localStorage.getItem(k) || ''); }
  }
  return null;
}

/* ---------- toast / sheet ---------- */
function toast(msg, ms = 2400) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), ms);
}
function sheet(html) {
  const m = $('#modal');
  m.innerHTML = `<div class="sheet"><div class="sheet-inner">${html}</div></div>`;
  m.hidden = false;
  m.querySelector('.sheet').addEventListener('click', e => { if (e.target.classList.contains('sheet')) closeSheet(); });
}
function closeSheet() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }
window.closeSheet = closeSheet;

/* ---------- theme ---------- */
function applyTheme() {
  const t = prefs.theme === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : prefs.theme;
  document.documentElement.dataset.theme = t;
  if (prefs.logo === 'system') delete document.documentElement.dataset.logo;
  else document.documentElement.dataset.logo = prefs.logo;
  document.querySelector('meta[name=theme-color]').content = t === 'dark' ? '#12071E' : '#FBF6E9';
  try { localStorage.setItem('plum_prefs', JSON.stringify(prefs)); } catch (e) {}
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/* ---------- router ---------- */
const SCREENS = {};
function go(name, params = {}, replace = false) {
  if (!replace) stack.push({ name, params });
  render(name, params);
}
function back() {
  stack.pop();
  const prev = stack[stack.length - 1];
  if (prev) render(prev.name, prev.params, true);
  else go('home', {}, true);
}
window.addEventListener('popstate', () => { if (stack.length > 1) back(); });

function render(name, params = {}) {
  const fn = SCREENS[name];
  if (!fn) return go('home', {}, true);
  view.className = 'view' + (['onb1','onb2','onb3','onb4','onb5','lock'].includes(name) ? ' no-tabs' : '');
  tabsEl.hidden = view.classList.contains('no-tabs');
  view.innerHTML = fn(params);
  view.classList.remove('fade'); void view.offsetWidth; view.classList.add('fade');
  const tab = ['home','invest','spend','brain','profile'].find(t => name.startsWith(t));
  tabsEl.querySelectorAll('.tab').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
  window.scrollTo(0, 0);
  wire(params);
}
function wire(params) {
  view.querySelectorAll('[data-go]').forEach(el => el.onclick = () => go(el.dataset.go, JSON.parse(el.dataset.p || '{}')));
  view.querySelectorAll('[data-back]').forEach(el => el.onclick = back);
}

/* ---------- shared bits ---------- */
const header = (title, sub) => `
  <div class="between" style="margin-bottom:18px">
    <button class="icon-btn" data-back aria-label="Back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
    <div style="text-align:center;flex:1"><h3>${esc(title)}</h3>${sub ? `<p class="tiny muted">${esc(sub)}</p>` : ''}</div>
    <span style="width:42px"></span>
  </div>`;

const brand = (size = 26) => `<span class="logo-lockup" style="width:${size}px;height:${size}px">
  <img class="logo-purple" src="icon-purple.svg" alt="Plum">
  <img class="logo-white" src="icon-white.svg" alt=""></span>`;

function spark(series, w = 300, h = 64, colour = 'var(--violet)') {
  const min = Math.min(...series), max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * w},${h - ((v - min) / span) * (h - 6) - 3}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block">
    <polyline points="${pts}" fill="none" stroke="${colour}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/* ---------- onboarding ---------- */
const ONB = [
  { e: '🍑', h: 'Your money, on autopilot', p: 'Plum moves a little into savings each week and invests what you can afford to grow.' },
  { e: '📈', h: 'Invest from £2', p: 'Build a global portfolio of funds and shares. Start small, stay consistent.' },
  { e: '🧠', h: 'The Brain does the maths', p: 'Rules that sweep spare change, top up pockets and trim spending when you overshoot.' },
  { e: '🔒', h: 'Locked down properly', p: 'Fingerprint unlock, a six-digit PIN and instant card freeze.' },
  { e: '💜', h: 'Ready when you are', p: 'Set up takes about two minutes. You can change everything later.' }
];
ONB.forEach((o, i) => {
  SCREENS['onb' + (i + 1)] = () => `
    <div style="min-height:88dvh;display:flex;flex-direction:column">
      <div class="between" style="padding-top:6px">${brand(30)}<span class="tiny muted">${i + 1} / 5</span></div>
      <div style="flex:1;display:grid;place-items:center;text-align:center;padding:20px 0">
        <div>
          <div style="font-size:72px;margin-bottom:22px">${o.e}</div>
          <h1>${o.h}</h1>
          <p class="muted" style="margin-top:14px;font-size:16px;max-width:300px">${o.p}</p>
        </div>
      </div>
      <button class="btn wide" data-go="${i === 4 ? 'lock' : 'onb' + (i + 2)}">${i === 4 ? 'Create my account' : 'Continue'}</button>
      ${i < 4 ? `<button class="btn wide ghost" style="margin-top:10px" data-go="lock">Skip</button>` : ''}
    </div>`;
});

/* ---------- lock ---------- */
SCREENS.lock = () => `
  <div style="min-height:90dvh;display:flex;flex-direction:column;justify-content:center;text-align:center">
    <div style="margin:0 auto 24px">${brand(84)}</div>
    <h2>Welcome back, Jason</h2>
    <p class="muted small" style="margin-top:8px">Unlock to see your money</p>
    <div id="lockmsg" class="small" style="min-height:20px;margin-top:18px;color:var(--neg)"></div>
    <button class="btn violet wide" id="bio" style="margin-top:14px">Use fingerprint</button>
    <button class="btn wide ghost" style="margin-top:10px" id="usepin">Use PIN</button>
    <div id="pinbox" hidden style="margin-top:18px">
      <input class="field mono center" id="pin" inputmode="numeric" maxlength="6" placeholder="••••••" style="letter-spacing:.5em;font-size:22px">
      <button class="btn wide" style="margin-top:12px" id="pinok">Unlock</button>
    </div>
  </div>`;

SCREENS.lock.after = () => {};
{
  const origLock = SCREENS.lock;
  SCREENS.lock = () => { const h = origLock(); setTimeout(wireLock, 0); return h; };
}
function wireLock() {
  const pin = $('#pin'), box = $('#pinbox'), msg = $('#lockmsg');
  $('#usepin').onclick = () => { box.hidden = false; pin.focus(); };
  const done = () => { stack = [{ name: 'home', params: {} }]; render('home'); };
  $('#pinok').onclick = async () => {
    if (!S.pin) { S.onb = true; S.pin = await hashPin('123456'); save(); return done(); }
    const h = await hashPin(pin.value, S.pin.salt);
    if (h === S.pin.hash) { S.fails = 0; save(); done(); }
    else { S.fails = (S.fails || 0) + 1; save(); msg.textContent = 'Wrong PIN'; }
  };
  $('#bio').onclick = async () => {
    if (!S.bio) { msg.textContent = 'No fingerprint enrolled — use your PIN'; box.hidden = false; return; }
    try {
      const cred = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ id: b64d(S.bio), type: 'public-key' }], userVerification: 'required', timeout: 30000 } });
      if (cred) done();
    } catch (e) { msg.textContent = 'Fingerprint not recognised'; }
  };
}
const b64d = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function hashPin(pin, saltB64) {
  const salt = saltB64 ? b64d(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, km, 256);
  return { hash: [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join(''), salt: btoa(String.fromCharCode(...salt)) };
}

/* ---------- home ---------- */
SCREENS.home = () => {
  const total = totalValue(S);
  const change = total - (S.open || total);
  const pctc = (change / (S.open || total)) * 100;
  const invest = investedValue(S);
  return `
    <div class="between" style="margin-bottom:6px">
      <div class="row">${brand(30)}<div><p class="tiny muted">Good ${greet()}</p><h3>Jason</h3></div></div>
      <div class="row">
        <button class="icon-btn" data-go="search" aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button>
        <button class="icon-btn" data-go="notifs" aria-label="Notifications"><svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9z"/><path d="M10 18a2 2 0 0 0 4 0"/></svg></button>
      </div>
    </div>
    <p class="tiny muted" style="margin-top:14px">Total balance</p>
    <h1 class="mono" style="font-size:40px" id="total">${gbp(total)}</h1>
    <p class="small ${change >= 0 ? 'pos' : 'neg'} mono">${change >= 0 ? '▲' : '▼'} ${gbp(Math.abs(change))} (${pct(pctc)}) today</p>
    ${spark(seriesFor('home', 40, change > 0 ? .3 : -.3), 320, 56, change >= 0 ? 'var(--pos)' : 'var(--neg)')}
    <div class="row" style="margin-top:16px">
      <button class="btn wide" data-go="order" data-p='{"kind":"buy"}'>Invest</button>
      <button class="btn wide ghost" data-go="pockets">Move</button>
    </div>
    <div class="card flat" style="margin-top:20px">
      <div class="between"><p class="tiny muted">Cash available</p><p class="tiny muted">Invested</p></div>
      <div class="between" style="margin-top:4px"><h3 class="mono">${gbp(S.cash)}</h3><h3 class="mono">${gbp(invest)}</h3></div>
      <div class="bar" style="margin-top:12px"><i style="width:${(invest / total) * 100}%"></i></div>
      <p class="small muted" style="margin-top:10px">${((invest / total) * 100).toFixed(1)}% of your money is invested</p>
    </div>
    <div class="between" style="margin:24px 0 12px"><h3>Your allowance</h3><span class="chip">${gbp2(allowanceLeft())} left</span></div>
    <div class="card flat">
      <div class="bar"><i style="width:${allowanceUsedPct()}%"></i></div>
      <p class="small muted" style="margin-top:10px">£${allowanceUsed().toLocaleString('en-GB')} of £20,000 used this tax year</p>
      <p class="tiny muted" style="margin-top:6px">Resets 6 April</p>
    </div>
    <div class="between" style="margin:24px 0 12px"><h3>Pockets</h3><button class="small muted" data-go="pockets">All</button></div>
    <div class="list">
      ${S.pockets.slice(0, 3).map(p => `
        <button class="item" data-go="pocket" data-p='{"id":"${p.id}"}'>
          <span class="logo" style="display:grid;place-items:center;background:var(--chip);font-size:19px">${p.emoji}</span>
          <span class="grow"><span class="name">${esc(p.name)}</span><span class="sub">${gbp(p.saved)} of ${gbp(p.goal)}</span></span>
          <span class="small muted mono">${Math.round((p.saved / p.goal) * 100)}%</span>
        </button>`).join('')}
    </div>
    <div class="between" style="margin:24px 0 12px"><h3>Recent</h3><button class="small muted" data-go="activity">All</button></div>
    <div class="list">
      ${S.tx.slice(0, 4).map(t => `
        <div class="item">
          <span class="logo" style="display:grid;place-items:center;background:var(--chip);font-weight:800;font-size:13px">${t.kind === 'buy' ? '↓' : t.kind === 'sell' ? '↑' : t.kind === 'div' ? '¤' : '£'}</span>
          <span class="grow"><span class="name">${esc(t.name)}</span><span class="sub">${dt(t.t)}</span></span>
          <span class="mono small ${t.kind === 'buy' ? '' : 'pos'}">${t.kind === 'buy' ? '-' : '+'}${gbp2(t.amount)}</span>
        </div>`).join('')}
    </div>`;
};
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'; };
const allowanceUsed = () => 20000 - 7411;
const allowanceLeft = () => 7411;
const allowanceUsedPct = () => ((20000 - 7411) / 20000) * 100;

/* ---------- invest ---------- */
SCREENS.invest = () => `
  <div class="between"><h1>Invest</h1><button class="icon-btn" data-go="search" aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button></div>
  <p class="muted small" style="margin-top:6px">${gbp(investedValue(S))} invested across ${S.holdings.length} funds</p>
  <div class="seg" style="margin-top:16px">
    <button class="on">Portfolio</button><button data-go="activity">Activity</button><button data-go="docs">Documents</button>
  </div>
  <div class="list" style="margin-top:16px">
    ${S.holdings.map(h => {
      const v = h.units * h.price;
      const ch = ((h.price - h.dayOpen) / h.dayOpen) * 100;
      return `<button class="item" data-go="detail" data-p='{"sym":"${h.sym}"}'>
        <span class="logo" style="display:grid;place-items:center;background:var(--chip);font-size:11px;font-weight:800">${h.sym}</span>
        <span class="grow"><span class="name">${esc(h.name)}</span><span class="sub">${h.sec} · risk ${h.risk}/5</span></span>
        <span style="text-align:right"><span class="mono small" style="display:block">${gbp(v)}</span>
        <span class="mono tiny ${ch >= 0 ? 'pos' : 'neg'}">${pct(ch)}</span></span>
      </button>`;
    }).join('')}
  </div>
  <button class="btn wide" style="margin-top:18px" data-go="order" data-p='{"kind":"buy"}'>Buy funds</button>`;

SCREENS.detail = ({ sym }) => {
  const h = S.holdings.find(x => x.sym === sym);
  if (!h) return go('invest', {}, true);
  const v = h.units * h.price;
  const pl = (h.price - h.cost) * h.units;
  const range = S.range || '1M';
  const pts = range === '1D' ? 40 : range === '1W' ? 56 : range === '1M' ? 90 : 240;
  const drift = range === '1Y' ? 0.22 : 0.1;
  return `${header(h.name, h.sec)}
    <h1 class="mono">${gbp2(h.price)}</h1>
    <p class="small ${((h.price - h.dayOpen) >= 0) ? 'pos' : 'neg'} mono">${pct(((h.price - h.dayOpen) / h.dayOpen) * 100)} today</p>
    ${spark(seriesFor(h.sym + range, pts, drift))}
    <div class="row" style="margin-top:12px">
      ${['1D','1W','1M','1Y'].map(r => `<button class="chip ${r === range ? 'on' : ''}" data-r="${r}">${r}</button>`).join('')}
    </div>
    <div class="card flat" style="margin-top:18px">
      <div class="between"><span class="small muted">Holding value</span><span class="mono">${gbp(v)}</span></div>
      <div class="between" style="margin-top:8px"><span class="small muted">Units</span><span class="mono">${h.units.toFixed(4)}</span></div>
      <div class="between" style="margin-top:8px"><span class="small muted">Average cost</span><span class="mono">${gbp2(h.cost)}</span></div>
      <div class="between" style="margin-top:8px"><span class="small muted">Profit / loss</span><span class="mono ${pl >= 0 ? 'pos' : 'neg'}">${gbp(pl)}</span></div>
    </div>
    <div class="row" style="margin-top:16px">
      <button class="btn wide" data-go="order" data-p='{"kind":"buy","sym":"${h.sym}"}'>Buy</button>
      <button class="btn wide ghost" data-go="order" data-p='{"kind":"sell","sym":"${h.sym}"}'>Sell</button>
    </div>
    <p class="tiny muted" style="margin-top:22px">About this fund</p>
    <p class="small muted" style="margin-top:6px">${h.name} tracks ${h.sec.toLowerCase()} markets. Accumulating, GBP hedged, OCF 0.07%. Capital at risk.</p>`;
};

/* ---------- order ---------- */
SCREENS.order = ({ kind = 'buy', sym }) => `
  ${header(kind === 'buy' ? 'Buy funds' : 'Sell funds', kind === 'buy' ? `Cash: ${gbp(S.cash)}` : `Holding: ${gbp(investedValue(S))}`)}
  <div class="seg"><button class="${kind === 'buy' ? 'on' : ''}" data-k="buy">Buy</button><button class="${kind === 'sell' ? 'on' : ''}" data-k="sell">Sell</button></div>
  <label class="label" style="margin-top:18px">Fund</label>
  <select class="field" id="fund">
    ${S.holdings.map(h => `<option value="${h.sym}" ${h.sym === sym ? 'selected' : ''}>${esc(h.name)} — ${gbp2(h.price)}</option>`).join('')}
  </select>
  <label class="label" style="margin-top:14px">Amount</label>
  <input class="field mono" id="amt" inputmode="decimal" placeholder="0.00" value="100">
  <div class="row" style="margin-top:10px">${[25,100,500,1000].map(v => `<button class="chip" data-amt="${v}">${gbp(v)}</button>`).join('')}</div>
  <div class="card flat" style="margin-top:18px">
    <div class="between"><span class="small muted">Estimated units</span><span class="mono" id="units">—</span></div>
    <div class="between" style="margin-top:8px"><span class="small muted">Dealing fee</span><span class="mono">£0.00</span></div>
  </div>
  <button class="btn wide violet" style="margin-top:18px" id="next">Review order</button>`;

/* ---------- review / receipt ---------- */
SCREENS.review = ({ kind, sym, amt }) => {
  const h = S.holdings.find(x => x.sym === sym);
  const units = amt / h.price;
  return `${header('Check your order')}
    <div class="card">
      <p class="tiny muted">${kind === 'buy' ? 'Buying' : 'Selling'}</p>
      <h2 style="margin-top:4px">${esc(h.name)}</h2>
      <hr class="hr">
      <div class="between"><span class="small muted">Amount</span><span class="mono">${gbp2(amt)}</span></div>
      <div class="between" style="margin-top:8px"><span class="small muted">Units at ${gbp2(h.price)}</span><span class="mono">${units.toFixed(4)}</span></div>
      <div class="between" style="margin-top:8px"><span class="small muted">Settlement</span><span class="small">Next dealing point</span></div>
    </div>
    <p class="tiny muted" style="margin-top:14px">Orders placed after 16:30 or at weekends fill at the next valuation point. You can cancel until then.</p>
    <button class="btn wide violet" style="margin-top:16px" id="confirm">Confirm ${kind === 'buy' ? 'buy' : 'sell'}</button>
    <button class="btn wide ghost" style="margin-top:10px" data-back>Back</button>`;
};

SCREENS.receipt = ({ id }) => {
  const o = S.orders.find(x => x.id === id);
  if (!o) return go('home', {}, true);
  return `${header('Order placed', o.status)}
    <div class="card center" style="padding:30px 18px">
      <div style="font-size:44px">${o.status === 'filled' ? '✅' : '⏳'}</div>
      <h2 style="margin-top:12px">${o.status === 'filled' ? 'Filled' : 'Queued'}</h2>
      <p class="muted small" style="margin-top:8px">${esc(o.name)} · ${gbp2(o.amount)}</p>
      <p class="tiny muted" style="margin-top:8px">Ref ${o.id.toUpperCase()}</p>
    </div>
    ${o.status !== 'filled' ? `<button class="btn wide ghost" style="margin-top:14px" id="undo">Cancel order</button>` : ''}
    <button class="btn wide" style="margin-top:10px" data-go="home">Done</button>`;
};

/* ---------- activity / search ---------- */
SCREENS.activity = () => `
  ${header('Activity', 'Trades, dividends and fees')}
  <input class="field" id="q" placeholder="Search activity">
  <div class="list" style="margin-top:12px" id="rows">
    ${S.tx.map(t => `<div class="item">
      <span class="logo" style="display:grid;place-items:center;background:var(--chip);font-weight:800;font-size:13px">${t.kind === 'buy' ? '↓' : t.kind === 'sell' ? '↑' : t.kind === 'div' ? '¤' : '£'}</span>
      <span class="grow"><span class="name">${esc(t.name)}</span><span class="sub">${dts(t.t)} · ${t.kind}</span></span>
      <span class="mono small ${t.kind === 'buy' ? '' : 'pos'}">${t.kind === 'buy' ? '-' : '+'}${gbp2(t.amount)}</span>
    </div>`).join('')}
  </div>`;

SCREENS.search = () => `
  ${header('Search')}
  <input class="field" id="q" placeholder="Funds, merchants, screens" autofocus>
  <div id="out" style="margin-top:12px"></div>`;

/* ---------- spend ---------- */
SCREENS.spend = () => {
  const month = S.month || new Date().getMonth();
  const rows = S.spend.filter(x => new Date(x.t).getMonth() === month);
  const spent = rows.reduce((a, x) => a + Math.abs(x.amount), 0);
  const byCat = {};
  rows.forEach(x => byCat[x.cat] = (byCat[x.cat] || 0) + Math.abs(x.amount));
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return `
    <div class="between"><h1>Spend</h1><button class="icon-btn" data-go="budgets" aria-label="Budgets"><svg viewBox="0 0 24 24"><path d="M4 18V9m5 9V5m5 13v-6m5 6v-9"/></svg></button></div>
    <div class="between" style="margin-top:14px">
      <button class="icon-btn" id="prev" aria-label="Previous month"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div class="center"><p class="tiny muted">${new Date(2026, month).toLocaleDateString('en-GB', { month: 'long' })}</p><h2 class="mono">${gbp(spent)}</h2></div>
      <button class="icon-btn" id="next" aria-label="Next month"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
    </div>
    ${top.length ? `<div class="card flat" style="margin-top:16px">
      ${top.map(([c, v]) => `<div style="margin-bottom:12px">
        <div class="between"><span class="small">${esc(c)}</span><span class="small mono">${gbp(v)}</span></div>
        <div class="bar" style="margin-top:5px"><i style="width:${(v / spent) * 100}%"></i></div>
      </div>`).join('')}
    </div>` : ''}
    <div class="between" style="margin:22px 0 10px"><h3>Transactions</h3><button class="small muted" data-go="recurring">Recurring</button></div>
    <div class="list">
      ${rows.length ? rows.slice(0, 60).map(x => `
        <button class="item" data-go="tx" data-p='{"id":"${x.id}"}'>
          ${PLUM_LOGOS.forMerchant(x.slug, x.name)}
          <span class="grow"><span class="name">${esc(x.name)}</span><span class="sub">${dt(x.t)} · ${esc(x.cat)}</span></span>
          <span class="mono small">${gbp(Math.abs(x.amount))}</span>
        </button>`).join('') : `<div class="item"><span class="grow"><span class="name">Nothing here yet</span><span class="sub">Spending will appear as it clears</span></span></div>`}
    </div>`;
};

SCREENS.tx = ({ id }) => {
  const x = S.spend.find(t => t.id === id);
  if (!x) return go('spend', {}, true);
  return `${header('Transaction')}
    <div class="card center" style="padding:26px 18px">
      ${PLUM_LOGOS.forMerchant(x.slug, x.name)}
      <h2 style="margin-top:12px">${esc(x.name)}</h2>
      <h1 class="mono" style="margin-top:6px">${gbp2(Math.abs(x.amount))}</h1>
      <p class="tiny muted" style="margin-top:8px">${dts(x.t)}</p>
    </div>
    <div class="list" style="margin-top:14px">
      <div class="item"><span class="grow"><span class="name">Category</span></span><span class="small muted">${esc(x.cat)}</span></div>
      <div class="item"><span class="grow"><span class="name">Round-up</span></span><span class="small mono">${gbp2(x.roundup || 0)}</span></div>
      <div class="item"><span class="grow"><span class="name">Card</span></span><span class="small muted">•••• 4417</span></div>
    </div>
    <button class="btn wide ghost" style="margin-top:14px" id="recat">Change category</button>
    <button class="btn wide ghost" style="margin-top:10px" id="split">Split transaction</button>`;

SCREENS.budgets = () => `
  ${header('Budgets', 'Monthly limits')}
  <div class="list">
    ${CATS.filter(c => S.budgets[c]).map(c => {
      const spent = S.spend.filter(x => x.cat === c && new Date(x.t).getMonth() === new Date().getMonth()).reduce((a, x) => a + Math.abs(x.amount), 0);
      const lim = S.budgets[c];
      const over = spent > lim;
      return `<div class="item"><span class="grow"><span class="name">${esc(c)}</span>
        <span class="sub">${gbp(spent)} of ${gbp(lim)}</span>
        <div class="bar" style="margin-top:6px"><i style="width:${clamp((spent / lim) * 100, 0, 100)}%;${over ? 'background:var(--neg)' : ''}"></i></div></span></div>`;
    }).join('')}
  </div>
  <p class="tiny muted" style="margin-top:16px">Tap a category below to set a limit</p>
  <div class="row" style="flex-wrap:wrap;margin-top:10px;gap:8px">
    ${CATS.map(c => `<button class="chip" data-cat="${c}">${esc(c)}</button>`).join('')}
  </div>`;

SCREENS.recurring = () => {
  const found = detectRecurring(S.spend);
  return `${header('Recurring', 'Detected from your spending')}
    ${found.length ? `<div class="list">${found.map(f => `
      <div class="item"><span class="grow"><span class="name">${esc(f.name)}</span>
      <span class="sub">Every ~${Math.round(f.cadence)} days · ${gbp2(f.amount)}</span></span>
      <span class="chip">${gbp2(f.amount * 12)}/yr</span></div>`).join('')}</div>`
      : `<p class="muted small">Nothing recurring detected yet.</p>`}`;
};

function detectRecurring(tx) {
  const by = {};
  tx.forEach(x => (by[x.slug] = by[x.slug] || []).push(x));
  return Object.entries(by).filter(([, l]) => l.length >= 3).map(([slug, l]) => {
    const gaps = l.slice(1).map((x, i) => (l[i].t - x.t) / 864e5).sort((a, b) => a - b);
    const cadence = gaps[Math.floor(gaps.length / 2)];
    const amounts = l.map(x => Math.abs(x.amount));
    const spread = (Math.max(...amounts) - Math.min(...amounts)) / Math.max(...amounts);
    return { slug, name: l[0].name, cadence, spread, amount: amounts[0] };
  }).filter(x => x.cadence > 5 && x.cadence < 40 && x.spread < 0.12);
}

/* ---------- pockets / scheduled ---------- */
SCREENS.pockets = () => `
  ${header('Pockets', 'Money set aside')}
  <div class="list">
    ${S.pockets.map(p => `
      <button class="item" data-go="pocket" data-p='{"id":"${p.id}"}'>
        <span class="logo" style="display:grid;place-items:center;background:var(--chip);font-size:19px">${p.emoji}</span>
        <span class="grow"><span class="name">${esc(p.name)}</span><span class="sub">${gbp(p.saved)} of ${gbp(p.goal)}</span>
        <div class="bar" style="margin-top:6px"><i style="width:${clamp((p.saved / p.goal) * 100, 0, 100)}%"></i></div></span>
      </button>`).join('')}
  </div>
  <button class="btn wide" style="margin-top:16px" id="new">New pocket</button>
  <button class="btn wide ghost" style="margin-top:10px" data-go="sched">Scheduled transfers</button>`;

SCREENS.pocket = ({ id }) => {
  const p = S.pockets.find(x => x.id === id);
  if (!p) return go('pockets', {}, true);
  return `${header(p.name)}
    <div class="card center"><div style="font-size:44px">${p.emoji}</div>
      <h1 class="mono" style="margin-top:8px">${gbp(p.saved)}</h1>
      <p class="small muted">Goal ${gbp(p.goal)}</p>
      <div class="bar" style="margin-top:12px"><i style="width:${clamp((p.saved / p.goal) * 100, 0, 100)}%"></i></div>
    </div>
    <button class="btn wide" style="margin-top:14px" id="add">Add money</button>
    <button class="btn wide ghost" style="margin-top:10px" id="edit">Edit goal</button>`;
};

SCREENS.sched = () => `
  ${header('Scheduled', 'Automatic transfers')}
  ${S.sched.length ? `<div class="list">${S.sched.map(s => `
    <div class="item"><span class="grow"><span class="name">${esc(s.label)}</span><span class="sub">${esc(s.when)} · ${gbp2(s.amount)}</span></span>
    <button class="chip" data-del="${s.id}">Stop</button></div>`).join('')}</div>`
    : `<p class="muted small">No scheduled transfers.</p>`}
  <button class="btn wide" style="margin-top:16px" id="new">Schedule a transfer</button>`;

/* ---------- brain ---------- */
SCREENS.brain = () => `
  <h1>Brain</h1>
  <p class="muted small" style="margin-top:6px">Rules that run your money for you</p>
  <div class="list" style="margin-top:16px">
    ${(S.rules || []).map(r => `
      <div class="item"><span class="grow"><span class="name">${esc(r.label)}</span><span class="sub">${esc(r.detail)}</span></span>
      <button class="chip ${r.on ? 'on' : ''}" data-rule="${r.id}">${r.on ? 'On' : 'Off'}</button></div>`).join('')}
  </div>
  <div class="card flat" style="margin-top:16px">
    <p class="tiny muted">This month</p>
    <div class="between" style="margin-top:6px"><span class="small">Swept to pockets</span><span class="mono small">${gbp(S.swept || 0)}</span></div>
    <div class="between" style="margin-top:6px"><span class="small">Round-ups invested</span><span class="mono small">${gbp(S.roundups || 0)}</span></div>
  </div>`;

/* ---------- profile ---------- */
SCREENS.profile = () => `
  <div class="between"><h1>Profile</h1><button class="icon-btn" data-go="theme" aria-label="Appearance"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg></button></div>
  <div class="card" style="margin-top:14px;display:flex;align-items:center;gap:13px">
    <div class="logo" style="display:grid;place-items:center;background:var(--violet);color:#fff;font-weight:800">JA</div>
    <div><h3>${esc(S.name)}</h3><p class="small muted">${esc(S.email)}</p></div>
  </div>
  <p class="tiny muted" style="margin:22px 0 10px">Account</p>
  <div class="list">
    ${[
      ['personal','Personal details'],['banks','Bank accounts'],['cards','Cards'],
      ['docs','Documents'],['history','History since 1992'],['subs','Subscription'],
      ['prefs','Notifications'],['theme','Appearance']
    ].map(([g, l]) => `<button class="item" data-go="${g}"><span class="grow"><span class="name">${l}</span></span><span class="muted">›</span></button>`).join('')}
  </div>
  <p class="tiny muted" style="margin:22px 0 10px">Security</p>
  <div class="list">
    <button class="item" id="enrol"><span class="grow"><span class="name">Fingerprint</span><span class="sub">${S.bio ? 'Enrolled' : 'Not set up'}</span></span><span class="muted">›</span></button>
    <button class="item" id="changepin"><span class="grow"><span class="name">Change PIN</span></span><span class="muted">›</span></button>
    <button class="item" data-go="legal"><span class="grow"><span class="name">Legal</span></span><span class="muted">›</span></button>
  </div>
  <button class="btn wide ghost" style="margin-top:20px" id="reset">Reset app</button>
  <p class="tiny muted center" style="margin-top:16px">Plum · v18</p>`;

SCREENS.theme = () => `
  ${header('Appearance')}
  <div class="list">
    ${[['system','Match device'],['light','Light'],['dark','Dark']].map(([v, l]) => `
      <button class="item" data-theme="${v}"><span class="grow"><span class="name">${l}</span></span>
      <span class="muted">${prefs.theme === v ? '✓' : ''}</span></button>`).join('')}
  </div>
  <p class="tiny muted" style="margin:20px 0 10px">Logo</p>
  <div class="list">
    ${[['system','Match theme'],['light','Purple mark'],['dark','White mark']].map(([v, l]) => `
      <button class="item" data-logo="${v}"><span class="grow"><span class="name">${l}</span></span>
      <span class="muted">${prefs.logo === v ? '✓' : ''}</span></button>`).join('')}
  </div>`;

SCREENS.prefs = () => `
  ${header('Notifications')}
  <div class="list">
    ${[['fills','Order fills'],['divs','Dividends'],['spend','Spending alerts'],['bills','Bill reminders'],['product','Product news']]
      .map(([k, l]) => `<div class="item"><span class="grow"><span class="name">${l}</span></span>
      <button class="chip ${S.prefs.notif[k] ? 'on' : ''}" data-notif="${k}">${S.prefs.notif[k] ? 'On' : 'Off'}</button></div>`).join('')}
  </div>`;

SCREENS.notifs = () => `
  ${header('Notifications')}
  ${(S.alerts || []).length ? `<div class="list">${S.alerts.map(a => `
    <div class="item"><span class="grow"><span class="name">${esc(a.title)}</span><span class="sub">${esc(a.body)}</span></span></div>`).join('')}</div>`
    : `<p class="muted small">Nothing new.</p>`}`;

SCREENS.personal = () => `
  ${header('Personal details')}
  <label class="label">Full name</label><input class="field" id="f-name" value="${esc(S.name)}">
  <label class="label" style="margin-top:12px">Email</label><input class="field" id="f-email" value="${esc(S.email)}">
  <label class="label" style="margin-top:12px">Phone</label><input class="field" id="f-phone" value="${esc(S.phone)}">
  <label class="label" style="margin-top:12px">Address</label><input class="field" id="f-addr" value="${esc(S.addr)}">
  <button class="btn wide" style="margin-top:16px" id="save">Save changes</button>`;

SCREENS.banks = () => `
  ${header('Bank accounts')}
  <div class="list">${S.banks.map(b => `<div class="item"><span class="grow">
    <span class="name">${esc(b.name)}</span><span class="sub">${esc(b.sort)} · •••• ${esc(b.last4)}${b.primary ? ' · primary' : ''}</span></span></div>`).join('')}</div>
  <button class="btn wide" style="margin-top:16px" id="add">Add account</button>`;

SCREENS.cards = () => `
  ${header('Cards')}
  ${S.cards.map(c => `
    <div class="card" style="margin-bottom:12px;background:linear-gradient(135deg,var(--violet),var(--violet-2));color:#fff;border:0">
      <div class="between"><p class="tiny" style="opacity:.8">${esc(c.type)}</p><p class="tiny" style="opacity:.8">${esc(c.net)}</p></div>
      <h2 class="mono" style="margin-top:24px;letter-spacing:.08em">•••• ${esc(c.last4)}</h2>
      <p class="small" style="opacity:.85;margin-top:8px">${esc(c.exp)}${c.frozen ? ' · frozen' : ''}</p>
    </div>
    <div class="row">
      <button class="btn wide ghost" data-freeze="${c.id}">${c.frozen ? 'Unfreeze' : 'Freeze'}</button>
      <button class="btn wide ghost" data-go="cardsettings">Settings</button>
    </div>`).join('')}`;

SCREENS.cardsettings = () => `
  ${header('Card settings')}
  <div class="list">
    ${[['Online payments',1],['Contactless',1],['ATM withdrawals',1],['Gambling',0],['Overseas',1]].map(([l, on]) => `
      <div class="item"><span class="grow"><span class="name">${l}</span></span><span class="chip ${on ? 'on' : ''}">${on ? 'On' : 'Off'}</span></div>`).join('')}
  </div>`;

SCREENS.subs = () => `
  ${header('Subscription', 'Current plan')}
  <div class="card" style="background:var(--ink);color:var(--cream)">
    <p class="tiny" style="opacity:.7">Your plan</p><h2 style="margin-top:4px">Plum ${esc(S.sub)}</h2>
    <p class="small" style="opacity:.75;margin-top:8px">0.15% annual fee on invested balances</p>
  </div>
  <div class="list" style="margin-top:16px">
    ${[['Basic','£0',null],['Plus','£3.99','£1,000 fee-free'],['Boost','£7.99','Priority support'],['Max','£14.99','0.15% fee']]
      .map(([n, p, d]) => `<button class="item" data-sub="${n}"><span class="grow"><span class="name">${n}</span>${d ? `<span class="sub">${d}</span>` : ''}</span>
      <span class="mono small">${p}</span></button>`).join('')}
  </div>`;

SCREENS.legal = () => `
  ${header('Legal')}
  <div class="list">
    ${['Terms of service','Privacy policy','Client agreement','Complaints'].map(l => `<div class="item"><span class="grow"><span class="name">${l}</span></span></div>`).join('')}
  </div>`;

SCREENS.docs = () => `
  ${header('Documents')}
  <div class="list">
    <button class="item" id="stmt"><span class="grow"><span class="name">Annual statement</span><span class="sub">PDF · ${new Date().getFullYear()}</span></span><span class="muted">›</span></button>
    <button class="item" id="txstmt"><span class="grow"><span class="name">Transaction statement</span><span class="sub">PDF · last 12 months</span></span><span class="muted">›</span></button>
    <button class="item" id="tax"><span class="grow"><span class="name">Tax pack</span><span class="sub">PDF</span></span><span class="muted">›</span></button>
  </div>`;

SCREENS.history = () => {
  const rows = buildHistory();
  return `${header('History', '1992 to today')}
    <p class="small muted">Your money has moved through three tax wrappers. Contributions at each year's limit.</p>
    <div class="list" style="margin-top:14px">
      ${rows.map(r => `<div class="item"><span class="grow"><span class="name">${r.y} · ${r.wrapper}</span>
        <span class="sub">Added ${gbp(r.contributed)}</span></span><span class="mono small">${gbp(r.bal)}</span></div>`).join('')}
    </div>`;
};

function buildHistory() {
  const rows = [];
  let bal = TARGET;
  for (let y = 2026; y >= 1992; y--) {
    const wrapper = y < 1996 ? 'TESSA' : y < 1999 ? 'PEP' : 'ISA';
    const limit = y < 1996 ? 9000 : y < 1999 ? 6000 : Math.min(20000, 7000 + (y - 1999) * 650);
    const contributed = Math.round(Math.min(limit, bal * 0.055));
    rows.push({ y, wrapper, contributed, bal: Math.round(bal) });
    bal = Math.max(400, Math.round((bal - contributed) / 1.072));
  }
  return rows;
}

/* ---------- PDF ---------- */
function buildPdf(lines, title) {
  const perPage = 46, pages = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  const objs = [];
  const add = s => (objs.push(s), objs.length);
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontB = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds = [], contentIds = [];
  pages.forEach(pg => {
    let s = 'BT /F2 16 Tf 56 780 Td (' + esc(title).replace(/[()\\]/g, m => '\\' + m) + ') Tj ET\n';
    s += 'BT /F1 9 Tf 56 762 Td (Plum · ' + S.acct + ') Tj ET\n';
    pg.forEach((l, i) => {
      s += `BT /F1 9 Tf 56 ${740 - i * 14} Td (${l.replace(/[()\\]/g, m => '\\' + m)}) Tj ET\n`;
    });
    s += `BT /F1 8 Tf 56 40 Td (Page ${contentIds.length + 1} of ${pages.length}) Tj ET\n`;
    contentIds.push(add(`<< /Length ${s.length} >>\nstream\n${s}endstream`));
  });
  const pagesId = objs.length + pages.length + 1;
  pages.forEach(c => pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontB} 0 R >> >> /Contents ${c} 0 R >>`)));
  const pagesObj = add(`<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map(i => i + ' 0 R').join(' ')}] >>`);
  const cat = add(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);
  let out = '%PDF-1.4\n', offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(o => out += String(o).padStart(10, '0') + ' 00000 n \n');
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: 'application/pdf' });
}
function sharePdf(blob, name) {
  const file = new File([blob], name, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) navigator.share({ files: [file], title: name });
  else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
}

/* ---------- event wiring per screen ---------- */
const AFTER = {
  detail(p) {
    view.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { S.range = b.dataset.r; save(); render('detail', p, true); });
  },
  order(p) {
    const amt = $('#amt'), units = $('#units'), fund = $('#fund');
    const calc = () => {
      const h = S.holdings.find(x => x.sym === fund.value);
      const v = parseFloat(amt.value) || 0;
      units.textContent = h ? (v / h.price).toFixed(4) + ' units' : '—';
    };
    amt.oninput = calc; fund.onchange = calc; calc();
    view.querySelectorAll('[data-amt]').forEach(b => b.onclick = () => { amt.value = b.dataset.amt; calc(); });
    view.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { p.kind = b.dataset.k; render('order', p, true); });
    $('#next').onclick = () => {
      const v = parseFloat(amt.value);
      if (!v || v < 2) return toast('Minimum is £2');
      if (p.kind === 'buy' && v > S.cash) return toast('Not enough cash');
      go('review', { kind: p.kind, sym: fund.value, amt: v });
    };
  },
  review(p) {
    $('#confirm').onclick = () => placeOrder(p);
  },
  receipt(p) {
    const u = $('#undo');
    if (u) u.onclick = () => {
      S.orders = S.orders.filter(o => o.id !== p.id);
      const h = S.holdings.find(x => x.sym === p.sym);
      if (h) { if (p.kind === 'buy') S.cash += p.amt; else S.cash -= p.amt; }
      save(); toast('Order cancelled'); go('home');
    };
  },
  activity() {
    const q = $('#q');
    q.oninput = () => {
      const v = q.value.toLowerCase();
      $('#rows').querySelectorAll('.item').forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(v) ? '' : 'none';
      });
    };
  },
  search() {
    const q = $('#q'), out = $('#out');
    q.oninput = () => {
      const v = q.value.toLowerCase().trim();
      if (!v) return out.innerHTML = '';
      const funds = S.holdings.filter(h => h.name.toLowerCase().includes(v) || h.sym.toLowerCase().includes(v));
      const merch = MERCHANTS.filter(m => m.name.toLowerCase().includes(v)).slice(0, 5);
      out.innerHTML = (funds.length ? `<p class="tiny muted">Funds</p><div class="list">${funds.map(h => `<button class="item" data-go="detail" data-p='{"sym":"${h.sym}"}'><span class="grow"><span class="name">${esc(h.name)}</span></span></button>`).join('')}</div>` : '')
        + (merch.length ? `<p class="tiny muted" style="margin-top:14px">Merchants</p><div class="list">${merch.map(m => `<div class="item">${PLUM_LOGOS.forMerchant(m.slug, m.name)}<span class="grow"><span class="name">${esc(m.name)}</span></span></div>`).join('')}</div>` : '');
      wire({});
    };
  },
  spend(p) {
    $('#prev').onclick = () => { S.month = clamp((S.month ?? new Date().getMonth()) - 1, 0, 11); render('spend', {}, true); };
    $('#next').onclick = () => { S.month = clamp((S.month ?? new Date().getMonth()) + 1, 0, 11); render('spend', {}, true); };
  },
  tx(p) {
    $('#recat').onclick = () => sheet(`<h3>Category</h3><div class="row" style="flex-wrap:wrap;margin-top:12px;gap:8px">${CATS.map(c => `<button class="chip" data-set="${c}">${c}</button>`).join('')}</div>`)
      || null;
    setTimeout(() => {
      $('#modal')?.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
        const x = S.spend.find(t => t.id === p.id);
        if (x) { x.cat = b.dataset.set; save(); closeSheet(); toast('Category updated'); render('tx', p, true); }
      });
    }, 0);
    $('#split').onclick = () => {
      const x = S.spend.find(t => t.id === p.id);
      if (!x) return;
      const half = Math.round(Math.abs(x.amount) / 2 * 100) / 100;
      x.amount = -half; x.cat = 'Other';
      S.spend.unshift({ ...x, id: uid(), cat: 'Groceries' });
      save(); closeSheet(); toast('Split into two'); render('tx', p, true);
    };
  },
  budgets() {
    view.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => {
      const c = b.dataset.cat;
      sheet(`<h3>${esc(c)} budget</h3><label class="label" style="margin-top:12px">Monthly limit</label>
        <input class="field mono" id="lim" inputmode="decimal" value="${S.budgets[c] || ''}">
        <button class="btn wide" style="margin-top:12px" id="setb">Save</button>`);
      setTimeout(() => {
        $('#setb').onclick = () => {
          S.budgets[c] = Math.max(0, parseFloat($('#lim').value) || 0);
          save(); closeSheet(); render('budgets', {}, true);
        };
      }, 0);
    });
  },
  pockets() {
    $('#new').onclick = () => {
      sheet(`<h3>New pocket</h3><label class="label" style="margin-top:12px">Name</label><input class="field" id="pn">
        <label class="label" style="margin-top:12px">Goal</label><input class="field mono" id="pg" inputmode="decimal">
        <button class="btn wide" style="margin-top:12px" id="mk">Create</button>`);
      setTimeout(() => {
        $('#mk').onclick = () => {
          const n = $('#pn').value.trim(); if (!n) return toast('Name it first');
          S.pockets.push({ id: uid(), name: n, goal: Math.max(50, parseFloat($('#pg').value) || 500), saved: 0, emoji: '🎯' });
          save(); closeSheet(); render('pockets', {}, true);
        };
      }, 0);
    };
  },
  pocket(p) {
    $('#add').onclick = () => {
      const pk = S.pockets.find(x => x.id === p.id);
      sheet(`<h3>Add to ${esc(pk.name)}</h3><label class="label" style="margin-top:12px">Amount</label>
        <input class="field mono" id="pa" inputmode="decimal" value="25">
        <button class="btn wide" style="margin-top:12px" id="ok">Move from cash</button>`);
      setTimeout(() => {
        $('#ok').onclick = () => {
          const v = parseFloat($('#pa').value) || 0;
          if (v > S.cash) return toast('Not enough cash');
          pk.saved += v; S.cash -= v; save(); closeSheet(); toast('Moved'); render('pocket', p, true);
        };
      }, 0);
    };
    $('#edit').onclick = () => {
      const pk = S.pockets.find(x => x.id === p.id);
      sheet(`<h3>Goal</h3><input class="field mono" id="pg" inputmode="decimal" value="${pk.goal}">
        <button class="btn wide" style="margin-top:12px" id="ok">Save</button>`);
      setTimeout(() => { $('#ok').onclick = () => { pk.goal = Math.max(50, parseFloat($('#pg').value) || 500); save(); closeSheet(); render('pocket', p, true); }; }, 0);
    };
  },
  sched() {
    $('#new').onclick = () => {
      sheet(`<h3>Schedule a transfer</h3><label class="label" style="margin-top:12px">Label</label><input class="field" id="sl" value="Weekly invest">
        <label class="label" style="margin-top:12px">Amount</label><input class="field mono" id="sa" inputmode="decimal" value="20">
        <label class="label" style="margin-top:12px">When</label>
        <select class="field" id="sw"><option>Every Monday</option><option>Every payday</option><option>1st of the month</option></select>
        <button class="btn wide" style="margin-top:12px" id="ok">Schedule</button>`);
      setTimeout(() => {
        $('#ok').onclick = () => {
          S.sched.push({ id: uid(), label: $('#sl').value || 'Transfer', amount: parseFloat($('#sa').value) || 20, when: $('#sw').value });
          save(); closeSheet(); render('sched', {}, true);
        };
      }, 0);
    };
    view.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      S.sched = S.sched.filter(s => s.id !== b.dataset.del); save(); render('sched', {}, true);
    });
  },
  brain() {
    if (!S.rules) {
      S.rules = [
        { id: 'sweep', label: 'Weekly sweep', detail: 'Move £8 to Emergency fund each Monday', on: true },
        { id: 'roundup', label: 'Round-ups', detail: 'Invest spare change from every purchase', on: true },
        { id: 'cap', label: 'Spending cap', detail: 'Pause investing if Eating out passes £260', on: true }
      ];
      S.swept = S.swept || 214.4; S.roundups = S.roundups || 38.12;
      save();
    }
    view.querySelectorAll('[data-rule]').forEach(b => b.onclick = () => {
      const r = S.rules.find(x => x.id === b.dataset.rule);
      r.on = !r.on; save(); render('brain', {}, true);
    });
  },
  profile() {
    $('#enrol').onclick = async () => {
      try {
        const cred = await navigator.credentials.create({ publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'Plum' },
          user: { id: crypto.getRandomValues(new Uint8Array(16)), name: S.email, displayName: S.name },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          timeout: 60000
        } });
        if (cred) { S.bio = btoa(String.fromCharCode(...new Uint8Array(cred.rawId))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); save(); toast('Fingerprint enrolled'); render('profile', {}, true); }
      } catch (e) { toast('Enrolment cancelled'); }
    };
    $('#changepin').onclick = () => {
      sheet(`<h3>New PIN</h3><input class="field mono center" id="np" inputmode="numeric" maxlength="6" placeholder="6 digits" style="letter-spacing:.4em">
        <button class="btn wide" style="margin-top:12px" id="ok">Save PIN</button>`);
      setTimeout(() => {
        $('#ok').onclick = async () => {
          const v = $('#np').value;
          if (!/^\d{6}$/.test(v)) return toast('Six digits');
          S.pin = await hashPin(v); save(); closeSheet(); toast('PIN updated');
        };
      }, 0);
    };
    $('#reset').onclick = () => {
      localStorage.removeItem(KEY); localStorage.removeItem(BAK);
      stack = []; S = freshState(); save(); go('onb1', {}, true);
    };
  },
  theme() {
    view.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { prefs.theme = b.dataset.theme; applyTheme(); render('theme', {}, true); });
    view.querySelectorAll('[data-logo]').forEach(b => b.onclick = () => { prefs.logo = b.dataset.logo; applyTheme(); render('theme', {}, true); });
  },
  prefs() {
    view.querySelectorAll('[data-notif]').forEach(b => b.onclick = () => {
      const k = b.dataset.notif; S.prefs.notif[k] = !S.prefs.notif[k]; save(); render('prefs', {}, true);
    });
  },
  personal() {
    $('#save').onclick = () => {
      S.name = $('#f-name').value || S.name;
      S.email = $('#f-email').value || S.email;
      S.phone = $('#f-phone').value || S.phone;
      S.addr = $('#f-addr').value || S.addr;
      save(); toast('Saved');
    };
  },
  banks() {
    $('#add').onclick = () => {
      S.banks.push({ id: uid(), name: 'Barclays', sort: '20-45-11', last4: String(1000 + Math.floor(Math.random() * 8999)), primary: false });
      save(); render('banks', {}, true);
    };
  },
  cards() {
    view.querySelectorAll('[data-freeze]').forEach(b => b.onclick = () => {
      const c = S.cards.find(x => x.id === b.dataset.freeze);
      c.frozen = !c.frozen; save(); toast(c.frozen ? 'Card frozen' : 'Card unfrozen'); render('cards', {}, true);
    });
  },
  subs() {
    view.querySelectorAll('[data-sub]').forEach(b => b.onclick = () => {
      S.sub = b.dataset.sub; save(); toast('Plan changed to ' + S.sub); render('subs', {}, true);
    });
  },
  docs() {
    const mk = lines => () => {
      sharePdf(buildPdf(lines, 'Plum statement'), 'plum-statement.pdf');
      toast('Preparing PDF');
    };
    $('#stmt').onclick = mk([
      `Account ${S.acct}`, `Holder ${S.name}`, `As at ${dt(Date.now())}`, '',
      'Holdings', ...S.holdings.map(h => `  ${h.sym.padEnd(8)} ${h.units.toFixed(4).padStart(12)} @ ${h.price.toFixed(2).padStart(9)}  ${(h.units * h.price).toFixed(2)}`),
      '', `Cash ${S.cash.toFixed(2)}`, `Total ${totalValue(S).toFixed(2)}`
    ]);
    $('#txstmt').onclick = mk(['Transaction statement', '', ...S.tx.map(t => `${dt(t.t)}  ${t.kind.toUpperCase().padEnd(5)} ${t.name}  ${t.amount.toFixed(2)}`)]);
    $('#tax').onclick = mk(['Tax pack', '', `Contributions this year  £${allowanceUsed().toLocaleString('en-GB')}`, `Allowance remaining  £${allowanceLeft().toLocaleString('en-GB')}`]);
  }
};

/* ---------- order placement ---------- */
function placeOrder({ kind, sym, amt }) {
  const h = S.holdings.find(x => x.sym === sym);
  if (!h) return;
  const id = uid();
  const order = { id, kind, sym, name: h.name, amount: amt, units: amt / h.price, t: Date.now(), status: 'queued' };
  S.orders.unshift(order);
  if (kind === 'buy') { S.cash -= amt; h.units += order.units; } else { S.cash += amt; h.units -= order.units; }
  S.tx.unshift({ id, t: Date.now(), kind, sym, name: h.name, amount: amt, units: order.units, status: 'queued' });
  save();
  go('receipt', { id }, true);
  setTimeout(() => {
    order.status = 'filled';
    const t = S.tx.find(x => x.id === id);
    if (t) t.status = 'filled';
    save();
    if (stack[stack.length - 1]?.name === 'receipt') render('receipt', { id }, true);
    toast('Order filled');
  }, 3200);
}

/* ---------- live ticks ---------- */
setInterval(() => {
  if (!S || !S.holdings) return;
  S.holdings.forEach(h => {
    const drift = (Math.random() - 0.499) * 0.0016;
    h.price = Math.max(0.5, Math.round(h.price * (1 + drift) * 100) / 100);
  });
  const el = $('#total');
  if (el) {
    const total = totalValue(S);
    el.textContent = gbp(total);
    const ch = total - (S.open || total);
    const p = el.parentElement.querySelector('.small');
    if (p) { p.className = 'small mono ' + (ch >= 0 ? 'pos' : 'neg'); p.textContent = `${ch >= 0 ? '▲' : '▼'} ${gbp(Math.abs(ch))} (${pct((ch / (S.open || total)) * 100)}) today`; }
  }
}, 2600);

/* ---------- boot ---------- */
function boot() {
  try { Object.assign(prefs, JSON.parse(localStorage.getItem('plum_prefs') || '{}')); } catch (e) {}
  applyTheme();
  S = load();
  if (!S) { S = freshState(); save(); stack = [{ name: 'onb1', params: {} }]; render('onb1'); }
  else if (!S.onb) { stack = [{ name: 'onb1', params: {} }]; render('onb1'); }
  else { stack = [{ name: 'lock', params: {} }]; render('lock'); }

  tabsEl.querySelectorAll('.tab').forEach(a => a.onclick = () => {
    stack = [{ name: a.dataset.tab, params: {} }];
    render(a.dataset.tab);
  });

  window.addEventListener('online', () => $('#offline').hidden = true);
  window.addEventListener('offline', () => $('#offline').hidden = false);
  if (!navigator.onLine) $('#offline').hidden = false;

  let idle;
  const reset = () => { clearTimeout(idle); idle = setTimeout(() => { if (S?.onb) { stack = [{ name: 'lock', params: {} }]; render('lock'); } }, (prefs.idle || 5) * 60000); };
  ['touchstart', 'keydown', 'click'].forEach(e => document.addEventListener(e, reset, { passive: true }));
  reset();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(r => {
      r.addEventListener('updatefound', () => {
        const w = r.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Update ready — close and reopen', 5000);
          }
        });
      });
    }).catch(() => {});
  }
}

/* hook AFTER handlers into render */
const baseRender = render;
render = function (name, params = {}, quiet) {
  baseRender(name, params, quiet);
  const fn = AFTER[name];
  if (fn) { try { fn(params); } catch (e) { console.warn(e); } }
};

boot();
})();
