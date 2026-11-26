/* src/core.js — clock, format, DOM helpers, storage, state, actions, selectors. */

import {
  PLANS, CATS, FLEX, COMMITTED, DEFAULT_TARGETS, BANKS, BB_PROVIDERS, BB_CAP,
  DOMAINS, POTS0, TARGET_ISA, buildSeed, uid
} from './data.js';

export const VERSION = 16;
export const KEY = 'monzo_v16';
const LEGACY_KEYS = ['monzo_v15', 'monzo_v14', 'monzo_v13', 'monzo_v12', 'monzo_v11'];

export const NOW = new Date();
export const TODAY = iso(NOW);
export const NOWT = `${p2(NOW.getHours())}:${p2(NOW.getMinutes())}`;
export const THIS_YM = TODAY.slice(0, 7);
export const MONTHS = ['January','February','March','April','May','June','July',
  'August','September','October','November','December'];
export const TAX_START = `${NOW.getMonth() >= 3 ? NOW.getFullYear() : NOW.getFullYear() - 1}-04-06`;

export const CASHBACK_RATE = 0.01;
export const CASHBACK_MIN = 1;
const MAX_CATCHUP_DAYS = 400;

function p2(n){ return String(n).padStart(2, '0'); }
export function iso(d){ return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }
export function asDate(s){ return new Date(s + 'T12:00:00'); }
export function monthLen(y, m){ return new Date(y, m + 1, 0).getDate(); }
export function dom(y, m, day){
  const d = new Date(y, m, 1);
  const last = monthLen(d.getFullYear(), d.getMonth());
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(Math.min(day, last))}`;
}

export function prettyDate(s){
  const diff = Math.round((asDate(TODAY) - asDate(s)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const d = asDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}
export function nextPayday(){
  const d = new Date(NOW.getFullYear(), NOW.getMonth(), 28);
  if (TODAY >= iso(d)) d.setMonth(d.getMonth() + 1);
  return iso(d);
}
export function daysToPayday(){
  return Math.max(0, Math.round((asDate(nextPayday()) - asDate(TODAY)) / 86400000));
}

export function fmt(n){
  return '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export const round2 = n => Math.round(n * 100) / 100;
export const esc = s => String(s).replace(/[&<>"']/g,
  c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const pct = (a, b) => b ? Math.min(100, (a / b) * 100) : 0;

export const $ = (sel, root = document) => root.querySelector(sel);
export function clear(node){ while (node.firstChild) node.removeChild(node.firstChild); }

/* ---------------- state ---------------- */
let S = null;
const listeners = new Set();
export function getState(){ return S; }
export function subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }
function notify(){ listeners.forEach(fn => fn(S)); }

/* Policy templates. Numbers and start dates are minted once, then held in state
   so documents print the policy that actually exists rather than a fixture. */
const POLICY_TEMPLATES = [
  ['travel',    'Worldwide travel insurance',   'POL-TRV-8842190', 75, 'Covers all named travellers, up to 31 days per trip.'],
  ['phone',     'Worldwide phone insurance',    'POL-PHN-8842191', 75, 'Covers four registered handsets, £75 excess per claim.'],
  ['breakdown', 'UK & Europe breakdown cover',  'POL-BRK-8842192', 0,  'Vehicle-based, any driver, home start included.']
];

function policySeed(covered){
  const start = `${NOW.getFullYear() - 2}-04-01`;
  return POLICY_TEMPLATES.map(([key, name, number, excess, note]) => ({
    id: uid(), key, name, number, excess, note, start,
    status: covered ? 'Active' : 'Not included', ended: ''
  }));
}

export function freshState(){
  const seedData = buildSeed(NOW);
  return {
    v: VERSION,
    tx: seedData.tx,
    isa: seedData.isa,
    pots: POTS0.map(p => ({ id: uid(), locked: false, autoSave: 0, ...p })),
    payees: [
      { id: uid(), name: 'Chloe Brown',      sc: '04-00-04', ac: '73829104', fav: true,  last: TODAY },
      { id: uid(), name: 'David Armstrong',  sc: '09-01-28', ac: '11293847', fav: false, last: '' },
      { id: uid(), name: 'Halcyon Digital',  sc: '20-45-77', ac: '55102238', fav: false, last: '' },
      { id: uid(), name: 'Northgate Studio', sc: '40-11-62', ac: '90817263', fav: false, last: '' }
    ],
    sos: [
      { id: uid(), name: 'OpenRent',    amt: 799, day: 1, active: true },
      { id: uid(), name: 'British Gas', amt: 96,  day: 2, active: true }
    ],
    tabs: [{ id: uid(), name: 'Steak night', total: 148.40, mine: 74.20, people: 2 }],
    requests: [],
    vcards: [{ id: uid(), label: 'Subscriptions', frozen: false, num: '4000 1234', created: TODAY, single: false }],
    targets: { ...DEFAULT_TARGETS },
    layout: [
      { id: 'spotlights', on: true }, { id: 'personal', on: true }, { id: 'joint', on: true },
      { id: 'pots', on: true }, { id: 'invest', on: true }, { id: 'latest', on: true }
    ],
    profile: {
      name: 'Jason Armstrong', dob: '1992-10-07', email: 'jasonarm82@gmail.com', phone: '07356170033',
      a1: '259 Piper Knowle Road', a2: '', city: 'Stockton-on-Tees', post: 'TS19 8JQ',
      occ: 'Security Officer', emp: 'Kingdom Services Group'
    },
    partner: 'Chloe Brown',
    plan: 'max', family: false, priv: false, roundups: true, credId: null, pin: '2580', frozen: false,
    theme: 'auto', zoom: 1, motion: true,
    activeAccount: 'personal', acctName: 'Personal current account', acctClosed: false,
    atmLimit: 400, potSort: 'name', jointBal: 0,
    pension: 41250.18, pensionMonthly: 180, homeValue: 168000, mortgage: 100000,
    flex: { limit: 4000, used: 0, plans: [] },
    aura: { active: true, auto: true, lounge: 2, fast: 2, cashback: 0 },
    policies: policySeed(true),
    overdraft: { limit: 0, rate: 0 },
    loans: [], connected: [], extraAccounts: [],
    sorter: { on: false, splits: {} },
    gpeMonth: '',
    lastRun: TODAY,
    roundupPotId: '',
    credit: { eq: 560 + Math.floor(Math.random() * 160), tu: 540 + Math.floor(Math.random() * 160), done: [] },
    challenge: { day: 0, saved: 0, level: '1p' },
    billsback: { optIn: false, history: [] },
    lastInterest: '', lastTick: '', notifsCleared: false,
    notifs: [], chat: [], disputes: [], revealed: []
  };
}

const migrations = [
  /* 11 -> 12 */
  s => {
    s.v = 12;
    s.flex ||= { limit: 4000, used: 0, plans: [] };
    s.aura ||= { active: true, auto: true, lounge: 2, fast: 2, cashback: 0 };
    s.overdraft ||= { limit: 0, rate: 0 };
    s.loans ||= []; s.connected ||= []; s.extraAccounts ||= [];
    s.credit ||= { eq: 640, tu: 620, done: [] };
    s.challenge ||= { day: 0, saved: 0, level: '1p' };
    s.billsback ||= { optIn: false, history: [] };
    s.layout ||= [{ id: 'spotlights', on: true }, { id: 'personal', on: true },
      { id: 'joint', on: true }, { id: 'pots', on: true }, { id: 'invest', on: true },
      { id: 'latest', on: true }];
    s.partner ||= 'Chloe Brown';
    s.theme ||= 'auto'; s.zoom ||= 1; s.motion ??= true;
    s.pension ||= 41250.18; s.homeValue ||= 168000; s.mortgage ||= 100000;
    s.targets ||= { ...DEFAULT_TARGETS };
    s.notifs ||= []; s.chat ||= []; s.disputes ||= [];
    return s;
  },
  /* 12 -> 13 */
  s => {
    s.v = 13;
    s.family ??= false;
    s.activeAccount ||= 'personal';
    s.pensionMonthly ||= 180;
    s.credit.done ||= [];
    s.pots = (s.pots || []).map(p => ({ locked: false, autoSave: 0, ...p }));
    s.vcards = (s.vcards || []).map(v => ({ single: false, ...v }));
    return s;
  },
  /* 13 -> 14: fields the modular build needs, and a ledger re-order */
  s => {
    s.v = 14;
    s.acctName ||= 'Personal current account';
    s.acctClosed ??= false;
    s.atmLimit ||= 400;
    s.potSort ||= 'name';
    s.jointBal ||= 0;
    s.notifsCleared ??= false;
    s.tx = (s.tx || []).slice().sort((a, b) =>
      (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    return s;
  },
  /* 14 -> 15: sorter, requests, policy state, per-account balances, cashback */
  s => {
    s.v = 15;
    s.extraAccounts = (s.extraAccounts || []).map(a => ({ bal: 0, ...a }));
    s.sorter ||= { on: false, splits: {} };
    s.sorter.splits ||= {};
    s.requests ||= [];
    s.gpeMonth ||= '';
    if (!Array.isArray(s.policies) || !s.policies.length){
      s.policies = policySeed(!!(PLANS[s.plan] || {}).cover);
    }
    if (s.aura){
      s.aura.cashback = round2(s.aura.cashback || 0);
      if (!s.aura.cashback){
        /* backfill from this month's eligible card spend */
        const spent = (s.tx || [])
          .filter(t => t.date.slice(0, 7) === THIS_YM && t.amt < 0 && FLEX.includes(t.cat))
          .reduce((a, t) => a + Math.abs(t.amt), 0);
        s.aura.cashback = round2(spent * CASHBACK_RATE);
      }
    }
    return s;
  },
  /* 15 -> 16: the scheduler watermark and the round-up target */
  s => {
    s.v = 16;
    s.lastRun ||= TODAY;
    s.roundupPotId ||= '';
    if (!Array.isArray(s.policies) || !s.policies.length){
      s.policies = policySeed(!!(PLANS[s.plan] || {}).cover);
    }
    return s;
  }
];

export function migrate(raw){
  let s = raw;
  const from = Math.max(11, s.v || 11);
  for (let v = from; v < VERSION; v++){
    const step = migrations[v - 11];
    if (step) s = step(s);
  }
  s.v = VERSION;
  return s;
}

function readLegacy(){
  for (const k of LEGACY_KEYS){
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(k)); } catch { raw = null; }
    if (raw && typeof raw === 'object'){ localStorage.removeItem(k); return raw; }
  }
  return null;
}

export function load(){
  const params = new URLSearchParams(location.search);
  if (params.get('reset') === '1'){
    localStorage.removeItem(KEY);
    LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
  }
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch { raw = null; }
  if (!raw) raw = readLegacy();

  S = (!raw || (raw.v || 0) > VERSION) ? freshState() : migrate(raw);
  S.revealed = new Set(S.revealed || []);
  if (!S.notifs.length && !S.notifsCleared) seedNotifs();
  recompute();
  save();
  return S;
}

let saveTimer = null;
export function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ ...S, revealed: [...S.revealed] })); } catch {}
  }, 60);
}
export function commit(){ save(); notify(S); }

/* ---------------- selectors ---------------- */
export const plan = () => PLANS[S.plan];
export const planPrice = () => plan().price + (S.family && S.plan === 'max' ? 4 : 0);
export const PLANS_BANK = () => PLANS;
export const balNow = () => S.tx.length ? S.tx[0].bal : 0;
export const isaBal = () => S.isa.length ? S.isa[0].value : 0;
export const savingsTotal = () => S.pots.filter(p => p.type === 'savings').reduce((a, p) => a + p.bal, 0);
export const interestThisMonth = () => round2(savingsTotal() * (plan().ia / 100 / 12));
export const homeEquity = () => Math.max(0, (S.homeValue || 0) - (S.mortgage || 0));
export const connTotal = () => S.connected.reduce((a, c) => a + c.bal, 0);
export const loanOwed = () => S.loans.reduce((a, l) => a + l.outstanding, 0);
export const growTotal = () => savingsTotal() + isaBal() + (S.pension || 0) + homeEquity() + connTotal() - loanOwed();
export const flexAvail = () => Math.max(0, round2(S.flex.limit - S.flex.used));

export const budgetTotal = () => FLEX.reduce((a, c) => a + (S.targets[c] || 0), 0);
export const spentThisMonth = () => S.tx
  .filter(t => t.date.slice(0, 7) === THIS_YM && FLEX.includes(t.cat))
  .reduce((a, t) => a + Math.abs(t.amt), 0);
export const spentCat = c => S.tx
  .filter(t => t.date.slice(0, 7) === THIS_YM && t.cat === c)
  .reduce((a, t) => a + Math.abs(t.amt), 0);
export const spentToday = () => S.tx
  .filter(t => t.date === TODAY && t.amt < 0).reduce((a, t) => a + Math.abs(t.amt), 0);

/* Projected from the most recent occurrence of each recurring commitment
   rather than a hardcoded list, so it tracks the ledger. */
export function committedLeft(){
  const pay = nextPayday();
  const since = iso(new Date(NOW.getFullYear(), NOW.getMonth() - 2, 1));
  const latest = new Map();
  for (const t of S.tx){
    if (t.date < since) break;
    if (t.amt >= 0 || !COMMITTED.includes(t.cat)) continue;
    if (!latest.has(t.name)) latest.set(t.name, t);
  }
  let sum = 0;
  latest.forEach(t => {
    const day = Number(t.date.slice(8, 10));
    let due = dom(NOW.getFullYear(), NOW.getMonth(), day);
    if (due < TODAY) due = dom(NOW.getFullYear(), NOW.getMonth() + 1, day);
    if (due >= TODAY && due < pay) sum += Math.abs(t.amt);
  });
  return round2(sum);
}
export const leftToSpend = () => Math.max(0, round2(balNow() - committedLeft()));

export function balanceSeries(days){
  const map = {};
  S.tx.slice().reverse().forEach(t => { map[t.date] = t.bal; });
  const out = [];
  let last = null;
  for (let i = days - 1; i >= 0; i--){
    const k = iso(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - i));
    if (map[k] !== undefined) last = map[k];
    out.push({ d: k, v: last });
  }
  const firstKnown = out.find(p => p.v !== null);
  if (firstKnown){
    let carry = firstKnown.v;
    out.forEach(p => { if (p.v === null) p.v = carry; else carry = p.v; });
  } else out.forEach(p => { p.v = balNow(); });
  if (out.length === 1) out.unshift({ ...out[0] });
  return out;
}

export const bbBills = () => S.tx.filter(t =>
  t.date.slice(0, 7) === THIS_YM && t.amt < 0 &&
  (t.cat === 'Bills' || t.cat === 'Rent') && BB_PROVIDERS.includes(t.name));

export const tyUsed = () => S.isa
  .filter(r => r.date >= TAX_START && r.type === 'ISA')
  .reduce((a, r) => a + r.contrib, 0);

export function flexMonthly(amount, term){
  if (term === 3) return round2(amount / 3);
  return round2(amount * (1 + 0.29 * term / 12) / term);
}
export function aprForLoan(amount){ return amount > 10000 ? 10 : 23; }
export function loanMonthly(amount, term){
  const apr = aprForLoan(amount);
  return round2(amount * (1 + apr / 100 * term / 12) / term);
}

/* ---------------- ledger ---------------- */
/* Insert by position, newest first, so a backdated row lands where it belongs
   and no sort is needed on the hot path. */
function insertTx(row){
  const key = row.date + row.time;
  let i = 0;
  while (i < S.tx.length && (S.tx[i].date + S.tx[i].time) > key) i++;
  S.tx.splice(i, 0, row);
}

function recompute(){
  if (!S.tx.length) return;
  const last = S.tx.length - 1;
  let bal = round2(S.tx[last].bal - S.tx[last].amt);
  for (let i = last; i >= 0; i--){
    bal = round2(bal + S.tx[i].amt);
    S.tx[i].bal = bal;
  }
}

/* Cashback is earned on card spend in flexible categories, at 1%, and is only
   moved to the balance when the holder asks for it. */
function accrueCashback(amt, cat){
  if (!S.aura || !S.aura.active) return;
  if (amt >= 0 || !FLEX.includes(cat)) return;
  const gain = round2(Math.abs(amt) * CASHBACK_RATE);
  if (gain <= 0) return;
  S.aura.cashback = round2((S.aura.cashback || 0) + gain);
}

/* The round-up target is a chosen pot, falling back to anything called Rainy
   Day and then to the first pot that exists. */
function roundupPot(){
  const chosen = S.pots.find(p => p.id === S.roundupPotId);
  if (chosen) return chosen;
  return S.pots.find(p => /rainy/i.test(p.name)) || S.pots[0] || null;
}
export const roundupPotName = () => (roundupPot() || {}).name || '';

/* Round-ups fire per transaction, immediately, on the spare change only. */
function accrueRoundup(amt, cat){
  if (!S.roundups || amt >= 0 || !FLEX.includes(cat)) return;
  const up = round2(Math.ceil(Math.abs(amt)) - Math.abs(amt));
  if (up < 0.01 || up > balNow()) return;
  const p = roundupPot();
  if (!p) return;
  p.bal = round2(p.bal + up);
  insertTx({ id: uid(), date: TODAY, time: NOWT, name: p.name, cat: 'Transfers',
    amt: -up, bal: 0, note: 'Round-up' });
}

export function addTx(name, cat, amt, note = '', dateOverride){
  const date = dateOverride || TODAY;
  const time = dateOverride && dateOverride !== TODAY ? '12:00' : NOWT;
  insertTx({ id: uid(), date, time, name, cat, amt: round2(amt), bal: 0, note });
  recompute();
  accrueCashback(round2(amt), cat);
  accrueRoundup(round2(amt), cat);
  recompute();
  commit();
}
export function updateTx(id, patch){
  const t = S.tx.find(x => x.id === id);
  if (!t) return { ok: false };
  Object.assign(t, patch);
  recompute();
  commit();
  return { ok: true };
}
export function deleteTx(id){
  const t = S.tx.find(x => x.id === id);
  if (!t) return { ok: false };
  S.tx = S.tx.filter(x => x.id !== id);
  recompute();
  commit();
  return { ok: true };
}

export function moveToPot(potId, amt, dir){
  const p = S.pots.find(x => x.id === potId);
  if (!p) return { ok: false, msg: 'No such pot' };
  if (dir === 'in'){
    if (amt > balNow()) return { ok: false, msg: 'Not enough in your balance' };
    p.bal = round2(p.bal + amt);
    addTx(p.name, 'Transfers', -amt, 'Moved to pot');
  } else {
    if (p.locked) return { ok: false, msg: 'Pot is locked' };
    if (amt > p.bal) return { ok: false, msg: 'Not enough in that pot' };
    p.bal = round2(p.bal - amt);
    addTx(p.name, 'Transfers', amt, 'Moved from pot');
  }
  return { ok: true };
}
export function createPot(name, type, goal){
  S.pots.push({ id: uid(), name, type, goal: Math.max(1, goal), bal: 0, locked: false, autoSave: 0 });
  commit();
}
export function updatePot(id, patch){
  const p = S.pots.find(x => x.id === id);
  if (p) Object.assign(p, patch);
  commit();
}
export function deletePot(id){
  const p = S.pots.find(x => x.id === id);
  if (!p) return { ok: false, msg: 'No such pot' };
  const bal = p.bal;
  S.pots = S.pots.filter(x => x.id !== id);
  if (S.sorter.splits[id] !== undefined) delete S.sorter.splits[id];
  if (S.roundupPotId === id) S.roundupPotId = '';
  if (bal > 0) addTx('Pot closed', 'Transfers', bal, p.name + ' returned');
  else commit();
  return { ok: true };
}
export function togglePotLock(id){
  const p = S.pots.find(x => x.id === id);
  if (!p) return { ok: false };
  p.locked = !p.locked;
  commit();
  return { ok: true, locked: p.locked };
}
export function setRoundupPot(id){
  const p = S.pots.find(x => x.id === id);
  if (!p) return { ok: false, msg: 'No such pot' };
  S.roundupPotId = p.id;
  S.roundups = true;
  commit();
  return { ok: true, name: p.name };
}
export function clearRoundupPot(){ S.roundupPotId = ''; commit(); }

export function sendMoney(payeeId, amount, ref){
  const p = S.payees.find(x => x.id === payeeId);
  if (!p) return { ok: false, msg: 'No such payee' };
  if (amount > balNow()) return { ok: false, msg: 'Not enough in your balance' };
  p.last = TODAY;
  addTx(p.name, 'Transfers', -amount, ref || 'Payment');
  notif('Payment sent', `${fmt(amount)} to ${p.name}`);
  return { ok: true };
}
export function addPayee(data){ S.payees.push({ id: uid(), fav: false, last: '', ...data }); commit(); }
export function updatePayee(id, patch){
  const p = S.payees.find(x => x.id === id);
  if (p) Object.assign(p, patch);
  commit();
}
export function deletePayee(id){
  S.payees = S.payees.filter(p => p.id !== id);
  S.requests = S.requests.filter(r => r.payeeId !== id);
  commit();
}

/* ---------------- money requests ---------------- */
export function requestMoney(payeeId, amount, note){
  const p = S.payees.find(x => x.id === payeeId);
  if (!p) return { ok: false, msg: 'Add a payee first' };
  if (!amount || amount <= 0) return { ok: false, msg: 'Enter an amount' };
  S.requests.unshift({ id: uid(), payeeId, name: p.name, amount: round2(amount),
    note: note || '', date: TODAY, status: 'Pending' });
  notif('Request sent', `${fmt(amount)} requested from ${p.name}`);
  return { ok: true };
}
export function settleRequest(id){
  const r = S.requests.find(x => x.id === id);
  if (!r) return { ok: false, msg: 'Request not found' };
  S.requests = S.requests.filter(x => x.id !== id);
  addTx(r.name, 'Income', r.amount, r.note || 'Money request paid');
  notif('Request paid', `${fmt(r.amount)} from ${r.name}`);
  return { ok: true };
}
export function cancelRequest(id){
  const before = S.requests.length;
  S.requests = S.requests.filter(x => x.id !== id);
  commit();
  return { ok: S.requests.length < before };
}

/* ---------------- salary sorter & paid early ---------------- */
export const sorterTotal = () =>
  round2(Object.values(S.sorter.splits || {}).reduce((a, v) => a + (Number(v) || 0), 0));

/* The salary figure comes off the last real pay, so a raise or a cut moves it. */
export function salaryAmount(){
  const t = S.tx.find(x => x.cat === 'Income' && /kingdom/i.test(x.name) && x.date < TODAY);
  return t ? Math.abs(t.amt) : 2480;
}

export function setSorter(splits, on = true){
  const clean = {};
  for (const [k, v] of Object.entries(splits || {})){
    const amt = round2(Math.max(0, Number(v) || 0));
    if (amt > 0) clean[k] = amt;
  }
  S.sorter = { on, splits: clean };
  commit();
  return { ok: true, total: sorterTotal() };
}
export function setSorterOn(on){ S.sorter.on = !!on; commit(); return { ok: true }; }

/* ---------------- scheduled money ---------------- */
/* A single running figure for the whole replay, so a day's debits can't each
   independently decide there is enough money. The ledger is recomputed once at
   the end; the checks are a guard rail, not a simulation of history. */
let runBal = 0;

function takeFunds(amt){
  const v = round2(Math.min(Number(amt) || 0, Math.max(0, runBal)));
  if (v <= 0) return 0;
  runBal = round2(runBal - v);
  return v;
}

/* Splits are bounded by the money that actually arrived. */
function applySorter(date = TODAY){
  if (!S.sorter || !S.sorter.on) return [];
  const done = [];
  for (const [potId, raw] of Object.entries(S.sorter.splits || {})){
    const p = S.pots.find(x => x.id === potId);
    if (!p) continue;
    const amt = takeFunds(raw);
    if (!amt) continue;
    p.bal = round2(p.bal + amt);
    insertTx({ id: uid(), date, time: '06:05', name: p.name, cat: 'Transfers',
      amt: -amt, bal: 0, note: 'Salary sorter' });
    done.push({ kind: 'sorter', pot: p.name, amt, date });
  }
  return done;
}

/* One salary per calendar month, whether it arrives by engine or by claim. */
function paySalary(date){
  const ym = date.slice(0, 7);
  if (S.gpeMonth === ym) return [];
  const salary = salaryAmount();
  if (salary <= 0) return [];
  S.gpeMonth = ym;
  runBal = round2(runBal + salary);
  insertTx({ id: uid(), date, time: '06:00', name: 'Kingdom Services Group',
    cat: 'Income', amt: salary, bal: 0, note: 'Net salary' });
  return [{ kind: 'salary', amt: salary, date }, ...applySorter(date)];
}

function autoSavePots(date){
  const done = [];
  for (const p of S.pots){
    if (!p.autoSave || p.autoSave <= 0) continue;
    const amt = takeFunds(p.autoSave);
    if (!amt) continue;
    p.bal = round2(p.bal + amt);
    insertTx({ id: uid(), date, time: '07:05', name: p.name, cat: 'Transfers',
      amt: -amt, bal: 0, note: 'Auto-save' });
    done.push({ kind: 'auto-save', pot: p.name, amt, date });
  }
  return done;
}

/* Replays every day between the watermark and `until`, applying salary, sorter,
   standing orders and pot auto-save in day order. Idempotent per day because the
   watermark only ever moves forward. */
export function runScheduled(until = TODAY){
  if (!S) return [];
  const from = S.lastRun || TODAY;
  if (until <= from){
    if (until > (S.lastRun || '')){ S.lastRun = until; commit(); }
    return [];
  }
  const start = asDate(from);
  const end = asDate(until);
  const span = Math.min(MAX_CATCHUP_DAYS, Math.round((end - start) / 86400000));

  runBal = balNow();
  const applied = [];
  let short = 0;

  for (let i = 1; i <= span; i++){
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const date = iso(d), day = d.getDate();

    if (day === 28) applied.push(...paySalary(date));
    if (day === 1) applied.push(...autoSavePots(date));

    S.sos.filter(s => s.active && s.day === day).forEach(s => {
      const amt = takeFunds(s.amt);
      if (!amt){ short++; return; }
      insertTx({ id: uid(), date, time: '07:00', name: s.name, cat: 'Bills',
        amt: -amt, bal: 0, note: 'Standing order' });
      applied.push({ kind: 'standing-order', name: s.name, amt, date });
    });
  }

  S.lastRun = until;
  recompute();
  commit();
  if (applied.length) notif('Scheduled payments', `${applied.length} applied to your account`);
  if (short) notif('Standing orders', `${short} skipped — not enough in your balance`);
  return applied;
}

export const gpeClaimed = () => S.gpeMonth === THIS_YM;

export function getPaidEarly(){
  if (S.gpeMonth === THIS_YM) return { ok: false, msg: 'Already claimed this month' };
  const salary = salaryAmount();
  if (salary <= 0) return { ok: false, msg: 'No salary due' };
  S.gpeMonth = THIS_YM;
  addTx('Kingdom Services Group', 'Income', salary, 'Salary paid early');
  runBal = balNow();
  const split = applySorter();
  if (split.length) recompute();
  notif('Paid early', `${fmt(salary)} is in your account`);
  commit();
  return { ok: true, salary, split };
}

export function addStandingOrder(name, amt, day){
  S.sos.push({ id: uid(), name, amt, day, active: true });
  commit();
}
export function toggleStandingOrder(id){
  const s = S.sos.find(x => x.id === id);
  if (s) s.active = !s.active;
  commit();
}
export function addSharedTab(name, total, people){
  S.tabs.push({ id: uid(), name, total, mine: round2(total / people), people, settled: false });
  commit();
}
export function settleTab(id){
  const t = S.tabs.find(x => x.id === id);
  if (!t) return { ok: false };
  if (t.mine > balNow()) return { ok: false, msg: 'Not enough in your balance' };
  S.tabs = S.tabs.filter(x => x.id !== id);
  addTx(t.name, 'Transfers', -t.mine, 'Shared tab settled');
  return { ok: true };
}

export function addVirtualCard(){
  const p = plan();
  if (!p.vcLive) return { ok: false, msg: 'Virtual cards need Extra, Perks or Max' };
  if (S.vcards.length >= p.vcLive) return { ok: false, msg: `Limit of ${p.vcLive} live virtual cards` };
  S.vcards.push({ id: uid(), label: 'Virtual card ' + (S.vcards.length + 1), frozen: false,
    num: '4000 ' + (1000 + Math.floor(Math.random() * 9000)), created: TODAY, single: false });
  commit();
  return { ok: true };
}
export function freezeVCard(id){
  const v = S.vcards.find(x => x.id === id);
  if (!v) return;
  v.frozen = !v.frozen;
  commit();
}
export function renameVCard(id, label){
  const v = S.vcards.find(x => x.id === id);
  if (v) v.label = label;
  commit();
}
export function deleteVCard(id){
  S.vcards = S.vcards.filter(v => v.id !== id);
  commit();
}
export function toggleFreeze(){ S.frozen = !S.frozen; commit(); }

export function setPlan(key){
  const from = plan(), to = PLANS[key];
  if (!to || key === S.plan) return { ok: false };
  const diff = round2(to.price - from.price);
  S.plan = key;
  syncPolicies();
  if (diff > 0) addTx('Monzo', 'Subscriptions', -diff, `${to.name} plan`);
  else commit();
  notif('Plan changed', `You're now on ${to.name}`);
  return { ok: true, diff };
}
export function setFamily(on){
  if (S.plan !== 'max') return { ok: false, msg: 'Family add-on needs Max' };
  S.family = on;
  if (on) addTx('Monzo', 'Subscriptions', -4, 'Max family add-on');
  else commit();
  return { ok: true };
}

export function setTarget(cat, value){ S.targets[cat] = Math.max(0, value); commit(); }
export function setProfile(patch){ Object.assign(S.profile, patch); commit(); }
export function setPin(pin){ S.pin = pin; commit(); }
export function setCredId(id){ S.credId = id; commit(); }
export function togglePriv(){ S.priv = !S.priv; commit(); return S.priv; }
export function toggleRoundups(){ S.roundups = !S.roundups; commit(); return S.roundups; }
export function setTheme(t){ S.theme = t; commit(); }
export function setZoom(z){ S.zoom = z; commit(); }
export function setMotion(on){ S.motion = on; commit(); }
export function setHomeEstimate(v, owed){ S.homeValue = v; S.mortgage = owed; commit(); }
export function setPension(v){ S.pension = v; commit(); }
export function setPensionMonthly(v){ S.pensionMonthly = v; commit(); }
export function setActiveAccount(key){ S.activeAccount = key; commit(); }

export function setLayout(next){ S.layout = next; commit(); }
export function moveLayoutSection(id, dir){
  const i = S.layout.findIndex(s => s.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= S.layout.length) return;
  [S.layout[i], S.layout[j]] = [S.layout[j], S.layout[i]];
  commit();
}
export function toggleLayoutSection(id){
  const s = S.layout.find(x => x.id === id);
  if (s){ s.on = !s.on; commit(); }
}

export function flexPurchase(name, amount, term){
  if (!amount || amount <= 0) return { ok: false, msg: 'Enter an amount' };
  if (amount > flexAvail()) return { ok: false, msg: 'Over your available limit' };
  S.flex.used = round2(S.flex.used + amount);
  S.flex.plans.unshift({ id: uid(), name, amount, remaining: amount, principal: amount, term,
    monthly: flexMonthly(amount, term) });
  notif('Paid with Flex', `${name} — ${fmt(amount)} over ${term} months`);
  commit();
  return { ok: true };
}
export function settleFlex(id){
  const p = S.flex.plans.find(x => x.id === id);
  if (!p) return { ok: false };
  if (p.remaining > balNow()) return { ok: false, msg: 'Not enough in your balance' };
  S.flex.plans = S.flex.plans.filter(x => x.id !== id);
  S.flex.used = Math.max(0, round2(S.flex.used - p.remaining));
  addTx('Monzo Flex', 'Transfers', -p.remaining, 'Settled early — ' + p.name);
  return { ok: true };
}

export function arrangeOverdraft(limit){
  S.overdraft = { limit, rate: limit > 1000 ? 19 : 29 };
  notif('Overdraft arranged', `${fmt(limit)} available`);
  commit();
}
export function cancelOverdraft(){
  S.overdraft = { limit: 0, rate: 0 };
  notif('Overdraft cancelled', 'Your arranged limit is now £0');
  commit();
}

export function takeLoan(amount, term){
  if (amount < 1000 || amount > 35000) return { ok: false, msg: 'Enter £1,000 to £35,000' };
  const apr = aprForLoan(amount);
  const monthly = loanMonthly(amount, term);
  S.loans.push({ id: uid(), amount, term, apr, monthly, outstanding: round2(monthly * term), paid: 0 });
  notif('Loan approved', `${fmt(amount)} paid into your account`);
  addTx('Monzo Loans', 'Income', amount, 'Loan advance');
  return { ok: true };
}
export function overpayLoan(id, amt){
  const l = S.loans.find(x => x.id === id);
  if (!l) return { ok: false };
  if (amt <= 0) return { ok: false, msg: 'Enter an amount' };
  if (amt > balNow()) return { ok: false, msg: 'Not enough in your balance' };
  const pay = Math.min(amt, l.outstanding);
  l.outstanding = round2(l.outstanding - pay);
  if (l.outstanding <= 0.01) S.loans = S.loans.filter(x => x.id !== id);
  addTx('Monzo Loans', 'Transfers', -pay, 'Overpayment');
  return { ok: true };
}

export function challengeSave(){
  const c = S.challenge;
  if (c.day >= 365) return { ok: false, msg: 'Challenge complete' };
  const amt = round2((c.day + 1) / 100);
  if (amt > balNow()) return { ok: false, msg: 'Not enough in your balance' };
  c.day++;
  c.saved = round2(c.saved + amt);
  addTx('Saving Challenge', 'Savings', -amt, 'Day ' + c.day);
  return { ok: true, amt };
}
export function restartChallenge(){
  const back = S.challenge.saved;
  S.challenge = { day: 0, saved: 0, level: '1p' };
  if (back > 0) addTx('Saving Challenge', 'Savings', back, 'Challenge reset');
  else commit();
}

export function billsbackOptIn(){
  if (!plan().billsback) return { ok: false, msg: 'Billsback needs Extra' };
  S.billsback.optIn = !S.billsback.optIn;
  commit();
  return { ok: true, on: S.billsback.optIn };
}
export function billsbackDraw(rng = Math.random){
  if (!plan().billsback) return { ok: false, msg: 'Billsback needs Extra' };
  if (!S.billsback.optIn) return { ok: false, msg: 'Opt in first' };
  const bills = bbBills();
  if (!bills.length) return { ok: false, msg: 'No eligible bills this month' };
  const won = rng() < 0.25;
  const bill = bills[Math.floor(rng() * bills.length)] || bills[0];
  const amount = won ? round2(Math.min(Math.abs(bill.amt), BB_CAP)) : 0;
  S.billsback.history.unshift({ month: MONTHS[NOW.getMonth()], won, amount, bill: won ? bill.name : '' });
  if (won){
    notif('Billsback', `${bill.name} — ${fmt(amount)} paid back`);
    addTx('Monzo Billsback', 'Income', amount, bill.name + ' paid back');
  } else {
    notif('Billsback', 'No win this month');
    commit();
  }
  return { ok: true, won, amount };
}

export function connectBank(bank){
  if (S.connected.some(c => c.bank === bank)) return { ok: false, msg: 'Already connected' };
  S.connected.push({ id: uid(), bank, kind: 'Current account', bal: 120 + Math.floor(Math.random() * 3280) });
  notif('Account connected', bank + ' added');
  commit();
  return { ok: true };
}
export function removeBank(id){
  S.connected = S.connected.filter(c => c.id !== id);
  commit();
}

/* ---------------- additional accounts ---------------- */
export function addExtraAccount(name, type){
  S.extraAccounts.push({ id: uid(), name, type, status: 'Active', bal: 0 });
  notif('Account opened', `${type} account for ${name}`);
  commit();
}
export function updateExtraAccount(id, patch){
  const a = S.extraAccounts.find(x => x.id === id);
  if (a) Object.assign(a, patch);
  commit();
}
export function moveToExtraAccount(id, amt){
  const a = S.extraAccounts.find(x => x.id === id);
  if (!a) return { ok: false, msg: 'No such account' };
  if (!amt || amt <= 0) return { ok: false, msg: 'Enter an amount' };
  if (amt > balNow()) return { ok: false, msg: 'Not enough in your balance' };
  a.bal = round2((a.bal || 0) + amt);
  addTx(a.name, 'Transfers', -amt, 'Moved to ' + a.name);
  return { ok: true };
}
/* Closing hands the balance back before the account disappears. */
export function closeExtraAccount(id){
  const a = S.extraAccounts.find(x => x.id === id);
  if (!a) return { ok: false, msg: 'No such account' };
  const bal = round2(a.bal || 0);
  S.extraAccounts = S.extraAccounts.filter(x => x.id !== id);
  if (bal > 0){
    addTx(a.name, 'Transfers', bal, a.name + ' closed — balance returned');
    notif('Account closed', `${fmt(bal)} returned to ${S.acctName}`);
    return { ok: true, returned: bal };
  }
  notif('Account closed', a.name + ' closed');
  commit();
  return { ok: true, returned: 0 };
}

/* Closing the current account moves the balance to the joint account and
   leaves the shell in place so it can be reopened. */
export function closeAccount(){
  if (S.acctClosed) return { ok: false, msg: 'Already closed' };
  const bal = round2(balNow());
  if (bal > 0){
    S.jointBal = round2((S.jointBal || 0) + bal);
    insertTx({ id: uid(), date: TODAY, time: NOWT, name: 'Joint account', cat: 'Transfers',
      amt: -bal, bal: 0, note: 'Balance moved — account closed' });
    recompute();
  }
  S.acctClosed = true;
  S.activeAccount = 'joint';
  notif('Account closed', bal > 0
    ? `${fmt(bal)} moved to your joint account`
    : 'Your current account is closed');
  commit();
  return { ok: true, moved: bal };
}
export function reopenAccount(){
  if (!S.acctClosed) return { ok: false, msg: 'Already open' };
  S.acctClosed = false;
  S.activeAccount = 'personal';
  notif('Account reopened', 'Your current account is active again');
  commit();
  return { ok: true };
}

export function setAura(patch){ Object.assign(S.aura, patch); commit(); }
export function takeAura(){
  const next = !S.aura.active;
  S.aura.active = next;
  if (next) addTx('Monzo Aura', 'Subscriptions', -15, 'Aura monthly fee');
  else commit();
  return next;
}
export function payOutCashback(){
  const amt = round2(S.aura.cashback || 0);
  if (amt < CASHBACK_MIN) return { ok: false, msg: `£${CASHBACK_MIN} minimum to move out` };
  S.aura.cashback = 0;
  addTx('Monzo Aura', 'Income', amt, 'Cashback paid out');
  return { ok: true, amt };
}

/* ---------------- policies ---------------- */
export function syncPolicies(){
  const cover = !!plan().cover;
  S.policies.forEach(p => {
    if (cover){ p.status = 'Active'; p.ended = ''; }
    else { p.status = 'Ended'; p.ended ||= TODAY; }
  });
  commit();
}

export const CREDIT_ACTIONS = [
  { key: 'electoral', label: 'Register on the electoral roll', gain: 22 },
  { key: 'utilisation', label: 'Keep utilisation under 30%', gain: 15 },
  { key: 'directdebit', label: 'Add a direct debit', gain: 10 },
  { key: 'address', label: 'Confirm your address history', gain: 8 }
];
export function creditAction(key){
  if (S.credit.done.includes(key)) return { ok: false, msg: 'Already done' };
  const action = CREDIT_ACTIONS.find(a => a.key === key);
  if (!action) return { ok: false };
  S.credit.done.push(key);
  S.credit.eq = Math.min(999, S.credit.eq + action.gain);
  S.credit.tu = Math.min(999, S.credit.tu + action.gain);
  notif('Credit score updated', action.label);
  commit();
  return { ok: true, gain: action.gain };
}

export function raiseDispute(name, reason){
  S.disputes.unshift({ id: uid(), name, reason, date: TODAY, status: 'Open' });
  notif('Dispute raised', name + " — we'll look into it");
  commit();
}
export function closeDispute(id){
  const d = S.disputes.find(x => x.id === id);
  if (d) d.status = 'Closed';
  commit();
}

export function notif(title, body){
  S.notifs.unshift({ title, body, date: TODAY, time: NOWT, read: false });
  S.notifs = S.notifs.slice(0, 40);
  S.notifsCleared = false;
  commit();
}
export function seedNotifs(){
  const back = n => iso(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - n));
  S.notifs = [
    { title: 'Left to spend updated', body: 'Recalculated for the days before payday', date: TODAY, time: NOWT, read: false },
    { title: 'Salary received', body: '£2,850.00 from Kingdom Services Group', date: back(1), time: '06:00', read: true },
    { title: 'Round-ups', body: '£1.42 moved to Rainy Day', date: back(2), time: '18:24', read: true }
  ];
  S.notifsCleared = false;
}
export const unread = () => S.notifs.filter(n => !n.read).length;
export function syncBell(){
  const d = document.getElementById('bellDot');
  if (d) d.classList.toggle('on', unread() > 0);
}
export function markAllRead(){ S.notifs.forEach(n => { n.read = true; }); commit(); syncBell(); }
export function clearNotifs(){ S.notifs = []; S.notifsCleared = true; commit(); syncBell(); }
export function pushChat(who, text){ S.chat.push({ who, text, time: NOWT }); commit(); }

export function runInterest(){
  if (S.lastInterest === THIS_YM) return;
  let paid = 0;
  S.pots.forEach(p => {
    if (p.type !== 'savings' || p.bal <= 0) return;
    const int = round2(p.bal * (plan().ia / 100 / 12));
    if (int > 0){ p.bal = round2(p.bal + int); paid = round2(paid + int); }
  });
  S.lastInterest = THIS_YM;
  if (paid > 0){
    S.notifs.unshift({ title: 'Interest paid', body: `${fmt(paid)} across your savings pots`,
      date: TODAY, time: NOWT, read: false });
  }
  commit();
}

export function runTick(){
  if (S.lastTick === THIS_YM) return;
  let flexPaid = 0, loanPaid = 0;
  S.flex.plans.forEach(p => {
    if (p.remaining <= 0) return;
    const pay = round2(Math.min(p.monthly, p.remaining));
    if (pay > balNow()) return;
    p.remaining = round2(p.remaining - pay);
    /* the limit recovers on principal, not on interest */
    const principal = round2(Math.min(pay, p.principal));
    p.principal = round2(p.principal - principal);
    S.flex.used = Math.max(0, round2(S.flex.used - principal));
    insertTx({ id: uid(), date: TODAY, time: NOWT, name: 'Monzo Flex', cat: 'Transfers',
      amt: -pay, bal: 0, note: `Instalment of ${p.term}` });
    flexPaid = round2(flexPaid + pay);
  });
  S.flex.plans = S.flex.plans.filter(p => p.remaining > 0.01);
  S.loans.forEach(l => {
    if (l.outstanding <= 0) return;
    const pay = round2(Math.min(l.monthly, l.outstanding));
    if (pay > balNow()) return;
    l.outstanding = round2(l.outstanding - pay);
    l.paid += 1;
    insertTx({ id: uid(), date: TODAY, time: NOWT, name: 'Monzo Loans', cat: 'Transfers',
      amt: -pay, bal: 0, note: `Repayment ${l.paid} of ${l.term}` });
    loanPaid = round2(loanPaid + pay);
  });
  S.loans = S.loans.filter(l => l.outstanding > 0.01);
  S.lastTick = THIS_YM;
  recompute();
  if (flexPaid) S.notifs.unshift({ title: 'Flex instalment', body: `${fmt(flexPaid)} taken`, date: TODAY, time: NOWT, read: false });
  if (loanPaid) S.notifs.unshift({ title: 'Loan repayment', body: `${fmt(loanPaid)} taken`, date: TODAY, time: NOWT, read: false });
  commit();
}

export { CATS, FLEX, COMMITTED, BANKS, BB_PROVIDERS, BB_CAP, DOMAINS, TARGET_ISA };
