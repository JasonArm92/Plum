/* src/core.js — clock, formatting, DOM helpers, storage, state, actions, selectors. */

import {
  PLANS, CATS, FLEX, COMMITTED, DEFAULT_TARGETS, BANKS, BB_PROVIDERS, BB_CAP,
  DOMAINS, POTS0, TARGET_ISA, buildSeed, uid
} from './data.js';

export const VERSION = 12;
const KEY = 'monzo_v12';

/* ---------------- clock ---------------- */
export const NOW = new Date();
export const TODAY = iso(NOW);
export const NOWT = `${p2(NOW.getHours())}:${p2(NOW.getMinutes())}`;
export const THIS_YM = TODAY.slice(0, 7);
export const MONTHS = ['January','February','March','April','May','June','July',
  'August','September','October','November','December'];
export const TAX_START = `${NOW.getMonth() >= 3 ? NOW.getFullYear() : NOW.getFullYear() - 1}-04-06`;

function p2(n){ return String(n).padStart(2, '0'); }
export function iso(d){ return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }
export function asDate(s){ return new Date(s + 'T12:00:00'); }
export function monthLen(y, m){ return new Date(y, m + 1, 0).getDate(); }
export function dom(y, m, day){ return `${y}-${p2(m + 1)}-${p2(Math.min(day, monthLen(y, m)))}`; }

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

/* ---------------- format ---------------- */
export function fmt(n){
  return '£' + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export const round2 = n => Math.round(n * 100) / 100;
export const esc = s => String(s).replace(/[&<>"']/g,
  c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const pct = (a, b) => b ? Math.min(100, (a / b) * 100) : 0;

/* ---------------- DOM helpers ---------------- */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export function el(tag, attrs = {}, html){
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') n.className = v;
    else if (k.startsWith('data-')) n.setAttribute(k, v);
    else n[k] = v;
  });
  if (html != null) n.innerHTML = html;
  return n;
}
export function clear(node){ while (node.firstChild) node.removeChild(node.firstChild); }
export function delegate(root, selector, type, handler){
  root.addEventListener(type, e => {
    const t = e.target.closest(selector);
    if (t && root.contains(t)) handler(e, t);
  });
}

/* ---------------- state ---------------- */
let S = null;
const listeners = new Set();

export function getState(){ return S; }
export function subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }
function notify(){ listeners.forEach(fn => fn(S)); }

/* ---------------- schema ---------------- */
export function freshState(){
  const seedData = buildSeed(NOW);
  return {
    v: VERSION,
    tx: seedData.tx,
    isa: seedData.isa,
    pots: POTS0.map(p => ({ id: uid(), ...p })),
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
    vcards: [{ id: uid(), label: 'Subscriptions', frozen: false, num: '4000 1234', created: TODAY }],
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
    plan: 'max', priv: false, roundups: true, credId: null, pin: '2580', frozen: false,
    theme: 'auto', zoom: 1, motion: true,
    pension: 41250.18, homeValue: 168000, mortgage: 100000,
    flex: { limit: 4000, used: 0, plans: [] },
    aura: { active: true, auto: true, lounge: 2, fast: 2, cashback: 0 },
    overdraft: { limit: 0, rate: 0 },
    loans: [], connected: [], extraAccounts: [],
    credit: { eq: 560 + Math.floor(Math.random() * 160), tu: 540 + Math.floor(Math.random() * 160) },
    challenge: { day: 0, saved: 0 },
    billsback: { optIn: false, history: [] },
    lastInterest: '', lastTick: '',
    notifs: [], chat: [], disputes: [], revealed: []
  };
}

/* ---------------- migrations ---------------- */
const migrations = [
  s => {
    s.v = 12;
    s.flex ||= { limit: 4000, used: 0, plans: [] };
    s.aura ||= { active: true, auto: true, lounge: 2, fast: 2, cashback: 0 };
    s.overdraft ||= { limit: 0, rate: 0 };
    s.loans ||= []; s.connected ||= []; s.extraAccounts ||= [];
    s.credit ||= { eq: 640, tu: 620 };
    s.challenge ||= { day: 0, saved: 0 };
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
  }
];

export function migrate(raw){
  let s = raw;
  const from = s.v || 11;
  for (let v = from; v < VERSION; v++){
    const step = migrations[v - 11];
    if (step) s = step(s);
  }
  s.v = VERSION;
  return s;
}

/* ---------------- persistence ---------------- */
export function load(){
  const params = new URLSearchParams(location.search);
  if (params.get('reset') === '1') localStorage.removeItem(KEY);

  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch { raw = null; }

  if (!raw || (raw.v || 0) > VERSION){
    S = freshState();
  } else {
    S = migrate(raw);
  }
  S.revealed = new Set(S.revealed || []);
  if (!S.notifs.length) seedNotifs();
  save();
  return S;
}

let saveTimer = null;
export function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...S, revealed: [...S.revealed] }));
    } catch { /* quota */ }
  }, 60);
}
export function commit(){ save(); notify(S); }

/* ---------------- selectors ---------------- */
export const plan = () => PLANS[S.plan];
export const PLANS_BANK = () => PLANS;
export const balNow = () => S.tx.length ? S.tx[0].bal : 0;
export const isaBal = () => S.isa.length ? S.isa[0].value : 0;
export const potTotal = () => S.pots.reduce((a, p) => a + p.bal, 0);
export const savingsTotal = () => S.pots.filter(p => p.type === 'savings').reduce((a, p) => a + p.bal, 0);
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

export function committedLeft(){
  const d = daysToPayday();
  let sum = 0;
  if (d >= 1) sum += 19 + 11.99 + 10.99;
  if (d >= 2) sum += 96 + 38.2 + 148;
  if (d >= 4) sum += 32 + 22;
  if (d >= 5) sum += 24.4;
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

/* ---------------- domain maths ---------------- */
export function flexMonthly(amount, term){
  if (term === 3) return round2(amount / 3);
  return round2(amount * (1 + 0.29 * term / 12) / term);
}
export function aprForLoan(amount){ return amount > 10000 ? 10 : 23; }
export function loanMonthly(amount, term){
  const apr = aprForLoan(amount);
  return round2(amount * (1 + apr / 100 * term / 12) / term);
}

/* ---------------- actions ---------------- */
export function addTx(name, cat, amt, note = '', dateOverride){
  const date = dateOverride || TODAY;
  const time = dateOverride && dateOverride !== TODAY ? '12:00' : NOWT;
  S.tx.unshift({
    id: uid(), date, time, name, cat, amt: round2(amt),
    bal: round2(balNow() + amt), note
  });
  commit();
}

export function moveToPot(potId, amt, dir){
  const p = S.pots.find(x => x.id === potId);
  if (!p) return { ok: false, msg: 'No such pot' };
  if (dir === 'in'){
    if (amt > balNow()) return { ok: false, msg: 'Not enough in your balance' };
    p.bal = round2(p.bal + amt);
    addTx(p.name, 'Transfers', -amt, 'Moved to pot');
  } else {
    if (amt > p.bal) return { ok: false, msg: 'Not enough in that pot' };
    p.bal = round2(p.bal - amt);
    addTx(p.name, 'Transfers', amt, 'Moved from pot');
  }
  commit();
  return { ok: true };
}

export function createPot(name, type, goal){
  S.pots.push({ id: uid(), name, type, goal: Math.max(1, goal), bal: 0 });
  commit();
}
export function updatePot(id, patch){
  const p = S.pots.find(x => x.id === id);
  if (p) Object.assign(p, patch);
  commit();
}
export function removePot(id){
  S.pots = S.pots.filter(p => p.id !== id);
  commit();
}

export function sendMoney(payeeId, amount, ref){
  const p = S.payees.find(x => x.id === payeeId);
  if (!p) return { ok: false, msg: 'No such payee' };
  if (amount > balNow()) return { ok: false, msg: 'Not enough in your balance' };
  addTx(p.name, 'Transfers', -amount, ref || 'Payment');
  p.last = TODAY;
  notif('Payment sent', `${fmt(amount)} to ${p.name}`);
  commit();
  return { ok: true };
}

export function addPayee(data){
  S.payees.push({ id: uid(), fav: false, last: '', ...data });
  commit();
}
export function updatePayee(id, patch){
  const p = S.payees.find(x => x.id === id);
  if (p) Object.assign(p, patch);
  commit();
}
export function deletePayee(id){
  S.payees = S.payees.filter(p => p.id !== id);
  commit();
}

export function addStandingOrder(name, amt, day){
  S.sos.push({ id: uid(), name, amt, day, active: true });
  commit();
}
export function addSharedTab(name, total, people){
  S.tabs.push({ id: uid(), name, total, mine: round2(total / people), people });
  commit();
}
export function addVirtualCard(){
  const p = plan();
  if (!p.vcLive) return { ok: false, msg: 'Virtual cards need Extra, Perks or Max' };
  if (S.vcards.length >= p.vcLive) return { ok: false, msg: `Limit of ${p.vcLive} live virtual cards` };
  S.vcards.push({ id: uid(), label: 'Virtual card ' + (S.vcards.length + 1), frozen: false,
    num: '4000 ' + (1000 + Math.floor(Math.random() * 9000)), created: TODAY });
  commit();
  return { ok: true };
}
export function toggleFreeze(){ S.frozen = !S.frozen; commit(); }

export function setPlan(key){
  const from = plan(), to = PLANS[key];
  if (!to || key === S.plan) return { ok: false };
  const diff = round2(to.price - from.price);
  S.plan = key;
  if (diff > 0) addTx('Monzo', 'Subscriptions', -diff, `${to.name} plan`);
  notif('Plan changed', `You're now on ${to.name}`);
  commit();
  return { ok: true, diff };
}

export function setTarget(cat, value){ S.targets[cat] = Math.max(0, value); commit(); }
export function setProfile(patch){ Object.assign(S.profile, patch); commit(); }
export function setPin(pin){ S.pin = pin; commit(); }
export function setCredId(id){ S.credId = id; commit(); }
export function togglePriv(){ S.priv = !S.priv; commit(); return S.priv; }
export function toggleRoundups(){ S.roundups = !S.roundups; commit(); }
export function setTheme(t){ S.theme = t; commit(); }
export function setZoom(z){ S.zoom = z; commit(); }
export function setMotion(on){ S.motion = on; commit(); }
export function setHomeEstimate(value, owed){ S.homeValue = value; S.mortgage = owed; commit(); }
export function setPension(v){ S.pension = v; commit(); }

export function setLayout(next){ S.layout = next; commit(); }
export function moveLayoutSection(id, dir){
  const i = S.layout.findIndex(s => s.id === id), j = i + dir;
  if (j < 0 || j >= S.layout.length) return;
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
  S.flex.plans.unshift({
    id: uid(), name, amount, remaining: amount, term, monthly: flexMonthly(amount, term)
  });
  notif('Paid with Flex', `${name} — ${fmt(amount)} over ${term} months`);
  commit();
  return { ok: true };
}

export function arrangeOverdraft(limit){
  S.overdraft = { limit, rate: limit > 1000 ? 19 : 29 };
  notif('Overdraft arranged', `${fmt(limit)} available`);
  commit();
}

export function takeLoan(amount, term){
  if (amount < 1000 || amount > 35000) return { ok: false, msg: 'Enter £1,000 to £35,000' };
  const apr = aprForLoan(amount);
  const monthly = loanMonthly(amount, term);
  S.loans.push({ id: uid(), amount, term, apr, monthly,
    outstanding: round2(monthly * term), paid: 0 });
  addTx('Monzo Loans', 'Income', amount, 'Loan advance');
  notif('Loan approved', `${fmt(amount)} paid into your account`);
  commit();
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
  commit();
  return { ok: true, amt };
}

export function billsbackOptIn(){
  if (!plan().billsback) return { ok: false, msg: 'Billsback needs Extra' };
  S.billsback.optIn = !S.billsback.optIn;
  commit();
  return { ok: true, on: S.billsback.optIn };
}

export function billsbackDraw(){
  if (!plan().billsback) return { ok: false, msg: 'Billsback needs Extra' };
  if (!S.billsback.optIn) return { ok: false, msg: 'Opt in first' };
  const bills = bbBills();
  if (!bills.length) return { ok: false, msg: 'No eligible bills this month' };
  const won = Math.random() < 0.25;
  const bill = bills[Math.floor(Math.random() * bills.length)];
  const amount = won ? round2(Math.min(Math.abs(bill.amt), BB_CAP)) : 0;
  S.billsback.history.unshift({
    month: MONTHS[NOW.getMonth()], won, amount, bill: won ? bill.name : ''
  });
  if (won){
    addTx('Monzo Billsback', 'Income', amount, bill.name + ' paid back');
    notif('Billsback', `${bill.name} — ${fmt(amount)} paid back`);
  } else notif('Billsback', 'No win this month');
  commit();
  return { ok: true, won, amount };
}

export function connectBank(bank){
  if (S.connected.some(c => c.bank === bank)) return { ok: false, msg: 'Already connected' };
  S.connected.push({ id: uid(), bank, kind: 'Current account',
    bal: 120 + Math.floor(Math.random() * 3280) });
  notif('Account connected', bank + ' added');
  commit();
  return { ok: true };
}

export function addExtraAccount(name, type){
  S.extraAccounts.push({ id: uid(), name, type, status: 'Active' });
  notif('Account opened', `${type} account for ${name}`);
  commit();
}
export function setAura(patch){ Object.assign(S.aura, patch); commit(); }
export function takeAura(){
  const next = !S.aura.active;
  S.aura.active = next;
  if (next) addTx('Monzo Aura', 'Subscriptions', -15, 'Aura monthly fee');
  commit();
  return next;
}

export function raiseDispute(name, reason){
  S.disputes.unshift({ id: uid(), name, reason, date: TODAY });
  notif('Dispute raised', name + " — we'll look into it");
  commit();
}

export function notif(title, body){
  S.notifs.unshift({ title, body, date: TODAY, time: NOWT });
  S.notifs = S.notifs.slice(0, 40);
  commit();
}
export function seedNotifs(){
  const back = n => iso(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - n));
  S.notifs = [
    { title: 'Left to spend updated', body: 'Recalculated for the days before payday', date: TODAY, time: NOWT },
    { title: 'Salary received', body: '£2,850.00 from Kingdom Services Group', date: back(1), time: '06:00' },
    { title: 'Round-ups', body: '£1.42 moved to Rainy Day', date: back(2), time: '18:24' }
  ];
}
export function clearNotifs(){ S.notifs = []; commit(); }
export function pushChat(who, text){
  S.chat.push({ who, text, time: NOWT });
  commit();
}

export function markRevealed(node, on){
  if (on) S.revealed.add(node); else S.revealed.delete(node);
  save();
}

/* ---------------- monthly ticks ---------------- */
export function runInterest(){
  if (S.lastInterest === THIS_YM) return;
  S.lastInterest = THIS_YM;
  let paid = 0;
  S.pots.forEach(p => {
    if (p.type !== 'savings' || p.bal <= 0) return;
    const int = round2(p.bal * (plan().ia / 100 / 12));
    if (int > 0){ p.bal = round2(p.bal + int); paid = round2(paid + int); }
  });
  if (paid > 0) S.notifs.unshift({ title: 'Interest paid',
    body: `${fmt(paid)} across your savings pots`, date: TODAY, time: NOWT });
  commit();
}

export function runTick(){
  if (S.lastTick === THIS_YM) return;
  S.lastTick = THIS_YM;
  let flexPaid = 0, loanPaid = 0;

  S.flex.plans.forEach(p => {
    if (p.remaining <= 0) return;
    const pay = round2(Math.min(p.monthly, p.remaining));
    if (pay > balNow()) return;
    addTx('Monzo Flex', 'Transfers', -pay, `Instalment of ${p.term}`);
    p.remaining = round2(p.remaining - pay);
    S.flex.used = Math.max(0, round2(S.flex.used - pay));
    flexPaid = round2(flexPaid + pay);
  });
  S.flex.plans = S.flex.plans.filter(p => p.remaining > 0.01);

  S.loans.forEach(l => {
    if (l.outstanding <= 0) return;
    const pay = round2(Math.min(l.monthly, l.outstanding));
    if (pay > balNow()) return;
    addTx('Monzo Loans', 'Transfers', -pay, `Repayment ${l.paid + 1} of ${l.term}`);
    l.outstanding = round2(l.outstanding - pay);
    l.paid += 1;
    loanPaid = round2(loanPaid + pay);
  });
  S.loans = S.loans.filter(l => l.outstanding > 0.01);

  if (flexPaid) S.notifs.unshift({ title: 'Flex instalment', body: `${fmt(flexPaid)} taken`, date: TODAY, time: NOWT });
  if (loanPaid) S.notifs.unshift({ title: 'Loan repayment', body: `${fmt(loanPaid)} taken`, date: TODAY, time: NOWT });
  commit();
}

export { CATS, FLEX, COMMITTED, BANKS, BB_PROVIDERS, BB_CAP, DOMAINS, TARGET_ISA };
