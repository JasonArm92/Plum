import {
  state, fmt, fmtShort, round2, leftToSpend, spentThisMonth, byCategory,
  lastMonthByCategory, upcoming, totalPots, flexApr, flexPurchase, FLEX_MIN,
  FLEX_MONTHS, addTx, takeFunds, potMove, save
} from './core.js?v=33';
import { CATEGORIES, SAVINGS_INTEREST } from './data.js?v=33';
import {
  el, screen, row, list, section, tile, avatar, icon, cardArt, ring, empty,
  toast, sheet, confirmSheet, field, input, seg, switchEl
} from './ui.js?v=33';

const cat = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
const rerender = () => document.dispatchEvent(new CustomEvent('render'));

/* ============ HOME ============ */

export function homeScreen() {
  const s = el('section', 'screen');
  s.id = 'screen-home';

  const h = el('header', 'hdr');
  const av = el('button', 'hdr__btn');
  av.style.padding = '0';
  av.style.background = 'transparent';
  av.setAttribute('aria-label', 'Profile');
  av.appendChild(avatar(36));
  av.onclick = () => { location.hash = '#/account'; };
  h.appendChild(av);
  const title = el('div', 'hdr__title');
  title.textContent = 'Home';
  h.appendChild(title);
  const add = el('button', 'hdr__btn');
  add.type = 'button';
  add.setAttribute('aria-label', 'Add transaction');
  add.appendChild(icon('plus', 18));
  add.onclick = () => import('./screens-b.js?v=33').then(m => m.addTxSheet());
  h.appendChild(add);
  s.appendChild(h);

  const body = el('div', 'screen__body');
  body.style.padding = '16px 0 16px';

  const L = state.layout;
  for (const key of L.order) {
    if (L.hidden.includes(key)) continue;
    if (key === 'card') {
      const w = el('div');
      w.style.padding = '0 16px';
      w.appendChild(cardArt(state.cards[0], () => import('./screens-b.js?v=33').then(m => m.cardSheet())));
      body.appendChild(w);
    } else if (key === 'balance') {
      const w = el('div');
      w.style.padding = '0 16px';
      const lbl = el('div', 'balance__lbl');
      lbl.textContent = 'Personal · ' + (state.cards[0].last4 || '4821');
      w.appendChild(lbl);
      const b = el('div', 'balance', state.settings.hideBalance ? '••••••' : fmt(state.balance));
      b.onclick = () => {
        state.settings.hideBalance = !state.settings.hideBalance;
        save();
        rerender();
      };
      w.appendChild(b);
      body.appendChild(w);
    } else if (key === 'ring') {
      const w = el('div');
      w.style.padding = '0 16px';
      w.appendChild(leftToSpendCard());
      body.appendChild(w);
    } else if (key === 'carousel') {
      body.appendChild(carousel());
    } else if (key === 'activity') {
      body.appendChild(activity());
    }
  }

  const edit = el('div');
  edit.style.padding = '8px 16px 0';
  const eb = el('button', 'btn btn--ghost btn--sm btn--block');
  eb.textContent = 'Edit home';
  eb.onclick = () => import('./screens-b.js?v=33').then(m => m.layoutSheet());
  edit.appendChild(eb);
  body.appendChild(edit);

  s.appendChild(body);
  return s;
}

function leftToSpendCard() {
  const c = el('div', 'card');
  const left = leftToSpend();
  const total = Math.max(1, state.balance);
  const w = el('div', 'ringwrap');
  w.appendChild(ring(Math.min(1, left / total)));
  const m = el('div', 'ringwrap__main');
  m.appendChild(el('div', 'ringwrap__l', 'Left to spend'));
  m.appendChild(el('div', 'ringwrap__v', fmt(left)));
  m.appendChild(el('div', 'hint', 'After ' + fmt(upcoming()) + ' of bills in the next 7 days'));
  w.appendChild(m);
  c.appendChild(w);
  return c;
}

function carousel() {
  const wrap = el('div');
  const head = el('div', 'sect');
  head.style.margin = '4px 16px 8px';
  head.textContent = 'Save & invest';
  wrap.appendChild(head);

  const track = el('div', 'carousel');

  for (const key of state.layout.carousel) {
    if (key === 'pots') {
      for (const p of state.pots) {
        const b = el('button', 'pcard');
        b.type = 'button';
        const ico = el('div', 'pcard__ico', p.emoji || '🏦');
        ico.style.background = (p.colour || '#eeeeee') + '22';
        b.appendChild(ico);
        b.appendChild(el('div', 'pcard__n', p.name));
        const bar = el('div', 'pbar');
        const f = el('div', 'pbar__f');
        f.style.width = Math.min(100, Math.round(((p.saved || 0) / Math.max(1, p.target)) * 100)) + '%';
        bar.appendChild(f);
        b.appendChild(bar);
        b.appendChild(el('div', 'pcard__v', fmtShort(p.saved || 0)));
        b.onclick = () => { location.hash = '#/pot/' + p.id; };
        track.appendChild(b);
      }
      const add = el('button', 'pcard pcard--new');
      add.type = 'button';
      add.innerHTML = '<div style="font-size:22px">＋</div><div>New pot</div>';
      add.onclick = () => import('./screens-b.js?v=33').then(m => m.newPotSheet());
      track.appendChild(add);
    } else if (key === 'pension') {
      const b = el('button', 'pcard');
      b.type = 'button';
      const ico = el('div', 'pcard__ico', '🏛️');
      ico.style.background = '#e8f0fe';
      b.appendChild(ico);
      b.appendChild(el('div', 'pcard__n', 'Pension'));
      b.appendChild(el('div', 'pcard__v', fmtShort(state.pension.balance)));
      b.onclick = () => { location.hash = '#/pension'; };
      track.appendChild(b);
    } else if (key === 'isa') {
      const b = el('button', 'pcard');
      b.type = 'button';
      const ico = el('div', 'pcard__ico', '📈');
      ico.style.background = '#e6f7ee';
      b.appendChild(ico);
      b.appendChild(el('div', 'pcard__n', 'Stocks & Shares ISA'));
      b.appendChild(el('div', 'pcard__v', fmtShort(state.isa.balance)));
      b.onclick = () => { location.hash = '#/isa'; };
      track.appendChild(b);
    }
  }

  wrap.appendChild(track);
  return wrap;
}

function activity() {
  const wrap = el('div');
  const head = el('div', 'sect');
  head.style.margin = '8px 16px 4px';
  head.textContent = 'Activity';
  wrap.appendChild(head);

  const l = el('div');
  let lastDay = '';
  const sorted = state.tx.slice().sort((a, b) => b.ts - a.ts).slice(0, 40);
  for (const t of sorted) {
    const d = new Date(t.ts).toDateString();
    if (d !== lastDay) {
      lastDay = d;
      l.appendChild(el('div', 'daysep', dayText(t.ts)));
    }
    const b = el('button', 'act');
    b.type = 'button';
    b.appendChild(tile(t.name));
    const m = el('div', 'act__main');
    m.appendChild(el('div', 'act__t', t.name));
    m.appendChild(el('div', 'act__s', cat(t.category).name));
    b.appendChild(m);
    b.appendChild(el('div', 'act__v' + (t.amount > 0 ? ' pos' : ''), (t.amount > 0 ? '+' : '') + fmt(t.amount)));
    b.onclick = () => { location.hash = '#/tx/' + t.id; };
    l.appendChild(b);
  }
  if (!sorted.length) l.appendChild(empty('No transactions yet', 'Tap + to add one'));
  wrap.appendChild(l);
  return wrap;
}

function dayText(ts) {
  const d = new Date(ts), t = new Date();
  const diff = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) -
    new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'});
}

/* ============ TRENDS ============ */

export function trendsScreen() {
  const spent = spentThisMonth();
  const cats = byCategory();
  const prev = lastMonthByCategory();
  const total = Math.max(1, spent);
  const body = el('div');

  const top = el('div', 'card');
  const rw = el('div', 'ringwrap');
  const budget = 1200;
  rw.appendChild(ring(Math.min(1, spent / budget)));
  const m = el('div', 'ringwrap__main');
  m.appendChild(el('div', 'ringwrap__l', 'Spent this month'));
  m.appendChild(el('div', 'ringwrap__v', fmt(spent)));
  m.appendChild(el('div', 'hint', 'of ' + fmt(budget) + ' budget'));
  rw.appendChild(m);
  top.appendChild(rw);
  body.appendChild(top);

  body.appendChild(section('Categories'));
  const l = el('div', 'list list--boxed');
  const rows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  for (const [id, amt] of rows) {
    const c = cat(id);
    const p = prev[id] || 0;
    const delta = p ? Math.round(((amt - p) / p) * 100) : null;
    const r = el('button', 'row');
    r.type = 'button';
    const m2 = el('div', 'row__main');
    m2.appendChild(el('div', 'row__t', c.emoji + '  ' + c.name));
    const bar = el('div', 'pbar');
    bar.style.marginTop = '6px';
    const f = el('div', 'pbar__f');
    f.style.width = Math.round((amt / total) * 100) + '%';
    f.style.background = c.colour;
    bar.appendChild(f);
    m2.appendChild(bar);
    r.appendChild(m2);
    const v = el('div', 'row__v', fmt(amt));
    if (delta !== null) {
      const d = el('span', 'hint');
      d.style.marginLeft = '6px';
      d.textContent = (delta > 0 ? '▲' : '▼') + Math.abs(delta) + '%';
      d.style.color = delta > 0 ? '#d92d20' : '#12a150';
      v.appendChild(d);
    }
    r.appendChild(v);
    r.onclick = () => { location.hash = '#/trend/' + id; };
    l.appendChild(r);
  }
  if (!rows.length) l.appendChild(empty('Nothing spent yet', 'Your categories will appear here'));
  body.appendChild(l);

  body.appendChild(section('Daily'));
  const strip = el('div', 'card');
  const days = new Date().getDate();
  const perDay = new Array(days).fill(0);
  const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
  for (const t of state.tx) {
    if (t.amount >= 0 || t.ts < start.getTime()) continue;
    const d = new Date(t.ts).getDate();
    if (d >= 1 && d <= days) perDay[d - 1] += Math.abs(t.amount);
  }
  const maxD = Math.max(1, ...perDay);
  const bars = el('div');
  bars.style.cssText = 'display:flex;align-items:flex-end;gap:3px;height:72px';
  perDay.forEach(v => {
    const b = el('div');
    b.style.cssText = 'flex:1;border-radius:2px;height:' + Math.max(4, (v / maxD) * 72) + 'px;background:' + (v ? '#ff4f40' : '#ececf0');
    bars.appendChild(b);
  });
  strip.appendChild(bars);
  body.appendChild(strip);

  return screen('trends', {title: 'Trends', body});
}

export function trendCatScreen(id) {
  const c = cat(id);
  const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
  const txs = state.tx.filter(t => t.category === id && t.ts >= start.getTime())
    .sort((a, b) => b.ts - a.ts);
  const body = el('div');
  const total = txs.reduce((s, t) => s + Math.abs(t.amount), 0);
  const card = el('div', 'card');
  card.appendChild(el('div', 'ringwrap__l', 'This month'));
  card.appendChild(el('div', 'ringwrap__v', fmt(total)));
  card.appendChild(el('div', 'hint', txs.length + ' transactions'));
  body.appendChild(card);

  const l = el('div', 'list list--boxed');
  for (const t of txs) {
    l.appendChild(row({
      title: t.name, sub: new Date(t.ts).toLocaleDateString('en-GB'),
      value: fmt(t.amount), tile: tile(t.name),
      onClick: () => { location.hash = '#/tx/' + t.id; }
    }));
  }
  if (!txs.length) l.appendChild(empty('Nothing here', 'No spending in this category'));
  body.appendChild(l);

  return screen('trend-' + id, {title: c.emoji + ' ' + c.name, back: '#/trends', body});
}

/* ============ PAYMENTS ============ */

export function paymentsScreen() {
  const body = el('div');
  const grid = el('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px';
  for (const [label, ic, hash] of [
    ['Send', 'payments', '#/send'],
    ['Request', 'trends', '#/request'],
    ['Split bill', 'plus', '#/split'],
    ['Bank transfer', 'chev', '#/bank'],
    ['Scheduled', 'trends', '#/scheduled'],
    ['Payees', 'account', '#/payees']
  ]) {
    const b = el('button', 'card');
    b.type = 'button';
    b.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 8px;font-weight:700;font-size:12px';
    b.appendChild(icon(ic, 22));
    b.appendChild(el('span', '', label));
    b.onclick = () => { location.hash = hash; };
    grid.appendChild(b);
  }
  body.appendChild(grid);

  body.appendChild(section('Payees'));
  const l = el('div', 'list list--boxed');
  for (const p of state.payees) {
    l.appendChild(row({
      title: p.name, sub: p.sort + ' · ' + p.acct, tile: tile(p.name),
      onClick: () => { location.hash = '#/payee/' + p.id; }
    }));
  }
  if (!state.payees.length) l.appendChild(empty('No payees', 'Add someone to send money'));
  body.appendChild(l);

  return screen('payments', {title: 'Payments', body});
}

export function payeesScreen() {
  const body = el('div');
  const l = el('div', 'list list--boxed');
  for (const p of state.payees) {
    l.appendChild(row({title: p.name, sub: p.sort + ' · ' + p.acct, onClick: () => { location.hash = '#/payee/' + p.id; }}));
  }
  if (!state.payees.length) l.appendChild(empty('No payees yet'));
  body.appendChild(l);
  return screen('payees', {title: 'Payees', back: '#/payments', body});
}

export function payeeScreen(id) {
  const p = state.payees.find(x => x.id === id);
  if (!p) return screen('payee', {title: 'Payee', back: '#/payments', body: empty('Not found')});
  const body = el('div');
  const c = el('div', 'card');
  c.style.textAlign = 'center';
  const t = tile(p.name, 56);
  t.style.margin = '0 auto 12px';
  c.appendChild(t);
  c.appendChild(el('div', 'row__t', p.name));
  c.appendChild(el('div', 'hint', p.sort + ' · ' + p.acct));
  body.appendChild(c);
  const send = el('button', 'btn btn--primary btn--block', 'Send money');
  send.onclick = () => { location.hash = '#/send/' + p.id; };
  body.appendChild(send);
  return screen('payee-' + id, {title: p.name, back: '#/payments', body});
}

export function sendScreen(payeeId) {
  const p = state.payees.find(x => x.id === payeeId);
  const body = el('div');
  const amount = input({type: 'number', step: '0.01', placeholder: '0.00'});
  const ref = input({placeholder: 'Reference'});
  body.appendChild(field({label: 'Amount', input: amount}));
  body.appendChild(field({label: 'Reference', input: ref}));
  if (p) body.appendChild(el('p', 'hint', 'To ' + p.name));
  const go = el('button', 'btn btn--primary btn--block', 'Send');
  go.onclick = () => {
    const a = round2(Number(amount.value));
    if (!a || a <= 0) return toast('Enter an amount');
    if (!takeFunds(a)) return toast('Not enough money');
    addTx({name: p ? p.name : 'Bank transfer', amount: -a, category: 'transfers', note: ref.value});
    toast('Sent ' + fmt(a));
    location.hash = '#/payments';
  };
  body.appendChild(go);
  return screen('send', {title: 'Send money', back: '#/payments', body});
}

export function requestScreen() {
  const body = el('div');
  const amount = input({type: 'number', step: '0.01', placeholder: '0.00'});
  const from = input({placeholder: 'Who from'});
  body.appendChild(field({label: 'Amount', input: amount}));
  body.appendChild(field({label: 'From', input: from}));
  const go = el('button', 'btn btn--primary btn--block', 'Request');
  go.onclick = () => {
    const a = round2(Number(amount.value));
    if (!a) return toast('Enter an amount');
    toast('Requested ' + fmt(a) + (from.value ? ' from ' + from.value : ''));
    location.hash = '#/payments';
  };
  body.appendChild(go);
  return screen('request', {title: 'Request money', back: '#/payments', body});
}

export function bankScreen() {
  const body = el('div');
  const name = input({placeholder: 'Account holder'});
  const sort = input({placeholder: '00-00-00'});
  const acct = input({placeholder: '12345678', type: 'number'});
  const amount = input({type: 'number', step: '0.01', placeholder: '0.00'});
  body.appendChild(field({label: 'Name', input: name}));
  body.appendChild(field({label: 'Sort code', input: sort}));
  body.appendChild(field({label: 'Account number', input: acct}));
  body.appendChild(field({label: 'Amount', input: amount}));
  const go = el('button', 'btn btn--primary btn--block', 'Send');
  go.onclick = () => {
    const a = round2(Number(amount.value));
    if (!a) return toast('Enter an amount');
    if (!takeFunds(a)) return toast('Not enough money');
    addTx({name: name.value || 'Bank transfer', amount: -a, category: 'transfers'});
    toast('Sent ' + fmt(a));
    location.hash = '#/payments';
  };
  body.appendChild(go);
  return screen('bank', {title: 'Bank transfer', back: '#/payments', body});
}

export function scheduledScreen() {
  const body = el('div');
  const l = el('div', 'list list--boxed');
  for (const s of state.scheduled) {
    l.appendChild(row({
      title: s.name,
      sub: s.freq === 'once' ? 'Once' : 'Day ' + s.day + ' monthly',
      value: fmt(s.amount), tile: tile(s.name),
      onClick: () => confirmSheet({
        title: s.name, text: 'Cancel this scheduled payment?', confirm: 'Cancel payment', danger: true,
        onConfirm: () => {
          state.scheduled = state.scheduled.filter(x => x.id !== s.id);
          save(); toast('Cancelled'); rerender();
        }
      })
    }));
  }
  if (!state.scheduled.length) l.appendChild(empty('Nothing scheduled'));
  body.appendChild(l);
  return screen('scheduled', {title: 'Scheduled', back: '#/payments', body});
}

/* ============ BORROWING ============ */

export function borrowingScreen() {
  const body = el('div');
  const f = state.flex;
  const avail = round2(Math.max(0, f.limit - f.used));

  const c = el('div', 'card');
  c.appendChild(el('div', 'ringwrap__l', 'Flex available'));
  c.appendChild(el('div', 'ringwrap__v', fmt(avail)));
  const bar = el('div', 'pbar');
  bar.style.marginTop = '10px';
  const fill = el('div', 'pbar__f');
  fill.style.width = Math.round((f.used / Math.max(1, f.limit)) * 100) + '%';
  bar.appendChild(fill);
  c.appendChild(bar);
  c.appendChild(el('div', 'hint', fmt(f.used) + ' of ' + fmt(f.limit) + ' in use'));
  body.appendChild(c);

  body.appendChild(section('Flex'));
  body.appendChild(list([
    row({title: 'Split a purchase', sub: 'Minimum ' + fmt(FLEX_MIN) + ' · 0% on 3 months', onClick: () => flexSheet()}),
    row({title: 'Manage limit', sub: 'Current limit ' + fmt(f.limit), onClick: () => flexLimitSheet()}),
    row({title: 'Flex plan', value: f.active ? 'Active' : 'Off', chev: false})
  ]));

  body.appendChild(section('Loans'));
  body.appendChild(list([
    row({title: 'Personal loan', sub: 'Borrow ' + fmt(1000) + ' – ' + fmt(25000), onClick: () => toast('Loans arrive in Phase D')}),
    row({title: 'Overdraft', sub: 'Up to ' + fmt(500) + ' · 39% EAR', onClick: () => toast('Overdraft settings')})
  ]));

  return screen('borrowing', {title: 'Borrowing', body});
}

export function flexSheet() {
  const body = el('div');
  const amount = input({type: 'number', step: '0.01', placeholder: '100.00'});
  const name = input({placeholder: 'What was it for?'});
  let months = 3;
  const summary = el('p', 'hint');
  summary.style.margin = '0';

  const preview = () => {
    const a = round2(Number(amount.value) || 0);
    if (a < FLEX_MIN) return 'Enter at least ' + fmt(FLEX_MIN);
    const apr = flexApr(a, months);
    const total = round2(a * (1 + apr * (months / 12)));
    return fmt(round2(total / months)) + ' × ' + months + ' = ' + fmt(total) + ' · ' + (apr === 0 ? '0% APR' : (apr * 100).toFixed(0) + '% APR');
  };

  body.appendChild(field({label: 'Amount', input: amount, hint: 'Minimum ' + fmt(FLEX_MIN)}));
  body.appendChild(field({label: 'Merchant', input: name}));
  body.appendChild(field({label: 'Term', input: seg(
    FLEX_MONTHS.map(m => ({label: m + ' months', value: m})), 3,
    v => { months = v; summary.textContent = preview(); }
  )}));
  summary.textContent = preview();
  amount.oninput = () => { summary.textContent = preview(); };
  body.appendChild(summary);

  const go = el('button', 'btn btn--primary btn--block', 'Create Flex plan');
  const sh = sheet({title: 'Flex a purchase', body, foot: go});
  go.onclick = () => {
    const a = round2(Number(amount.value) || 0);
    const r = flexPurchase(a, months, name.value || 'Flex purchase');
    if (!r.ok) return toast(r.reason === 'minimum' ? 'Minimum is ' + fmt(FLEX_MIN) : 'Pick a term');
    sh.close();
    toast('Flex plan created');
    rerender();
  };
}

export function flexLimitSheet() {
  const body = el('div');
  const i = input({type: 'number', value: state.flex.limit, min: 250, max: 3000});
  body.appendChild(field({label: 'New limit', input: i, hint: 'Between £250 and £3,000'}));
  const go = el('button', 'btn btn--primary btn--block', 'Save limit');
  const sh = sheet({title: 'Flex limit', body, foot: go});
  go.onclick = () => {
    state.flex.limit = Math.min(3000, Math.max(250, Number(i.value) || 250));
    save(); sh.close(); toast('Limit updated'); rerender();
  };
}

/* ============ ACCOUNT ============ */

export function accountScreen() {
  const body = el('div');
  const c = el('div', 'card');
  c.style.cssText = 'display:flex;align-items:center;gap:12px';
  c.appendChild(avatar(52));
  const m = el('div');
  m.appendChild(el('div', 'row__t', state.user.name));
  m.appendChild(el('div', 'row__s', state.user.email));
  c.appendChild(m);
  body.appendChild(c);

  body.appendChild(section('Money'));
  body.appendChild(list([
    row({title: 'Pots', sub: state.pots.length + ' pots · ' + fmt(totalPots()) + ' saved', onClick: () => { location.hash = '#/pots'; }}),
    row({title: 'Investments', sub: 'iShares portfolio', onClick: () => { location.hash = '#/invest'; }}),
    row({title: 'Pension', sub: state.pension.provider, onClick: () => { location.hash = '#/pension'; }}),
    row({title: 'Stocks & Shares ISA', sub: 'Allowance used ' + fmt(state.isa.used), onClick: () => { location.hash = '#/isa'; }}),
    row({title: 'Monzo Plus', sub: 'Manage your plan', onClick: () => { location.hash = '#/plus'; }})
  ]));

  body.appendChild(section('Account'));
  body.appendChild(list([
    row({title: 'Personal details', onClick: () => { location.hash = '#/profile'; }}),
    row({title: 'Cards', sub: state.cards.length + ' active', onClick: () => { location.hash = '#/cards'; }}),
    row({title: 'Security', onClick: () => { location.hash = '#/security'; }}),
    row({title: 'Notifications', onClick: () => { location.hash = '#/notifications'; }}),
    row({title: 'Statements', onClick: () => { location.hash = '#/statements'; }}),
    row({title: 'Appearance', onClick: () => { location.hash = '#/appearance'; }}),
    row({title: 'About', onClick: () => { location.hash = '#/about'; }})
  ]));

  return screen('account', {title: 'Account', body});
}

export function potsScreen() {
  const body = el('div');
  const c = el('div', 'card');
  c.appendChild(el('div', 'ringwrap__l', 'Total saved'));
  c.appendChild(el('div', 'ringwrap__v', fmt(totalPots())));
  c.appendChild(el('div', 'hint', (SAVINGS_INTEREST * 100).toFixed(1) + '% AER on savings'));
  body.appendChild(c);

  const l = el('div', 'list list--boxed');
  for (const p of state.pots) {
    const t = el('span', 'pcard__ico', p.emoji || '🏦');
    t.style.background = (p.colour || '#eeeeee') + '22';
    l.appendChild(row({
      title: p.name, sub: fmt(p.saved || 0) + ' of ' + fmt(p.target),
      value: p.locked ? '🔒' : '', tile: t,
      onClick: () => { location.hash = '#/pot/' + p.id; }
    }));
  }
  if (!state.pots.length) {
    l.appendChild(empty('No pots yet', 'Pots help you put money aside', {
      label: 'Create a pot', onClick: () => import('./screens-b.js?v=33').then(m => m.newPotSheet())
    }));
  }
  body.appendChild(l);
  return screen('pots', {title: 'Pots', back: '#/account', body});
}

export function potScreen(id) {
  const p = state.pots.find(x => x.id === id);
  if (!p) return screen('pot', {title: 'Pot', back: '#/pots', body: empty('Pot not found')});
  const body = el('div');
  const c = el('div', 'card');
  c.style.textAlign = 'center';
  const e = el('div', '', p.emoji || '🏦');
  e.style.fontSize = '40px';
  c.appendChild(e);
  c.appendChild(el('div', 'ringwrap__v', fmt(p.saved || 0)));
  c.appendChild(el('div', 'hint', 'of ' + fmt(p.target) + ' target'));
  const bar = el('div', 'pbar');
  bar.style.marginTop = '12px';
  const f = el('div', 'pbar__f');
  f.style.width = Math.min(100, ((p.saved || 0) / Math.max(1, p.target)) * 100) + '%';
  bar.appendChild(f);
  c.appendChild(bar);
  body.appendChild(c);

  const amt = input({type: 'number', step: '0.01', placeholder: '0.00'});
  body.appendChild(field({label: 'Amount', input: amt}));

  const add = el('button', 'btn btn--primary btn--block', 'Add money');
  add.onclick = () => {
    const a = round2(Number(amt.value) || 0);
    if (!a) return toast('Enter an amount');
    if (!potMove(p.id, a, 'in')) return toast('Not enough money');
    toast('Added ' + fmt(a));
    rerender();
  };
  body.appendChild(add);

  const wd = el('button', 'btn btn--ghost btn--block', 'Withdraw');
  wd.onclick = () => {
    const a = round2(Number(amt.value) || 0);
    if (!a) return toast('Enter an amount');
    if (!potMove(p.id, a, 'out')) return toast('Not enough in the pot');
    toast('Withdrew ' + fmt(a));
    rerender();
  };
  body.appendChild(wd);

  body.appendChild(list([
    row({title: 'Edit pot', onClick: () => import('./screens-b.js?v=33').then(m => m.editPotSheet(p.id))}),
    row({title: 'Round-ups', value: p.roundUp ? 'On' : 'Off', chev: false}),
    row({title: 'Delete pot', onClick: () => confirmSheet({
      title: 'Delete ' + p.name, text: 'Money will go back to your balance.', danger: true, confirm: 'Delete',
      onConfirm: () => {
        state.balance = round2(state.balance + (p.saved || 0));
        state.pots = state.pots.filter(x => x.id !== p.id);
        save(); toast('Pot deleted'); location.hash = '#/pots';
      }
    })})
  ]));

  return screen('pot-' + id, {title: p.name, back: '#/pots', body});
}
