import { FUNDS, CATEGORY_IDS } from './data.js?v=33';

export const VERSION = 22;
export const KEY = 'monzo_v22';
export const LEGACY_KEYS = ['monzo_v21','monzo_v20','monzo_v19','monzo_v18','monzo_v17','monzo_v16','monzo_v15','monzo_v14','monzo_v13','monzo_v12','monzo_v11'];
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
    balance: 1842.63,
    savings: 4210.00,
    pots: [
      {id:'pot_holiday', name:'Holiday', target:1500, saved:640, emoji:'🏖️', colour:'#1f6feb', locked:false, roundUp:true, created:base - 90*86400000},
      {id:'pot_car', name:'Car service', target:600, saved:310, emoji:'🚗', colour:'#ff8000', locked:false, roundUp:false, created:base - 60*86400000},
      {id:'pot_xmas', name:'Christmas', target:800, saved:120, emoji:'🎄', colour:'#12a150', locked:true, roundUp:true, created:base - 30*86400000}
    ],
    tx: [
      mk('Tesco', -42.18, 'groceries', 0),
      mk('Greggs', -4.85, 'eating', 0),
      mk('Salary', 2450.00, 'income', 1),
      mk('Northern', -8.40, 'transport', 1),
      mk('Amazon', -23.99, 'shopping', 2),
      mk('Octopus Energy', -78.00, 'bills', 3),
      mk('PureGym', -24.99, 'fitness', 4),
      mk('Cineworld', -31.50, 'entertainment', 5),
      mk('Boots', -12.45, 'health', 6)
    ],
    scheduled: [
      {id:uid('sch'), name:'Octopus Energy', amount:-78, category:'bills', day:12, freq:'monthly', next: base + 4*86400000},
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
    flex: {limit: 1000, used: 214.40, plan: 'flex', active: true},
    plan: 'plus',
    plus: {since: base - 200*86400000, renews: base + 15*86400000},
    invest: {cash: 320.00, units: {swda: 6.4, cspx: 0.8, cukx: 24, aggg: 60, cash: 0}, contrib: 120, contribDay: 1},
    pension: {provider:'Nest', balance: 18420.55, monthly: 240, employer: 120, growth: 0.055, joined: base - 1200*86400000},
    isa: {balance: 6320.00, allowance: 20000, used: 3400, contrib: 200, contribDay: 5},
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

export function normalise(input) {
  const s = (input && typeof input === 'object') ? input : defaultState();

  s.user = Object.assign({
    name: 'Jason Armstrong', first: 'Jason', dob: '1992-10-07', email: '',
    phone: '', address: '', city: '', postcode: '', pin: PIN
  }, s.user || {});

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

  if (!Array.isArray(s.pots)) s.pots = [];
  if (!Array.isArray(s.tx)) s.tx = [];
  if (!Array.isArray(s.scheduled)) s.scheduled = [];
  if (!Array.isArray(s.payees)) s.payees = [];
  if (!Array.isArray(s.goals)) s.goals = [];
  if (!Array.isArray(s.cards) || !s.cards.length) {
    s.cards = [{id: uid('card'), label:'Coral', last4:'4821', type:'debit', frozen:false, virtual:false, network:'mastercard'}];
  }

  if (typeof s.balance !== 'number' || !isFinite(s.balance)) s.balance = 0;
  if (typeof s.savings !== 'number') s.savings = 0;

  if (!s.flex) s.flex = {limit: 1000, used: 0, plan: 'flex', active: true};
  if (typeof s.flex.limit !== 'number') s.flex.limit = 1000;
  if (typeof s.flex.used !== 'number') s.flex.used = 0;

  if (!s.pension) s.pension = {};
  s.pension = Object.assign({provider:'Nest', balance:0, monthly:0, employer:0, growth:0.055, joined: now()}, s.pension);

  if (!s.isa) s.isa = {};
  s.isa = Object.assign({balance:0, allowance:20000, used:0, contrib:0, contribDay:5}, s.isa);

  if (!s.invest) s.invest = {};
  s.invest = Object.assign({cash:0, units:{}, contrib:0, contribDay:1}, s.invest);
  if (!s.invest.units) s.invest.units = {};
  for (const f of FUNDS) {
    if (typeof s.invest.units[f.id] !== 'number') s.invest.units[f.id] = 0;
  }

  if (!s.plan || !PLANS[s.plan]) s.plan = 'free';
  if (!s.plus) s.plus = {since: now(), renews: now()};
  if (typeof s.lastRun !== 'number') s.lastRun = now();
  if (!s.seen) s.seen = {};

  s.v = VERSION;
  return s;
}

export let state = normalise(defaultState());

export function migrate(raw) {
  let s = raw;
  const from = Number(s && s.v) || 11;
  for (const m of migrations) if (from < m.v) s = m.fn(s);
  return s;
}

export function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch {}
  if (!raw) {
    for (const k of LEGACY_KEYS) {
      try {
        const old = localStorage.getItem(k);
        if (old) { raw = old; break; }
      } catch {}
    }
  }
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
