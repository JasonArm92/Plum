import { FUNDS, CATEGORY_IDS } from './data.js?v=34';

export const VERSION = 23;
export const KEY = 'monzo_v23';
export const LEGACY_KEYS = ['monzo_v22','monzo_v21','monzo_v20','monzo_v19','monzo_v18','monzo_v17','monzo_v16','monzo_v15','monzo_v14','monzo_v13','monzo_v12','monzo_v11'];
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
  if (v >= 1000000) return '£' + (v / 1000000).toFixed(2).replace(/0$/, '') + 'm';
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

/* ---------- holdings seed ---------- */

const HOLDING_SEED = [
  ['f01', 18000], ['f02', 21500], ['f03', 16200], ['f04', 24800],
  ['f05', 13400], ['f06', 19700], ['f07', 22800], ['f08', 15100],
  ['f09', 26300], ['f10', 17600], ['f11', 20300], ['f12', 14400],
  ['f13', 23500], ['f14', 18900], ['f15', 27200], ['f16', 12500],
  ['f17', 21800], ['f18', 16600], ['f19', 25100], ['f20', 19300],
  ['f21', 15900], ['f22', 22600], ['f23', 18100], ['f24', 24400],
  ['f25', 13700], ['f26', 20900], ['f27', 17200], ['f28', 25800],
  ['f29', 14800], ['f30', 22100], ['f31', 19400], ['f32', 16500],
  ['f33', 23700], ['f34', 12900], ['f35', 20600], ['f36', 18300],
  ['f37', 25400], ['f38', 15600], ['f39', 21900], ['f40', 17800],
  ['f41', 23100], ['f42', 14200], ['f43', 24700], ['f44', 16900],
  ['f45', 21200], ['f46', 19100], ['f47', 15400], ['f48', 17545.44]
];

function seedHoldings() {
  return HOLDING_SEED.map(([f, v]) => ({f, v}));
}

function defaultState() {
  const base = now();
  const mk = (name, amount, cat, daysAgo, acct) => ({
    id: uid('tx'), name, amount, category: cat, ts: base - daysAgo * 86400000,
    type: amount > 0 ? 'in' : 'out', acct: acct || 'personal'
  });
  return {
    v: VERSION,
    user: {
      name: 'Jason Armstrong', first: 'Jason', dob: '1992-10-07',
      email: 'jason.armstrong@example.com', phone: '07700 900412',
      address: '259 Piper Knowle Road', city: 'Stockton-on-Tees',
      postcode: 'TS19 8JQ', pin: PIN
    },
    accounts: {
      personal: {id:'personal', name:'Personal', balance: 4823.70, card: {last4:'4821', frozen:false}},
      joint: {id:'joint', name:'Joint', balance: 7121.92, with:'Chloe Brown', card: {last4:'7734', frozen:false}}
    },
    active: 'personal',
    pots: [
      {id:'pot_holiday', name:'Holiday', target:6000, saved:4250.00, emoji:'🏖️', colour:'#1f6feb', locked:false, roundUp:true, created:base - 300*86400000},
      {id:'pot_car', name:'New car', target:12000, saved:6800.00, emoji:'🚗', colour:'#ff8000', locked:false, roundUp:false, created:base - 240*86400000},
      {id:'pot_xmas', name:'Christmas', target:2000, saved:1240.50, emoji:'🎄', colour:'#12a150', locked:true, roundUp:true, created:base - 120*86400000},
      {id:'pot_emerg', name:'Emergency fund', target:10000, saved:5000.00, emoji:'🛟', colour:'#d92d20', locked:false, roundUp:false, created:base - 400*86400000},
      {id:'pot_dep', name:'House deposit', target:20000, saved:2748.53, emoji:'🏠', colour:'#8b5cf6', locked:false, roundUp:true, created:base - 80*86400000},
      {id:'pot_gad', name:'Gadgets', target:3000, saved:1400.00, emoji:'💻', colour:'#0891b2', locked:false, roundUp:false, created:base - 60*86400000}
    ],
    tx: [
      mk('Tesco', -42.18, 'groceries', 0, 'joint'),
      mk('Greggs', -4.85, 'eating', 0),
      mk('Salary', 2450.00, 'income', 1),
      mk('Northern', -8.40, 'transport', 1),
      mk('Amazon', -23.99, 'shopping', 2),
      mk('Octopus Energy', -78.00, 'bills', 3, 'joint'),
      mk('PureGym', -24.99, 'fitness', 4),
      mk('Cineworld', -31.50, 'entertainment', 5, 'joint'),
      mk('Boots', -12.45, 'health', 6),
      mk('IKEA', -164.00, 'home', 7, 'joint'),
      mk('Spotify', -11.99, 'entertainment', 8),
      mk('Sainsburys', -63.40, 'groceries', 9, 'joint')
    ],
    scheduled: [
      {id:uid('sch'), name:'Octopus Energy', amount:-78, category:'bills', day:12, freq:'monthly', next: base + 4*86400000, acct:'joint'},
      {id:uid('sch'), name:'PureGym', amount:-24.99, category:'fitness', day:20, freq:'monthly', next: base + 12*86400000, acct:'personal'},
      {id:uid('sch'), name:'TV Licence', amount:-13.25, category:'bills', day:1, freq:'monthly', next: base + 20*86400000, acct:'personal'}
    ],
    cards: [
      {id:uid('card'), label:'Coral', last4:'4821', type:'debit', frozen:false, virtual:false, network:'mastercard'}
    ],
    payees: [
      {id:uid('pay'), name:'Sophie Armstrong', sort:'04-00-04', acct:'12345678', initials:'SA'},
      {id:uid('pay'), name:'Liam Fletcher', sort:'20-45-11', acct:'87654321', initials:'LF'},
      {id:uid('pay'), name:'Chloe Brown', sort:'30-96-14', acct:'55120934', initials:'CB'}
    ],
    flex: {limit: 1000, used: 214.40, plan: 'flex', active: true},
    plan: 'plus',
    plus: {since: base - 200*86400000, renews: base + 15*86400000},
    invest: {cash: 4120.60, holdings: seedHoldings(), contrib: 500, contribDay: 1},
    pension: {provider:'Nest', balance: 41280.55, monthly: 240, employer: 120, growth: 0.055, joined: base - 1200*86400000},
    isa: {balance: 18620.00, allowance: 20000, used: 3400, contrib: 200, contribDay: 5},
    goals: [],
    layout: {
      order: ['card','balance','ring','carousel','activity'],
      hidden: [],
      carousel: ['pots','invest','pension','isa']
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
  {v: 22, fn: s => s},
  {v: 23, fn: s => s}
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

  if (!s.accounts || typeof s.accounts !== 'object') {
    s.accounts = {
      personal: {id:'personal', name:'Personal', balance: 4823.70, card:{last4:'4821', frozen:false}},
      joint: {id:'joint', name:'Joint', balance: 7121.92, with:'Chloe Brown', card:{last4:'7734', frozen:false}}
    };
  }
  if (!s.accounts.personal) {
    s.accounts.personal = {id:'personal', name:'Personal', balance: 0, card:{last4:'4821', frozen:false}};
  }
  if (!s.accounts.joint) {
    s.accounts.joint = {id:'joint', name:'Joint', balance: 0, with:'Chloe Brown', card:{last4:'7734', frozen:false}};
  }
  for (const k of Object.keys(s.accounts)) {
    const a = s.accounts[k];
    a.id = k;
    if (typeof a.balance !== 'number' || !isFinite(a.balance)) a.balance = 0;
    if (!a.card) a.card = {last4: k === 'joint' ? '7734' : '4821', frozen:false};
    if (!a.name) a.name = k === 'joint' ? 'Joint' : 'Personal';
  }
  if (s.active !== 'joint') s.active = 'personal';

  s.layout = s.layout || {};
  if (!Array.isArray(s.layout.order) || !s.layout.order.length) {
    s.layout.order = ['card','balance','ring','carousel','activity'];
  }
  if (!Array.isArray(s.layout.hidden)) s.layout.hidden = [];
  if (!Array.isArray(s.layout.carousel)) s.layout.carousel = ['pots','invest','pension','isa'];

  if (!Array.isArray(s.pots)) s.pots = [];
  if (!Array.isArray(s.tx)) s.tx = [];
  if (!Array.isArray(s.scheduled)) s.scheduled = [];
  if (!Array.isArray(s.payees)) s.payees = [];
  if (!Array.isArray(s.goals)) s.goals = [];
  if (!Array.isArray(s.cards) || !s.cards.length) {
    s.cards = [{id: uid('card'), label:'Coral', last4:'4821', type:'debit', frozen:false, virtual:false, network:'mastercard'}];
  }
  for (const t of s.tx) if (!t.acct) t.acct = 'personal';
  for (const t of s.scheduled) if (!t.acct) t.acct = 'personal';

  if (typeof s.savings !== 'number') s.savings = 0;

  if (!s.flex) s.flex = {limit: 1000, used: 0, plan: 'flex', active: true};
  if (typeof s.flex.limit !== 'number') s.flex.limit = 1000;
  if (typeof s.flex.used !== 'number') s.flex.used = 0;

  if (!s.pension) s.pension = {};
  s.pension = Object.assign({provider:'Nest', balance:0, monthly:0, employer:0, growth:0.055, joined: now()}, s.pension);

  if (!s.isa) s.isa = {};
  s.isa = Object.assign({balance:0, allowance:20000, used:0, contrib:0, contribDay:5}, s.isa);

  if (!s.invest) s.invest = {};
  s.invest = Object.assign({cash:0, holdings:[], contrib:0, contribDay:1}, s.invest);
  if (!Array.isArray(s.invest.holdings) || !s.invest.holdings.length) {
    s.invest.holdings = seedHoldings();
  }
  s.invest.holdings = s.invest.holdings
    .filter(h => h && typeof h.f === 'string' && FUNDS.some(f => f.id === h.f))
    .map(h => ({f: h.f, v: round2(h.v)}));
  if (!s.invest.holdings.length) s.invest.holdings = seedHoldings();
  if (typeof s.invest.cash !== 'number') s.invest.cash = 0;

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

/* ---------- accounts ---------- */

export function acc() {
  return state.accounts[state.active] || state.accounts.personal;
}
export function bal() {
  return acc().balance;
}
export function setActive(id) {
  if (state.accounts[id]) { state.active = id; save(); }
}
export function isJoint() {
  return state.active === 'joint';
}

/* ---------- money movement ---------- */

export function addTx({name, amount, category = 'general', ts = now(), note = '', receipt = null, potId = null, acct = null}) {
  const a = acct || state.active;
  const tx = {
    id: uid('tx'), name, amount: round2(amount), category,
    ts, type: amount > 0 ? 'in' : 'out', note, receipt, potId, acct: a
  };
  state.tx.unshift(tx);
  if (state.accounts[a]) state.accounts[a].balance = round2(state.accounts[a].balance + tx.amount);
  save();
  return tx;
}

export function takeFunds(amount, from = 'balance') {
  const a = round2(amount);
  if (from === 'savings') {
    if (state.savings < a) return false;
    state.savings = round2(state.savings - a);
    save();
    return true;
  }
  const account = acc();
  if (account.balance < a) return false;
  account.balance = round2(account.balance - a);
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
    acc().balance = round2(acc().balance + a);
    addTx({name: pot.name + ' pot', amount: a, category: 'transfers', potId});
  }
  save();
  return true;
}

export function totalPots() {
  return round2(state.pots.reduce((s, p) => s + (p.saved || 0), 0));
}

/* ---------- portfolio ---------- */

export function planInfo(id = state.plan) {
  return PLANS[id] || PLANS.free;
}

export function holdingValue(h) {
  const f = FUNDS.find(x => x.id === h.f);
  return f ? round2(h.v) : 0;
}

export function portfolioValue() {
  return round2(state.invest.holdings.reduce((s, h) => s + (h.v || 0), 0));
}

export function unitsOf(h) {
  const f = FUNDS.find(x => x.id === h.f);
  return f && f.price ? h.v / f.price : 0;
}

export function platformFeeAnnual() {
  const p = planInfo();
  return round2(Math.min(portfolioValue() * p.feeRate, p.feeCap));
}
export function platformFeeMonthly() {
  return round2(platformFeeAnnual() / 12);
}

/* ---------- flex ---------- */

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
      day: new Date(when).getDate(), freq: 'once', next: when, flex: true, acct: state.active
    });
  }
  save();
  return {ok:true, per, total, apr};
}

/* ---------- investments ---------- */

export function investBuy(fundId, amount) {
  const f = FUNDS.find(x => x.id === fundId);
  if (!f) return false;
  const a = round2(amount);
  if (state.invest.cash < a) return false;
  state.invest.cash = round2(state.invest.cash - a);
  const h = state.invest.holdings.find(x => x.f === fundId);
  if (h) h.v = round2(h.v + a);
  else state.invest.holdings.push({f: fundId, v: a});
  save();
  return true;
}

export function investSell(fundId, amount) {
  const h = state.invest.holdings.find(x => x.f === fundId);
  if (!h) return false;
  const a = Math.min(round2(amount), round2(h.v));
  if (a <= 0) return false;
  h.v = round2(h.v - a);
  if (h.v <= 0.01) state.invest.holdings = state.invest.holdings.filter(x => x !== h);
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
  let bal2 = p.balance;
  for (let i = 0; i < years; i++) bal2 = bal2 * (1 + p.growth) + annual;
  return {pot: round2(bal2), years, annual};
}

/* ---------- scheduler ---------- */

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
          addTx({name: s.name, amount: s.amount, category: s.category, ts: cur.getTime(), acct: s.acct});
          s.done = true;
          count++;
        }
      } else if (cur.getDate() === s.day) {
        addTx({name: s.name, amount: s.amount, category: s.category, ts: cur.getTime(), acct: s.acct});
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

/* ---------- derived ---------- */

export function upcoming() {
  const cutoff = now() + 7 * 86400000;
  return state.scheduled
    .filter(s => s.next <= cutoff && s.amount < 0 && (s.acct || 'personal') === state.active)
    .reduce((s, x) => s + Math.abs(x.amount), 0);
}

export function leftToSpend() {
  return Math.max(0, round2(bal() - upcoming()));
}

export function spentThisMonth() {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return round2(Math.abs(state.tx
    .filter(t => t.ts >= start && t.amount < 0 && t.category !== 'transfers' && (t.acct || 'personal') === state.active)
    .reduce((s, t) => s + t.amount, 0)));
}

export function byCategory() {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const map = {};
  for (const t of state.tx) {
    if (t.ts < start || t.amount >= 0 || t.category === 'transfers') continue;
    if ((t.acct || 'personal') !== state.active) continue;
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
    if ((t.acct || 'personal') !== state.active) continue;
    map[t.category] = round2((map[t.category] || 0) + Math.abs(t.amount));
  }
  return map;
}

export function ensureCategory(id) {
  return CATEGORY_IDS.includes(id) ? id : 'general';
}
