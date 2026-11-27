import { FUNDS, CATEGORY_IDS, RISK_FUNDS } from './data.js?v=37';

export const VERSION = 26;
export const KEY = 'monzo_v26';
export const LEGACY_KEYS = ['monzo_v25','monzo_v24','monzo_v23','monzo_v22','monzo_v21','monzo_v20','monzo_v19','monzo_v18','monzo_v17','monzo_v16','monzo_v15','monzo_v14','monzo_v13','monzo_v12','monzo_v11'];
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

function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function buildLedger() {
  const rng = makeRng(19921007);
  const out = [];
  const end = new Date();
  const push = (d, type, fund, amount) => {
    if (d > end) return;
    out.push({id: uid('led'), ts: d.getTime(), type, fund, amount: round2(amount)});
  };

  push(new Date(1992, 9, 7), 'gift', 'balanced', 500);

  let d = new Date(1993, 0, 5);
  while (d <= end) {
    const y = d.getFullYear();
    const monthly = y >= 2020 ? 750 : y >= 2015 ? 400 : y >= 2010 ? 250 : y >= 2005 ? 150 : y >= 2000 ? 100 : 50;
    const fund = RISK_FUNDS[Math.floor(rng() * 3)].id;
    push(new Date(d.getTime()), 'buy', fund, monthly);
    if (d.getMonth() % 3 === 0) {
      const base = y >= 2020 ? 320 : y >= 2010 ? 120 : 30;
      push(new Date(d.getFullYear(), d.getMonth(), 15), 'div', fund, base * (0.7 + rng() * 0.6));
    }
    d = new Date(d.getFullYear(), d.getMonth() + 1, 5);
  }

  push(new Date(2010, 9, 7), 'buy', 'balanced', 1000);
  push(new Date(2013, 9, 7), 'buy', 'balanced', 5000);
  push(new Date(2017, 5, 12), 'buy', 'adventurous', 10000);
  push(new Date(2019, 6, 18), 'sell', 'balanced', -18000);
  push(new Date(2021, 3, 20), 'buy', 'adventurous', 25000);
  push(new Date(2021, 10, 9), 'sell', 'balanced', -9500);
  push(new Date(2023, 8, 2), 'buy', 'balanced', 40000);

  out.sort((a, b) => a.ts - b.ts);
  return out;
}

const PREV_MONTH = [
  ['Salary', 2450.00, 'income', 1, 'personal'],
  ['Chloe Salary', 1850.00, 'income', 1, 'joint'],
  ['Council Tax', -142.00, 'bills', 1, 'joint'],
  ['Octopus Energy', -96.40, 'bills', 3, 'joint'],
  ['Northumbrian Water', -38.20, 'bills', 4, 'joint'],
  ['TV Licence', -13.25, 'bills', 5, 'personal'],
  ['BT Broadband', -32.99, 'bills', 6, 'personal'],
  ['EE Mobile', -22.00, 'bills', 7, 'personal'],
  ['Admiral Car Insurance', -48.50, 'bills', 12, 'personal'],
  ['AA Breakdown', -13.00, 'bills', 14, 'personal'],
  ['PureGym', -24.99, 'fitness', 8, 'personal'],
  ['Spotify', -11.99, 'entertainment', 9, 'personal'],
  ['Netflix', -10.99, 'entertainment', 10, 'personal'],
  ['Disney+', -7.99, 'entertainment', 11, 'joint'],
  ['Tesco', -64.20, 'groceries', 2, 'personal'],
  ['Asda', -51.80, 'groceries', 6, 'personal'],
  ['Aldi', -38.40, 'groceries', 11, 'joint'],
  ['Sainsburys', -43.10, 'groceries', 16, 'personal'],
  ['Tesco', -88.40, 'groceries', 8, 'joint'],
  ['Asda', -72.15, 'groceries', 14, 'joint'],
  ['Aldi', -41.20, 'groceries', 21, 'joint'],
  ['Farmfoods', -29.60, 'groceries', 25, 'joint'],
  ['Greggs', -5.40, 'eating', 3, 'personal'],
  ['Greggs', -6.20, 'eating', 5, 'joint'],
  ['Costa', -8.20, 'eating', 17, 'personal'],
  ['McDonalds', -12.60, 'eating', 21, 'personal'],
  ['Toby Carvery', -38.90, 'eating', 23, 'joint'],
  ['Nandos', -42.70, 'eating', 13, 'joint'],
  ['Northern', -14.20, 'transport', 5, 'personal'],
  ['Arriva', -4.50, 'transport', 9, 'personal'],
  ['Shell', -52.30, 'transport', 13, 'personal'],
  ['Amazon', -34.99, 'shopping', 7, 'personal'],
  ['Argos', -27.99, 'shopping', 15, 'personal'],
  ['Primark', -31.00, 'shopping', 20, 'joint'],
  ['Smyths Toys', -44.99, 'family', 18, 'personal'],
  ['Smyths Toys', -59.99, 'family', 10, 'joint'],
  ['The Entertainer', -22.50, 'family', 16, 'joint'],
  ['Lego', -34.99, 'family', 22, 'personal'],
  ['Boots', -16.45, 'health', 22, 'personal'],
  ['Specsavers', -26.05, 'health', 24, 'personal'],
  ['B&Q', -42.80, 'home', 24, 'personal'],
  ['Dunelm', -34.00, 'home', 19, 'joint'],
  ['The Range', -27.80, 'home', 23, 'joint'],
  ['Home Bargains', -18.30, 'home', 25, 'personal'],
  ['Home Bargains', -24.10, 'home', 22, 'joint'],
  ['Cineworld', -21.00, 'entertainment', 26, 'personal'],
  ['Odeon', -18.00, 'entertainment', 17, 'joint'],
  ['Pets at Home', -26.50, 'pets', 27, 'personal'],
  ['RSPCA', -10.00, 'pets', 28, 'personal'],
  ['Screwfix', -19.99, 'home', 28, 'personal']
];

const PREV2_MONTH = [
  ['Salary', 2450.00, 'income', 1, 'personal'],
  ['Chloe Salary', 1850.00, 'income', 1, 'joint'],
  ['Council Tax', -142.00, 'bills', 1, 'joint'],
  ['Octopus Energy', -78.00, 'bills', 3, 'joint'],
  ['Northumbrian Water', -38.20, 'bills', 4, 'joint'],
  ['Tesco', -71.30, 'groceries', 5, 'joint'],
  ['Asda', -58.90, 'groceries', 12, 'joint'],
  ['Lidl', -34.70, 'groceries', 19, 'personal'],
  ['Farmfoods', -26.40, 'groceries', 24, 'joint'],
  ['Greggs', -4.95, 'eating', 6, 'personal'],
  ['Hungry Horse', -46.20, 'eating', 15, 'joint'],
  ['Deliveroo', -28.40, 'eating', 22, 'personal'],
  ['Northern', -8.40, 'transport', 7, 'personal'],
  ['Shell', -48.60, 'transport', 14, 'personal'],
  ['Amazon', -42.50, 'shopping', 9, 'personal'],
  ['Sports Direct', -39.99, 'shopping', 18, 'personal'],
  ['Smyths Toys', -49.99, 'family', 20, 'joint'],
  ['Boots', -11.20, 'health', 11, 'personal'],
  ['B&M', -22.40, 'home', 17, 'joint'],
  ['Pets at Home', -18.75, 'pets', 21, 'personal'],
  ['Cineworld', -19.50, 'entertainment', 23, 'personal'],
  ['Spotify', -11.99, 'entertainment', 9, 'personal']
];

const BUDGET_SEED = {
  personal: {groceries: 300, eating: 150, transport: 120, shopping: 220, bills: 320,
    entertainment: 90, health: 50, fitness: 40, home: 120, family: 150, pets: 60, general: 80},
  joint: {groceries: 400, eating: 120, bills: 380, home: 140, family: 160, entertainment: 70}
};

function monthSeed(monthsBack) {
  const base = new Date();
  const first = new Date(base.getFullYear(), base.getMonth() - monthsBack, 1);
  const table = monthsBack === 1 ? PREV_MONTH : PREV2_MONTH;
  return table.map(([name, amount, category, day, acct]) => {
    const when = new Date(first.getFullYear(), first.getMonth(), day, 12, 0, 0);
    return {
      id: uid('tx'), name, amount, category, ts: when.getTime(),
      type: amount > 0 ? 'in' : 'out', acct: acct || 'personal', history: true
    };
  });
}

function seedHistory() {
  return [...monthSeed(2), ...monthSeed(1)];
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
      mk('Tesco', -58.40, 'groceries', 0, 'joint'),
      mk('Greggs', -5.20, 'eating', 0),
      mk('Northern', -8.40, 'transport', 1),
      mk('Amazon', -23.99, 'shopping', 1),
      mk('Octopus Energy', -96.40, 'bills', 2, 'joint'),
      mk('PureGym', -24.99, 'fitness', 3),
      mk('Smyths Toys', -34.99, 'family', 3, 'joint'),
      mk('Boots', -12.45, 'health', 4),
      mk('IKEA', -164.00, 'home', 5, 'joint'),
      mk('Spotify', -11.99, 'entertainment', 6),
      mk('Sainsburys', -63.40, 'groceries', 7, 'joint'),
      mk('Shell', -49.80, 'transport', 7),
      mk('Pets at Home', -21.30, 'pets', 8),
      mk('Costa', -7.85, 'eating', 8),
      mk('Home Bargains', -16.40, 'home', 9, 'joint'),
      ...seedHistory()
    ],
    scheduled: [
      {id:uid('sch'), name:'Octopus Energy', amount:-96.40, category:'bills', day:12, freq:'monthly', next: base + 4*86400000, acct:'joint'},
      {id:uid('sch'), name:'Council Tax', amount:-142, category:'bills', day:1, freq:'monthly', next: base + 20*86400000, acct:'joint'},
      {id:uid('sch'), name:'Northumbrian Water', amount:-38.20, category:'bills', day:4, freq:'monthly', next: base + 6*86400000, acct:'joint'},
      {id:uid('sch'), name:'PureGym', amount:-24.99, category:'fitness', day:20, freq:'monthly', next: base + 12*86400000, acct:'personal'},
      {id:uid('sch'), name:'TV Licence', amount:-13.25, category:'bills', day:5, freq:'monthly', next: base + 3*86400000, acct:'personal'},
      {id:uid('sch'), name:'Admiral Car Insurance', amount:-48.50, category:'bills', day:12, freq:'monthly', next: base + 9*86400000, acct:'personal'}
    ],
    cards: [
      {id:uid('card'), label:'Coral', last4:'4821', type:'debit', frozen:false, virtual:false, network:'mastercard'}
    ],
    payees: [
      {id:uid('pay'), name:'Sophie Armstrong', sort:'04-00-04', acct:'12345678', initials:'SA'},
      {id:uid('pay'), name:'Liam Fletcher', sort:'20-45-11', acct:'87654321', initials:'LF'},
      {id:uid('pay'), name:'Chloe Brown', sort:'30-96-14', acct:'55120934', initials:'CB'}
    ],
    budgets: JSON.parse(JSON.stringify(BUDGET_SEED)),
    budgetSeeded: true,
    flex: {limit: 1000, used: 214.40, plan: 'flex', active: true},
    plan: 'plus',
    plus: {since: base - 200*86400000, renews: base + 15*86400000},
    invest: {
      cash: 4120.60,
      funds: {careful: 64000, balanced: 712000, adventurous: 158745.44},
      chosen: 'balanced',
      ledger: buildLedger(),
      contrib: 750,
      contribDay: 5
    },
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
  {v: 23, fn: s => s},
  {v: 24, fn: s => {
    const hasHistory = Array.isArray(s.tx) &&
      s.tx.some(t => t.ts < new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime());
    if (!hasHistory) s.tx = (Array.isArray(s.tx) ? s.tx : []).concat(seedHistory());
    if (!s.budgetSeeded) {
      s.budgets = JSON.parse(JSON.stringify(BUDGET_SEED));
      s.budgetSeeded = true;
    }
    return s;
  }},
  {v: 25, fn: s => {
    s.tx = (Array.isArray(s.tx) ? s.tx : []).filter(t => !t.history);
    s.tx = s.tx.concat(seedHistory());
    s.budgets = JSON.parse(JSON.stringify(BUDGET_SEED));
    s.budgetSeeded = true;
    if (!s.invest) s.invest = {};
    if (!Array.isArray(s.invest.ledger) || !s.invest.ledger.length) {
      s.invest.ledger = buildLedger();
    }
    return s;
  }},
  {v: 26, fn: s => {
    if (!s.invest) s.invest = {};
    const old = Array.isArray(s.invest.holdings) ? s.invest.holdings : [];
    const total = round2(old.reduce((n, h) => n + (Number(h.v) || 0), 0));
    if (!s.invest.funds) {
      s.invest.funds = {careful: 0, balanced: total || 934745.44, adventurous: 0};
    }
    s.invest.chosen = s.invest.chosen || 'balanced';
    delete s.invest.holdings;
    const ids = new Set(RISK_FUNDS.map(f => f.id));
    if (Array.isArray(s.invest.ledger)) {
      s.invest.ledger = s.invest.ledger
        .filter(e => e && typeof e.fund === 'string')
        .map(e => ids.has(e.fund) ? e : Object.assign({}, e, {fund: 'balanced'}));
    }
    return s;
  }}
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

  if (!s.budgets || typeof s.budgets !== 'object') s.budgets = {};
  for (const k of ['personal', 'joint']) {
    if (!s.budgets[k] || typeof s.budgets[k] !== 'object') s.budgets[k] = {};
    for (const c of Object.keys(s.budgets[k])) {
      const v = round2(s.budgets[k][c]);
      if (v > 0) s.budgets[k][c] = v;
      else delete s.budgets[k][c];
    }
  }

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
  s.invest = Object.assign({cash:0, funds:{careful:0, balanced:0, adventurous:0}, chosen:'balanced', ledger:[], contrib:0, contribDay:1}, s.invest);
  if (!s.invest.funds || typeof s.invest.funds !== 'object') {
    s.invest.funds = {careful:0, balanced:0, adventurous:0};
  }
  for (const f of RISK_FUNDS) {
    if (typeof s.invest.funds[f.id] !== 'number' || !isFinite(s.invest.funds[f.id])) {
      s.invest.funds[f.id] = 0;
    }
  }
  if (!RISK_FUNDS.some(f => f.id === s.invest.chosen)) s.invest.chosen = 'balanced';
  if (typeof s.invest.cash !== 'number') s.invest.cash = 0;
  if (!Array.isArray(s.invest.ledger) || !s.invest.ledger.length) {
    s.invest.ledger = buildLedger();
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

export function budgets() {
  if (!state.budgets[state.active]) state.budgets[state.active] = {};
  return state.budgets[state.active];
}
export function budgetFor(catId) {
  return round2(budgets()[catId] || 0);
}
export function setBudget(catId, amount) {
  const v = round2(amount);
  const b = budgets();
  if (v > 0) b[catId] = v;
  else delete b[catId];
  save();
}
export function totalBudget() {
  return round2(Object.values(budgets()).reduce((s, v) => s + (Number(v) || 0), 0));
}
export function hasBudget() {
  return totalBudget() > 0;
}
export function budgetLeft() {
  if (!hasBudget()) return null;
  return round2(totalBudget() - spentThisMonth());
}

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

export function planInfo(id = state.plan) {
  return PLANS[id] || PLANS.free;
}

export function riskInfo(id) {
  return RISK_FUNDS.find(f => f.id === id) || RISK_FUNDS[1];
}

export function portfolioValue() {
  return round2(RISK_FUNDS.reduce((s, f) => s + (state.invest.funds[f.id] || 0), 0));
}

export function fundValue(id) {
  return round2(state.invest.funds[id] || 0);
}

export function platformFeeAnnual() {
  const p = planInfo();
  return round2(Math.min(portfolioValue() * p.feeRate, p.feeCap));
}
export function platformFeeMonthly() {
  return round2(platformFeeAnnual() / 12);
}

export function ledgerAdd(type, fund, amount, ts = now()) {
  state.invest.ledger.push({id: uid('led'), ts, type, fund, amount: round2(amount)});
  save();
}

export function ledgerNetInvested() {
  return round2(state.invest.ledger
    .filter(e => e.type === 'buy' || e.type === 'gift' || e.type === 'sell')
    .reduce((s, e) => s + e.amount, 0));
}

export function ledgerIncome() {
  return round2(state.invest.ledger
    .filter(e => e.type === 'div')
    .reduce((s, e) => s + e.amount, 0));
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
      day: new Date(when).getDate(), freq: 'once', next: when, flex: true, acct: state.active
    });
  }
  save();
  return {ok:true, per, total, apr};
}

export function investBuy(fundId, amount) {
  const f = RISK_FUNDS.find(x => x.id === fundId);
  if (!f) return false;
  const a = round2(amount);
  if (state.invest.cash < a) return false;
  state.invest.cash = round2(state.invest.cash - a);
  state.invest.funds[fundId] = round2((state.invest.funds[fundId] || 0) + a);
  ledgerAdd('buy', fundId, a);
  save();
  return true;
}

export function investSell(fundId, amount) {
  const held = round2(state.invest.funds[fundId] || 0);
  if (held <= 0) return false;
  const a = Math.min(round2(amount), held);
  if (a <= 0) return false;
  state.invest.funds[fundId] = round2(held - a);
  state.invest.cash = round2(state.invest.cash + a);
  ledgerAdd('sell', fundId, -a);
  save();
  return true;
}

export function investDeposit(amount) {
  const a = round2(amount);
  if (!takeFunds(a)) return false;
  state.invest.cash = round2(state.invest.cash + a);
  ledgerAdd('deposit', state.invest.chosen, a);
  save();
  return true;
}

export function setChosenFund(id) {
  if (!RISK_FUNDS.some(f => f.id === id)) return;
  state.invest.chosen = id;
  save();
}

export function pensionProjection() {
  const p = state.pension;
  const years = Math.max(0, 68 - (new Date().getFullYear() - new Date(p.joined).getFullYear()));
  const annual = (p.monthly + p.employer) * 12;
  let b2 = p.balance;
  for (let i = 0; i < years; i++) b2 = b2 * (1 + p.growth) + annual;
  return {pot: round2(b2), years, annual};
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

export function upcoming() {
  const cutoff = now() + 7 * 86400000;
  return state.scheduled
    .filter(s => s.next <= cutoff && s.amount < 0 && (s.acct || 'personal') === state.active)
    .reduce((s, x) => s + Math.abs(x.amount), 0);
}

export function leftToSpend() {
  const b = budgetLeft();
  if (b !== null) return Math.max(0, b);
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
