import { FUNDS, FUND_ALIASES, CATEGORY_IDS } from './data.js?v=34';

export const VERSION = 22;
export const KEY = 'monzo_v22';
export const LEGACY_KEYS = ['monzo_v21','monzo_v20','monzo_v19','monzo_v18','monzo_v17','monzo_v16','monzo_v15','monzo_v14','monzo_v13','monzo_v12','monzo_v11'];
export const ALL_KEYS = [KEY, ...LEGACY_KEYS];
export const MAX_CATCHUP_DAYS = 35;
export const PIN = '2580';

export const PLANS = {
  free:  {id:'free',  name:'Basic', price:0,  feeRate:0.0045, feeCap:250},
  plus:  {id:'plus',  name:'Plus',  price:5,  feeRate:0.0035, feeCap:250},
  perks: {id:'perks', name:'Perks', price:13, feeRate:0.0025, feeCap:200},
  max:   {id:'max',   name:'Max',   price:17, feeRate:0.0015, feeCap:200}
};

export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
export const now = () => Date.now();
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const round2 = n => Math.round((Number(n) || 0) * 100) / 100;

export function fmt(n, opts = {}) {
  const v = Math.abs(Number(n) || 0);
  const s = v.toLocaleString('en-GB', {
    minimumFractionDigits: opts.dp ?? 2,
    maximumFractionDigits: opts.dp ?? 2
  });
  return (n < 0 ? '-' : '') + '£' + s;
}

export function fmtShort(n) {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1000) return '£' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return fmt(n, {dp: v % 1 === 0 ? 0 : 2});
}

export function dateStr(ts) {
  return new Date(ts).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});
}
export function timeStr(ts) {
  return new Date(ts).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'});
}
export function dayKey(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
}
export function dayLabel(ts) {
  const d = new Date(ts), t = new Date();
  const diff = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) -
    new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'});
}

function defaultState() {
  const base = now();
  const mk = (name, amount, cat, daysAgo) => ({
    id: uid('tx'), name, amount, category: cat, ts: base - daysAgo * 86400000,
    type: amount > 0 ? 'in' : 'out'
  });
  return {
    v: VERSION,
    user: {
      name: 'Jason Armstrong', first: 'Jason', dob: '1992-10-07',
      email: 'jason.armstrong@example.com', phone: '07700 900412',
      address: '259 Piper Knowle Road', city: 'Stockton-on-Tees',
      postcode: 'TS19 8JQ', pin: PIN
    },
    balance: 4382.19,
    savings: 12980.00,
    pots: [
      {id:'pot_holiday', name:'Holiday', target:3000, saved:2400, emoji:'🏖️', colour:'#1f6feb', locked:false, roundUp:true, created:base - 240*86400000},
      {id:'pot_car', name:'Car service', target:1500, saved:1150, emoji:'🚗', colour:'#ff8000', locked:false, roundUp:false, created:base - 180*86400000},
      {id:'pot_xmas', name:'Christmas', target:1200, saved:640, emoji:'🎄', colour:'#12a150', locked:true, roundUp:true, created:base - 120*86400000},
      {id:'pot_house', name:'House deposit', target:20000, saved:8400, emoji:'🏠', colour:'#8b5cf6', locked:false, roundUp:true, created:base - 420*86400000}
    ],
    tx: [
      mk('Tesco', -42.18, 'groceries', 0),
      mk('Greggs', -4.85, 'eating', 0),
      mk('Salary', 5450.00, 'income', 1),
      mk('Northern', -8.40, 'transport', 1),
      mk('Amazon', -23.99, 'shopping', 2),
      mk('Octopus Energy', -178.00, 'bills', 3),
      mk('PureGym', -24.99, 'fitness', 4),
      mk('Cineworld', -31.50, 'entertainment', 5),
      mk('Boots', -12.45, 'health', 6)
    ],
    scheduled: [
      {id:uid('sch'), name:'Octopus Energy', amount:-178, category:'bills', day:12, freq:'monthly', next: base + 4*86400000},
      {id:uid('sch'), name:'PureGym', amount:-24.99, category:'fitness', day:20, freq:'monthly', next: base + 12*86400000},
      {id:uid('sch'), name:'TV Licence', amount:-13.25, category:'bills', day:1, freq:'monthly', next: base + 20*86400000}
    ],
    cards: [
      {id:uid('card'), label:'Coral', last4:'4821', type:'debit', frozen:false, virtual:false, network:'mastercard'}
    ],
    payees: [
      {id:uid('pay'), name:'Sophie Armstrong', sort:'04-00-04', acct:'12345678', initials:'SA'},
      {id:uid('pay'), name:'Liam Fletcher', sort:'20-45-11', acct:'87654321', initials:'LF'}
    ],
    flex: {limit: 2000, used: 214.40, plan: 'flex', active: true},
    plan: 'plus',
    plus: {since: base - 200*86400000, renews: base + 15*86400000},
    invest: {
      cash: 1240.00,
      units: {swda: 6000, cspx: 700, cukx: 5000, aggg: 5000, cash: 0},
      contrib: 750, contribDay: 1
    },
    pension: {provider:'Nest', balance: 184320.55, monthly: 480, employer: 240, growth: 0.055, joined: base - 4200*86400000},
    isa: {balance: 62480.00, allowance: 20000, used: 12000, contrib: 500, contribDay: 5},
    goals: [],
    layout: {
      order: ['card','balance','ring','carousel','activity'],
      hidden: [],
      carousel: ['pots','pension','isa']
    },
    settings: {
      notifications: true, marketing: false, biometrics: true,
      theme: 'system', reducedMotion: false, haptics: true,
      roundUpDefault: true, hideBalance: false
    },
    lastRun: base,
    seen: {welcome: true}
  };
}

const migrations = [
  {v: 21, fn: s => {
    if (s.aura) { s.plus = s.aura; delete s.aura; }
    if (s.plan === 'aura') s.plan = 'plus';
    return s;
  }},
  {v: 22, fn: s => s}
];

function num(...vals) {
  for (const v of vals) {
    const n = Number(v);
    if (isFinite(n) && n !== 0) return n;
  }
  return 0;
}

function normaliseUnits(raw) {
  const out = {};
  for (const f of FUNDS) out[f.id] = 0;
  if (!raw) return out;

  const put = (key, value) => {
    const k = String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const id = FUND_ALIASES[k] || (FUNDS.find(f => f.id === k) ? k : null);
    if (id) out[id] = (out[id] || 0) + (Number(value) || 0);
  };

  if (Array.isArray(raw)) {
    for (const h of raw) {
      if (!h || typeof h !== 'object') continue;
      const price = Number(h.price) || 0;
      const units = h.units !== undefined ? h.units
        : (h.quantity !== undefined ? h.quantity
        : (h.value !== undefined && price ? Number(h.value) / price : 0));
      put(h.id || h.symbol || h.ticker || h.fundId || h.name, units);
    }
    return out;
  }

  if (typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v === 'object') {
        const price = Number(v.price) || 0;
        const units = v.units !== undefined ? v.units
          : (v.quantity !== undefined ? v.quantity
          : (v.value !== undefined && price ? Number(v.value) / price : 0));
        put(v.id || v.symbol || v.ticker || k, units);
      } else {
        put(k, v);
      }
    }
  }
  return out;
}

export function normalise(input) {
  const s = (input && typeof input === 'object') ? input : defaultState();

  s.user = Object.assign({
    name: 'Jason Armstrong', first: 'Jason', dob: '1992-10-07', email: '',
    phone: '', address: '', city: '', postcode: '', pin: PIN
  }, s.user || {});
  if (!s.user.first && s.user.name) s.user.first = String(s.user.name).split(' ')[0];

  s.settings = Object.assign({
    notifications: true, marketing: false, biometrics: true, theme: 'system',
    reducedMotion: false, haptics: true, roundUpDefault: true, hideBalance: false
  }, s.settings || {});

  s.layout = s.layout || {};
  if (!Array.isArray(s.layout.order) || !s.layout.order.length) {
    s.layout.order = ['card','balance','ring','carousel','activity'];
  }
  if (!Array.isArray(s.layout.hidden)) s.layout.hidden = [];
  if (!Array.isArray(s.layout.carousel)) s.layout.carousel = ['pots','pension','isa'];

  const rawPots = Array.isArray(s.pots) ? s.pots
    : (Array.isArray(s.savingsPots) ? s.savingsPots
    : (Array.isArray(s.savings) ? s.savings : []));
  s.pots = rawPots.map(p => ({
    id: p.id || uid('pot'),
    name: p.name || 'Pot',
    target: num(p.target, p.goal, 100),
    saved: num(p.saved, p.balance, p.amount, p.value),
    emoji: p.emoji || '🏦',
    colour: p.colour || '#6b6b76',
    locked: !!p.locked,
    roundUp: !!p.roundUp,
    created: p.created || now()
  }));

  s.tx = Array.isArray(s.tx) ? s.tx
    : (Array.isArray(s.transactions) ? s.transactions : []);
  s.tx = s.tx.filter(t => t && typeof t === 'object').map(t => ({
    id: t.id || uid('tx'),
    name: t.name || t.merchant || t.description || 'Transaction',
    amount: Number(t.amount) || 0,
    category: t.category || 'general',
    ts: t.ts || t.date || t.timestamp || now(),
    type: (Number(t.amount) || 0) > 0 ? 'in' : 'out',
    note: t.note || '',
    receipt: t.receipt || null,
    potId: t.potId || null
  }));

  s.scheduled = Array.isArray(s.scheduled) ? s.scheduled
    : (Array.isArray(s.subscriptions) ? s.subscriptions : []);
  s.scheduled = s.scheduled.filter(x => x && typeof x === 'object');

  s.payees = Array.isArray(s.payees) ? s.payees : [];
  s.goals = Array.isArray(s.goals) ? s.goals : [];

  const rawCards = Array.isArray(s.cards) ? s.cards : [];
  s.cards = rawCards.length ? rawCards.map(c => ({
    id: c.id || uid('card'),
    label: c.label || 'Coral',
    last4: String(c.last4 || '4821'),
    type: c.type || 'debit',
    frozen: !!c.frozen,
    virtual: !!c.virtual,
    network: c.network || 'mastercard'
  })) : [{id: uid('card'), label:'Coral', last4:'4821', type:'debit', frozen:false, virtual:false, network:'mastercard'}];

  const acc = (s.account && typeof s.account === 'object') ? s.account : {};
  s.balance = num(s.balance, acc.balance, s.currentBalance, 0);
  s.savings = num(s.savingsBalance, 0);

  if (!s.flex) s.flex = {limit: 1000, used: 0, plan: 'flex', active: true};
  s.flex.limit = num(s.flex.limit, 1000);
  s.flex.used = num(s.flex.used, 0);

  if (!s.pension) s.pension = {};
  s.pension = Object.assign(
    {provider:'Nest', balance:0, monthly:0, employer:0, growth:0.055, joined: now()},
    s.pension
  );
  s.pension.balance = num(s.pension.balance, 0);

  if (!s.isa) s.isa = {};
  s.isa = Object.assign({balance:0, allowance:20000, used:0, contrib:0, contribDay:5}, s.isa);
  s.isa.balance = num(s.isa.balance, 0);

  const rawInvest = s.invest || s.investments || s.portfolio || {};
  const rawUnits = (rawInvest && typeof rawInvest === 'object')
    ? (rawInvest.units || rawInvest.holdings || rawInvest.positions || rawInvest)
    : {};
  s.invest = {
    cash: num(rawInvest && rawInvest.cash, 0),
    units: normaliseUnits(rawUnits),
    contrib: num(rawInvest && rawInvest.contrib, 0),
    contribDay: num(rawInvest && rawInvest.contribDay, 1)
  };
  delete s.investments;
  delete s.portfolio;

  if (!s.plan || !PLANS[s.plan]) s.plan = 'free';
  if (!s.plus) s.plus = {since: now(), renews: now()};
  if (typeof s.lastRun !== 'number') s.lastRun = now();
  if (!s.seen) s.seen = {};

  s.v = VERSION;
  return s;
}

export let state = normalise(defaultState());
export let recoveredFrom = null;

export function migrate(raw) {
  let s = raw;
  const from = Number(s && s.v) || 11;
  for (const m of migrations) if (from < m.v) s = m.fn(s);
  return s;
}

function portfolioOf(s) {
  const u = s && (s.invest || s.investments || s.portfolio);
  const units = u && (u.units || u.holdings || u.positions || u);
  if (!units || typeof units !== 'object') return 0;
  const norm = normaliseUnits(units);
  return FUNDS.reduce((a, f) => a + (norm[f.id] || 0) * f.price, 0);
}

function potTotalOf(s) {
  const list = Array.isArray(s && s.pots) ? s.pots
    : (Array.isArray(s && s.savingsPots) ? s.savingsPots : []);
  return list.reduce((a, p) => a + num(p && p.saved, p && p.balance, p && p.value), 0);
}

export function score(s) {
  if (!s || typeof s !== 'object') return 0;
  const txCount = Array.isArray(s.tx) ? s.tx.length
    : (Array.isArray(s.transactions) ? s.transactions.length : 0);
  const pots = Array.isArray(s.pots) ? s.pots.length : 0;
  const bal = num(s.balance, s.account && s.account.balance, 0);
  return bal + potTotalOf(s) + portfolioOf(s) + pots * 250 + txCount * 400;
}

function candidates() {
  const out = [];
  for (const k of ALL_KEYS) {
    let raw = null;
    try { raw = localStorage.getItem(k); } catch {}
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      out.push({key: k, data, score: score(data)});
    } catch {}
  }
  return out;
}

export function scan() {
  return candidates().map(c => ({
    key: c.key,
    score: c.score,
    balance: num(c.data && c.data.balance, 0),
    pots: Array.isArray(c.data && c.data.pots) ? c.data.pots.length : 0,
    portfolio: portfolioOf(c.data),
    tx: Array.isArray(c.data && c.data.tx) ? c.data.tx.length : 0
  })).sort((a, b) => b.score - a.score);
}

export function restoreFrom(key) {
  let raw = null;
  try { raw = localStorage.getItem(key); } catch {}
  if (!raw) return false;
  try {
    state = normalise(migrate(JSON.parse(raw)));
  } catch {
    return false;
  }
  recoveredFrom = key;
  save();
  return true;
}

export function recover() {
  const list = candidates();
  if (!list.length) return null;
  list.sort((a, b) => b.score - a.score);
  const best = list[0];
  const current = list.find(c => c.key === KEY);
  if (current && current.score >= best.score) return null;
  state = normalise(migrate(best.data));
  recoveredFrom = best.key;
  save();
  return best.key;
}

export function load() {
  const found = recover();
  if (found) return state;
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch {}
  if (!raw) { state = normalise(defaultState()); save(); return state; }
  try {
    state = normalise(migrate(JSON.parse(raw)));
  } catch {
    state = normalise(defaultState());
  }
  save();
  return state;
}

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, 120);
}

export function reset() {
  state = normalise(defaultState());
  recoveredFrom = null;
  save();
}

export function addTx({name, amount, category = 'general', ts = now(), note = '', receipt = null, potId = null}) {
  const tx = {
    id: uid('tx'), name, amount: round2(amount), category,
    ts, type: amount > 0 ? 'in' : 'out', note, receipt, potId
  };
  state.tx.unshift(tx);
  state.balance = round2(state.balance + tx.amount);
  save();
  return tx;
}

export function takeFunds(amount, from = 'balance') {
  const a = round2(amount);
  if (from === 'balance') {
    if (state.balance < a) return false;
    state.balance = round2(state.balance - a);
  } else if (from === 'savings') {
    if (state.savings < a) return false;
    state.savings = round2(state.savings - a);
  }
  save();
  return true;
}

export function potMove(potId, amount, dir) {
  const pot = state.pots.find(p => p.id === potId);
  if (!pot) return false;
  const a = round2(amount);
  if (dir === 'in') {
    if (!takeFunds(a)) return false;
    pot.saved = round2((pot.saved || 0) + a);
    addTx({name: pot.name + ' pot', amount: -a, category: 'transfers', potId});
  } else {
    if ((pot.saved || 0) < a) return false;
    pot.saved = round2(pot.saved - a);
    state.balance = round2(state.balance + a);
    addTx({name: pot.name + ' pot', amount: a, category: 'transfers', potId});
  }
  save();
  return true;
}

export function totalPots() {
  return round2(state.pots.reduce((s, p) => s + (p.saved || 0), 0));
}

export function planInfo(id = state.plan) {
  return PLANS[id] || PLANS.free;
}

export function portfolioValue() {
  return round2(FUNDS.reduce((s, f) => s + (state.invest.units[f.id] || 0) * f.price, 0));
}

export function platformFeeAnnual() {
  const p = planInfo();
  return round2(Math.min(portfolioValue() * p.feeRate, p.feeCap));
}
export function platformFeeMonthly() {
  return round2(platformFeeAnnual() / 12);
}

export const FLEX_MIN = 100;
export const FLEX_MONTHS = [3, 6, 12];

export function flexApr(amount, months) {
  if (months === 3 && amount >= FLEX_MIN) return 0;
  return 0.29;
}

export function flexPurchase(amount, months, name = 'Flex purchase') {
  const a = round2(amount);
  if (a < FLEX_MIN) return {ok:false, reason:'minimum'};
  if (!FLEX_MONTHS.includes(months)) return {ok:false, reason:'term'};
  const apr = flexApr(a, months);
  const total = round2(a * (1 + apr * (months / 12)));
  const per = round2(total / months);
  state.flex.used = round2(state.flex.used + a);
  addTx({name, amount: -a, category: 'general'});
  for (let i = 0; i < months; i++) {
    const when = now() + (i + 1) * 30 * 86400000;
    state.scheduled.push({
      id: uid('sch'), name: 'Flex · ' + name, amount: -per, category: 'finance',
      day: new Date(when).getDate(), freq: 'once', next: when, flex: true
    });
  }
  save();
  return {ok:true, per, total, apr};
}

export function investBuy(fundId, amount) {
  const f = FUNDS.find(x => x.id === fundId);
  if (!f) return false;
  const a = round2(amount);
  if (state.invest.cash < a) return false;
  state.invest.cash = round2(state.invest.cash - a);
  state.invest.units[fundId] = (state.invest.units[fundId] || 0) + a / f.price;
  save();
  return true;
}

export function investSell(fundId, amount) {
  const f = FUNDS.find(x => x.id === fundId);
  if (!f) return false;
  const units = state.invest.units[fundId] || 0;
  const held = round2(units * f.price);
  const a = Math.min(round2(amount), held);
  if (a <= 0) return false;
  state.invest.units[fundId] = units - a / f.price;
  state.invest.cash = round2(state.invest.cash + a);
  save();
  return true;
}

export function investDeposit(amount) {
  const a = round2(amount);
  if (!takeFunds(a)) return false;
  state.invest.cash = round2(state.invest.cash + a);
  save();
  return true;
}

export function pensionProjection() {
  const p = state.pension;
  const years = Math.max(0, 68 - (new Date().getFullYear() - new Date(p.joined).getFullYear()));
  const annual = (p.monthly + p.employer) * 12;
  let bal = p.balance;
  for (let i = 0; i < years; i++) bal = bal * (1 + p.growth) + annual;
  return {pot: round2(bal), years, annual};
}

export function runScheduled() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(state.lastRun || now());
  last.setHours(0, 0, 0, 0);
  const days = clamp(Math.round((today - last) / 86400000), 0, MAX_CATCHUP_DAYS);
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const cur = new Date(last.getTime() + d * 86400000);
    for (const s of state.scheduled) {
      if (s.freq === 'once') {
        const when = new Date(s.next);
        when.setHours(0, 0, 0, 0);
        if (when.getTime() === cur.getTime()) {
          addTx({name: s.name, amount: s.amount, category: s.category, ts: cur.getTime()});
          s.done = true;
          count++;
        }
      } else if (cur.getDate() === s.day) {
        addTx({name: s.name, amount: s.amount, category: s.category, ts: cur.getTime()});
        count++;
      }
    }
  }
  state.scheduled = state.scheduled.filter(s => !s.done);
  if (days > 0) {
    state.lastRun = now();
    for (const p of state.pots) if (p.roundUp) p.saved = round2((p.saved || 0) + 0.35);
    save();
  }
  return count;
}

export function upcoming() {
  const cutoff = now() + 7 * 86400000;
  return state.scheduled
    .filter(s => s.next <= cutoff && s.amount < 0)
    .reduce((s, x) => s + Math.abs(x.amount), 0);
}

export function leftToSpend() {
  return Math.max(0, round2(state.balance - upcoming()));
}

export function spentThisMonth() {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return round2(Math.abs(state.tx
    .filter(t => t.ts >= start && t.amount < 0 && t.category !== 'transfers')
    .reduce((s, t) => s + t.amount, 0)));
}

export function byCategory() {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const map = {};
  for (const t of state.tx) {
    if (t.ts < start || t.amount >= 0 || t.category === 'transfers') continue;
    map[t.category] = round2((map[t.category] || 0) + Math.abs(t.amount));
  }
  return map;
}

export function lastMonthByCategory() {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const map = {};
  for (const t of state.tx) {
    if (t.ts < start || t.ts >= end || t.amount >= 0) continue;
    map[t.category] = round2((map[t.category] || 0) + Math.abs(t.amount));
  }
  return map;
}

export function ensureCategory(id) {
  return CATEGORY_IDS.includes(id) ? id : 'general';
}
