import {
  state, fmt, fmtShort, round2, addTx, save, uid, investBuy, investSell,
  investDeposit, portfolioValue, fundValue, platformFeeMonthly, planInfo, PLANS,
  pensionProjection, reset, dateStr, timeStr, acc, catById, categories,
  budgetFor, setBudget, totalBudget, ledgerNetInvested, ledgerIncome,
  riskInfo, setChosenFund, payeesSorted, createSplit, splitOutstanding,
  splitsOutstandingTotal, markSplitPaid, removeSplit, planHasBenefit,
  snapshot, restore, statementMonths, statementRows, statementTotals,
  virtualCardCreate, virtualCardRemove, virtualCardFreeze, virtualCardSingleUse,
  virtualCardSpend, canUseVirtualCards, notify, requestNotify, notifyPermission,
  notifySupported
} from './core.js?v=42';
import { FUNDS, RISK_FUNDS, CONSTITUENTS, POT_ICONS, POT_COLOURS, BENEFITS, NOTIFY_TYPES } from './data.js?v=42';
import {
  el, screen, row, list, section, tile, empty, toast, sheet, confirmSheet,
  field, input, seg, switchEl, pill, catIcon, cardArt, avatar, spendBar, haptic
} from './ui.js?v=42';
import { buildStatement, download } from './statement.js?v=42';

const cat = id => catById(id);
const rerender = () => document.dispatchEvent(new CustomEvent('render'));

function potIcon(p, size = 34) {
  const wrap = el('span', 'pcard__ico');
  wrap.style.width = size + 'px';
  wrap.style.height = size + 'px';
  wrap.style.background = (p.colour || '#eeeeee') + '22';
  wrap.appendChild(catIcon(p.icon || 'box', Math.round(size * 0.6), p.colour || '#6b6b76'));
  return wrap;
}

export function cardSheet() {
  const card = acc().card;
  const body = el('div');
  body.appendChild(cardArt(card));
  const freeze = el('button', 'btn btn--block btn--ghost', card.frozen ? 'Unfreeze card' : 'Freeze card');
  body.appendChild(list([
    row({title: 'View card number', onClick: () => toast('•••• •••• •••• ' + card.last4)}),
    row({title: 'Card PIN', onClick: () => toast('PIN 2580')}),
    row({title: 'Add to Apple Pay', onClick: () => toast('Added to Apple Pay')}),
    row({title: 'Virtual cards', onClick: () => { location.hash = '#/cards'; }})
  ]));
  freeze.onclick = () => {
    card.frozen = !card.frozen;
    save();
    freeze.textContent = card.frozen ? 'Unfreeze card' : 'Freeze card';
    toast(card.frozen ? 'Card frozen' : 'Card unfrozen');
    rerender();
  };
  sheet({title: 'Your card', body, foot: freeze});
}

export function addTxSheet() {
  const body = el('div');
  const name = input({placeholder: 'Merchant or description'});
  const amount = input({type: 'number', step: '0.01', placeholder: '0.00'});
  let category = 'general';
  const cats = el('div');
  cats.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
  for (const c of categories()) {
    const b = el('button', 'pill');
    b.type = 'button';
    b.appendChild(catIcon(c.icon, 18, c.colour));
    b.appendChild(el('span', '', c.name));
    b.onclick = () => {
      category = c.id;
      cats.querySelectorAll('.pill').forEach(x => x.className = 'pill');
      b.className = 'pill pill--coral';
    };
    cats.appendChild(b);
  }
  body.appendChild(field({label: 'Name', input: name}));
  body.appendChild(field({label: 'Amount', input: amount, hint: 'Use a minus sign for spending'}));
  body.appendChild(field({label: 'Category', input: cats}));
  const go = el('button', 'btn btn--primary btn--block', 'Add transaction');
  const s = sheet({title: 'Add transaction · ' + acc().name, body, foot: go});
  go.onclick = () => {
    const a = round2(Number(amount.value) || 0);
    if (!a) return toast('Enter an amount');
    addTx({name: name.value || 'Transaction', amount: a, category});
    s.close();
    toast('Added ' + fmt(a));
    rerender();
  };
}

export function targetSheet(catId) {
  const c = cat(catId);
  const current = budgetFor(catId);
  const body = el('div');
  const i = input({type: 'number', step: '1', value: current || '', placeholder: '0.00'});
  const hint = el('p', 'hint');
  body.appendChild(field({label: c.name + ' target', input: i}));
  body.appendChild(hint);

  const update = () => {
    const v = round2(Number(i.value) || 0);
    hint.textContent = v ? 'Monthly target ' + fmt(v) : 'No target set';
  };
  update();
  i.oninput = update;

  const saveBtn = el('button', 'btn btn--primary btn--block', 'Save target');
  const s = sheet({title: 'Monthly target', body, foot: saveBtn});
  saveBtn.onclick = () => {
    setBudget(catId, round2(Number(i.value) || 0));
    s.close();
    toast(budgetFor(catId) ? 'Target set' : 'Target removed');
    rerender();
  };

  if (current) {
    const rm = el('button', 'btn btn--ghost btn--block', 'Remove target');
    rm.onclick = () => {
      setBudget(catId, 0);
      s.close();
      toast('Target removed');
      rerender();
    };
    body.appendChild(rm);
  }
}

export function budgetSheet() {
  const body = el('div');
  body.appendChild(el('p', 'hint',
    'Set a monthly target per category. Your totals add up to ' + fmt(totalBudget()) + '.'));

  const l = el('div', 'list list--boxed');
  const s = sheet({title: 'Budgets', body});
  for (const c of categories()) {
    if (c.id === 'transfers' || c.id === 'income') continue;
    const cur = budgetFor(c.id);
    const r = el('div', 'row');
    const m = el('div', 'row__main');
    m.appendChild(el('div', 'row__t', c.name));
    r.appendChild(m);
    const b = el('button', 'tgt' + (cur ? ' tgt--on' : ''));
    b.type = 'button';
    b.textContent = cur ? fmt(cur, {dp: 0}) : 'Set';
    b.onclick = () => { s.close(); targetSheet(c.id); };
    r.appendChild(b);
    l.appendChild(r);
  }
  body.appendChild(l);
}

export function splitScreen(txId) {
  const t = state.tx.find(x => x.id === txId);
  if (!t) return screen('split', {title: 'Split bill', back: '#/payments', body: empty('Transaction not found')});

  const total = Math.abs(round2(t.amount));
  const body = el('div');
  const chosen = new Set();

  const head = el('div', 'card');
  head.appendChild(tile(t.name, 44));
  head.appendChild(el('div', 'row__t', t.name));
  head.appendChild(el('div', 'lts__v', fmt(total)));
  head.appendChild(el('div', 'hint', new Date(t.ts).toLocaleDateString('en-GB')));
  body.appendChild(head);

  body.appendChild(section('Split between'));
  const l = el('div', 'list list--boxed');
  for (const p of payeesSorted()) {
    const r = el('button', 'person');
    r.type = 'button';
    r.setAttribute('aria-pressed', 'false');
    r.appendChild(tile(p.name, 34));
    const m = el('div', 'row__main');
    m.appendChild(el('div', 'row__t', p.name));
    r.appendChild(m);
    r.appendChild(el('span', 'person__tick', '✓'));
    r.onclick = () => {
      const on = r.getAttribute('aria-pressed') === 'true';
      r.setAttribute('aria-pressed', String(!on));
      if (on) chosen.delete(p.id); else chosen.add(p.id);
      paint();
    };
    l.appendChild(r);
  }
  if (!state.payees.length) l.appendChild(empty('No payees', 'Add someone first'));
  body.appendChild(l);

  const preview = el('div', 'card card--flat');
  const paint = () => {
    preview.innerHTML = '';
    const n = chosen.size;
    if (!n) {
      preview.appendChild(el('div', 'hint', 'Pick at least one person'));
      return;
    }
    preview.appendChild(el('div', 'row__t', fmt(round2(total / n)) + ' each'));
    preview.appendChild(el('div', 'hint', 'Split evenly between ' + n + (n === 1 ? ' person' : ' people')));
  };
  paint();
  body.appendChild(preview);

  const go = el('button', 'btn btn--primary btn--block', 'Request shares');
  go.onclick = () => {
    if (!chosen.size) return toast('Pick at least one person');
    const people = [...chosen].map(id => state.payees.find(p => p.id === id)).filter(Boolean);
    const s = createSplit(t.id, people);
    if (!s) return toast('Could not split this');
    toast('Requested from ' + people.length);
    location.hash = '#/splits';
  };
  body.appendChild(go);

  return screen('split-' + txId, {title: 'Split bill', back: '#/tx/' + txId, body});
}

export function splitsScreen() {
  const body = el('div');
  const total = splitsOutstandingTotal();

  if (total > 0) {
    const c = el('div', 'card');
    c.appendChild(el('div', 'lts__l', 'Owed to you'));
    c.appendChild(el('div', 'lts__v', fmt(total)));
    body.appendChild(c);
  }

  if (!state.splits.length) {
    body.appendChild(empty('No splits yet', 'Open a transaction and choose Split bill'));
  } else {
    const l = el('div', 'list list--boxed');
    for (const s of state.splits) {
      l.appendChild(row({
        title: s.name,
        sub: s.people.length + ' people · ' + fmt(splitOutstanding(s)) + ' outstanding',
        value: fmt(s.total),
        onClick: () => { location.hash = '#/split-detail/' + s.id; }
      }));
    }
    body.appendChild(l);
  }

  return screen('splits', {title: 'Splits', back: '#/payments', body});
}

export function splitDetailScreen(id) {
  const s = state.splits.find(x => x.id === id);
  if (!s) return screen('split-detail', {title: 'Split', back: '#/splits', body: empty('Not found')});
  const body = el('div');
  const c = el('div', 'card');
  c.appendChild(el('div', 'row__t', s.name));
  c.appendChild(el('div', 'lts__v', fmt(s.total)));
  c.appendChild(el('div', 'hint', dateStr(s.ts) + ' · ' + fmt(splitOutstanding(s)) + ' outstanding'));
  body.appendChild(c);

  const l = el('div', 'list list--boxed');
  s.people.forEach((p, i) => {
    l.appendChild(row({
      title: p.name, sub: p.paid ? 'Paid' : 'Waiting', value: fmt(p.amount), chev: false,
      onClick: () => { markSplitPaid(s.id, i); rerender(); }
    }));
  });
  body.appendChild(l);

  const rm = el('button', 'btn btn--ghost btn--block', 'Delete split');
  rm.onclick = () => {
    const snap = snapshot();
    removeSplit(s.id);
    toast('Split deleted', {label: 'Undo', onClick: () => { restore(snap); rerender(); }});
    location.hash = '#/splits';
  };
  body.appendChild(rm);

  return screen('split-detail-' + id, {title: 'Split', back: '#/splits', body});
}

export function receiptScreen(txId) {
  const t = state.tx.find(x => x.id === txId);
  if (!t) return screen('receipt', {title: 'Receipt', back: '#/payments', body: empty('Not found')});

  const body = el('div');
  const r = el('div', 'receipt');
  r.appendChild(el('div', 'receipt__tick', '✓'));
  r.appendChild(el('div', 'receipt__amt', fmt(t.amount)));
  r.appendChild(el('div', 'row__t', 'Sent to ' + t.name));
  r.appendChild(el('div', 'hint', 'Money left your account straight away'));

  const meta = el('div', 'receipt__meta');
  for (const [k, v] of [
    ['Date', dateStr(t.ts)],
    ['Time', timeStr(t.ts)],
    ['From', acc().name + ' · ' + acc().card.last4],
    ['Reference', t.ref || t.note || '—'],
    ['Status', 'Sent']
  ]) {
    const line = el('div', 'receipt__line');
    line.appendChild(el('span', '', k));
    line.appendChild(el('span', '', v));
    meta.appendChild(line);
  }
  r.appendChild(meta);
  body.appendChild(r);

  const share = el('button', 'btn btn--ghost btn--block', 'Share receipt');
  share.onclick = () => toast('Receipt shared');
  body.appendChild(share);

  const done = el('button', 'btn btn--primary btn--block', 'Done');
  done.onclick = () => { location.hash = '#/payments'; };
  body.appendChild(done);

  return screen('receipt-' + txId, {title: 'Receipt', back: '#/payments', body});
}

export function paymentsEditorSheet() {
  const body = el('div');
  body.appendChild(el('p', 'hint', 'Reorder with the arrows. Hide anything you do not use.'));
  const LABELS = {
    send: 'Send', request: 'Request', split: 'Split bill',
    bank: 'Bank transfer', scheduled: 'Scheduled', payees: 'Payees'
  };
  const S = state.settings;

  const draw = () => {
    body.querySelectorAll('.editorrow').forEach(n => n.remove());
    for (const key of S.payOrder) {
      const r = el('div', 'editorrow');
      r.appendChild(el('span', 'editorrow__grip', '≡'));
      r.appendChild(el('div', 'row__main', LABELS[key] || key));

      const up = el('button', 'hdr__btn');
      up.type = 'button';
      up.textContent = '↑';
      up.onclick = () => {
        const i = S.payOrder.indexOf(key);
        if (i > 0) { S.payOrder.splice(i, 1); S.payOrder.splice(i - 1, 0, key); save(); draw(); rerender(); }
      };
      const dn = el('button', 'hdr__btn');
      dn.type = 'button';
      dn.textContent = '↓';
      dn.onclick = () => {
        const i = S.payOrder.indexOf(key);
        if (i > -1 && i < S.payOrder.length - 1) { S.payOrder.splice(i, 1); S.payOrder.splice(i + 1, 0, key); save(); draw(); rerender(); }
      };
      r.appendChild(up);
      r.appendChild(dn);
      r.appendChild(switchEl(!S.payHidden.includes(key), v => {
        if (v) S.payHidden = S.payHidden.filter(x => x !== key);
        else if (!S.payHidden.includes(key)) S.payHidden.push(key);
        save(); rerender();
      }));
      body.appendChild(r);
    }
  };

  draw();
  sheet({title: 'Edit actions', body});
}

const LED_LABEL = {
  buy: 'Monthly investment', gift: 'Opening gift', sell: 'Sale', div: 'Dividend', deposit: 'Cash added'
};

export function investScreen() {
  const value = portfolioValue();
  const chosen = riskInfo(state.invest.chosen);
  const body = el('div');

  const c = el('div', 'card');
  c.appendChild(el('div', 'lts__l', 'Portfolio value'));
  c.appendChild(el('div', 'lts__v', fmt(value)));
  c.appendChild(el('div', 'hint', 'Platform fee ' + fmt(platformFeeMonthly()) + '/month'));
  body.appendChild(c);

  const cur = el('div', 'card card--flat');
  cur.appendChild(pill(chosen.name.toUpperCase(), 'coral'));
  cur.appendChild(el('div', 'row__t', 'Your fund'));
  cur.appendChild(el('div', 'hint', chosen.blurb));
  const rm = el('div', 'riskmeter');
  for (let i = 1; i <= 7; i++) {
    const bar = el('i');
    if (i <= chosen.risk) bar.className = 'on';
    rm.appendChild(bar);
  }
  cur.appendChild(rm);
  const ch = el('button', 'btn btn--ghost btn--sm btn--block', 'Change fund');
  ch.style.marginTop = '12px';
  ch.onclick = () => changeFundSheet();
  cur.appendChild(ch);
  body.appendChild(cur);

  const cash = el('div', 'card card--flat');
  cash.appendChild(el('div', 'row__t', 'Cash to invest'));
  cash.appendChild(el('div', 'row__v', fmt(state.invest.cash)));
  const dep = el('button', 'btn btn--primary btn--sm btn--block', 'Add money');
  dep.style.marginTop = '10px';
  dep.onclick = () => depositSheet();
  cash.appendChild(dep);
  body.appendChild(cash);

  body.appendChild(list([
    row({title: 'Activity', sub: 'Full ledger since October 1992', onClick: () => { location.hash = '#/ledger'; }})
  ]));

  body.appendChild(section('Your funds'));
  const l = el('div', 'list list--boxed');
  for (const f of RISK_FUNDS) {
    l.appendChild(row({
      title: f.name, sub: 'Risk ' + f.risk + '/7 · ' + f.equity + '% shares',
      value: fmt(fundValue(f.id)),
      onClick: () => { location.hash = '#/fund/' + f.id; }
    }));
  }
  body.appendChild(l);

  const proj = el('div', 'card');
  proj.appendChild(el('div', 'row__t', 'Projected in 10 years'));
  proj.appendChild(el('div', 'row__v', fmt(value * Math.pow(1.05, 10))));
  proj.appendChild(el('div', 'hint', 'At 5% a year after fees. Not a guarantee.'));
  body.appendChild(proj);

  return screen('invest', {title: 'Investments', back: '#/account', body});
}

export function changeFundSheet() {
  const body = el('div');
  body.appendChild(el('p', 'hint', 'Your existing money stays where it is until you move it.'));
  const l = el('div', 'list list--boxed');
  const s = sheet({title: 'Choose a fund', body});
  for (const f of RISK_FUNDS) {
    l.appendChild(row({
      title: f.name, sub: 'Risk ' + f.risk + '/7',
      value: state.invest.chosen === f.id ? '✓' : '', chev: false,
      onClick: () => { setChosenFund(f.id); s.close(); toast('Now investing in ' + f.name); rerender(); }
    }));
  }
  body.appendChild(l);
}

export function depositSheet() {
  const body = el('div');
  const a = input({type: 'number', step: '0.01', placeholder: '100.00'});
  body.appendChild(field({label: 'Amount', input: a}));
  const go = el('button', 'btn btn--primary btn--block', 'Add money');
  const s = sheet({title: 'Add money', body, foot: go});
  go.onclick = () => {
    const v = round2(Number(a.value) || 0);
    if (!v) return toast('Enter an amount');
    if (!investDeposit(v)) return toast('Not enough money');
    s.close(); toast('Added ' + fmt(v)); rerender();
  };
}

export function fundScreen(id) {
  const f = RISK_FUNDS.find(x => x.id === id);
  if (!f) return screen('fund', {title: 'Fund', back: '#/invest', body: empty('Not found')});
  const held = fundValue(f.id);
  const body = el('div');

  const c = el('div', 'card');
  c.appendChild(pill(f.name.toUpperCase(), 'coral'));
  c.appendChild(el('div', 'hint', f.blurb));
  const rm = el('div', 'riskmeter');
  for (let i = 1; i <= 7; i++) {
    const bar = el('i');
    if (i <= f.risk) bar.className = 'on';
    rm.appendChild(bar);
  }
  c.appendChild(rm);
  body.appendChild(c);

  const mix = el('div', 'card card--flat');
  mix.appendChild(el('div', 'row__t', 'How it is split'));
  mix.appendChild(el('div', 'hint', f.equity + '% shares · ' + f.bond + '% bonds · ' + f.cash + '% cash'));
  body.appendChild(mix);

  const heldCard = el('div', 'card card--flat');
  heldCard.appendChild(el('div', 'row__t', 'Your holding'));
  heldCard.appendChild(el('div', 'row__v', fmt(held)));
  body.appendChild(heldCard);

  body.appendChild(section('What it holds'));
  const l = el('div', 'list list--boxed');
  for (const [fid, weight] of CONSTITUENTS[f.id] || []) {
    const u = FUNDS.find(x => x.id === fid);
    if (!u) continue;
    l.appendChild(row({title: u.name, sub: weight + '% of the fund', chev: false}));
  }
  body.appendChild(l);

  const amt = input({type: 'number', step: '0.01', placeholder: '0.00'});
  body.appendChild(field({label: 'Amount', input: amt}));

  const buy = el('button', 'btn btn--primary btn--block', 'Buy');
  buy.onclick = () => {
    const v = round2(Number(amt.value) || 0);
    if (!v) return toast('Enter an amount');
    if (!investBuy(f.id, v)) return toast('Add cash first');
    toast('Bought ' + fmt(v)); rerender();
  };
  body.appendChild(buy);

  if (held > 0) {
    const sell = el('button', 'btn btn--ghost btn--block', 'Sell');
    sell.onclick = () => {
      const v = round2(Number(amt.value) || 0);
      if (!v) return toast('Enter an amount');
      if (!investSell(f.id, v)) return toast('Nothing to sell');
      toast('Sold ' + fmt(v)); rerender();
    };
    body.appendChild(sell);
  }

  return screen('fund-' + id, {title: f.name, back: '#/invest', body});
}

export function ledgerScreen() {
  const body = el('div');
  const value = portfolioValue();
  const net = ledgerNetInvested();
  const income = ledgerIncome();
  const growth = round2(value - net);
  const pct = net ? Math.round((growth / net) * 100) : 0;

  const c = el('div', 'card');
  c.appendChild(el('div', 'lts__l', 'Current value'));
  c.appendChild(el('div', 'lts__v', fmt(value)));
  c.appendChild(el('div', 'hint', 'Invested ' + fmt(net) + ' · dividends ' + fmt(income)));
  c.appendChild(el('div', 'hint budgetleft', 'Growth ' + fmt(growth) + ' (' + pct + '%)'));
  body.appendChild(c);

  const years = el('div', 'years');
  const l = el('div', 'list list--boxed');
  let year = new Date().getFullYear();

  const draw = () => {
    l.innerHTML = '';
    const rows = state.invest.ledger
      .filter(e => new Date(e.ts).getFullYear() === year)
      .sort((a, b) => b.ts - a.ts);
    if (!rows.length) l.appendChild(empty('Nothing in ' + year));
    for (const e of rows) {
      const f = riskInfo(e.fund);
      const r = el('div', 'led');
      const d = new Date(e.ts);
      r.appendChild(el('div', 'led__d', d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short'})));
      const m = el('div', 'led__main');
      const label = e.type === 'buy' && e.amount >= 1000 ? 'Lump sum' : (LED_LABEL[e.type] || e.type);
      m.appendChild(el('div', 'led__t', label));
      m.appendChild(el('div', 'led__s', f.name + ' fund'));
      r.appendChild(m);
      r.appendChild(el('div', 'led__v ' + (e.amount > 0 ? 'led__v--in' : 'led__v--out'),
        (e.amount > 0 ? '+' : '') + fmt(e.amount)));
      l.appendChild(r);
    }
  };

  const nowYear = new Date().getFullYear();
  for (let y = nowYear; y >= 1992; y--) {
    const b = el('button', 'year');
    b.type = 'button';
    b.textContent = String(y);
    b.setAttribute('aria-pressed', String(y === year));
    b.onclick = () => {
      year = y;
      years.querySelectorAll('.year').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      draw();
    };
    years.appendChild(b);
  }

  body.appendChild(years);
  body.appendChild(l);
  draw();

  return screen('ledger', {title: 'Investment activity', back: '#/invest', body});
}

export function txScreen(id) {
  const t = state.tx.find(x => x.id === id);
  if (!t) return screen('tx', {title: 'Transaction', back: '#/home', body: empty('Not found')});
  const body = el('div');
  const c = el('div', 'card');
  c.style.textAlign = 'center';
  const tl = tile(t.name, 60);
  tl.style.margin = '0 auto 12px';
  c.appendChild(tl);
  c.appendChild(el('div', 'lts__v', (t.amount > 0 ? '+' : '') + fmt(t.amount)));
  c.appendChild(el('div', 'row__t', t.name));
  c.appendChild(el('div', 'hint', dateStr(t.ts) + ' · ' + timeStr(t.ts) + ' · ' + (t.acct === 'joint' ? 'Joint' : 'Personal')));
  body.appendChild(c);

  body.appendChild(list([
    row({title: 'Category', value: cat(t.category).name, onClick: () => categorySheet(t.id)}),
    row({title: 'Note', value: t.note || 'Add', onClick: () => noteSheet(t.id)}),
    row({title: 'Receipt', value: t.receipt ? 'Attached' : 'Add', onClick: () => receiptSheet(t.id)}),
    row({title: 'Split bill', onClick: () => { location.hash = '#/split/' + t.id; }}),
    row({title: 'Repeat', onClick: () => toast('Repeat payment set up')})
  ]));

  return screen('tx-' + id, {title: 'Transaction', back: '#/home', body});
}

export function categorySheet(id) {
  const t = state.tx.find(x => x.id === id);
  if (!t) return;
  const body = el('div');
  const l = el('div', 'list list--boxed');
  body.appendChild(l);
  const s = sheet({title: 'Category', body});
  for (const c of categories()) {
    const r = row({
      title: c.name, chev: false,
      value: t.category === c.id ? '✓' : '',
      onClick: () => {
        t.category = c.id;
        save(); s.close(); toast('Category updated'); rerender();
      }
    });
    r.insertBefore(catIcon(c.icon, 26, c.colour), r.firstChild);
    l.appendChild(r);
  }
}

export function noteSheet(id) {
  const t = state.tx.find(x => x.id === id);
  if (!t) return;
  const body = el('div');
  const i = input({value: t.note || '', placeholder: 'Add a note'});
  body.appendChild(field({label: 'Note', input: i}));
  const go = el('button', 'btn btn--primary btn--block', 'Save note');
  const s = sheet({title: 'Note', body, foot: go});
  go.onclick = () => {
    t.note = i.value.trim();
    save(); s.close(); toast('Note saved'); rerender();
  };
}

export function receiptSheet(id) {
  const t = state.tx.find(x => x.id === id);
  if (!t) return;
  const body = el('div');
  const i = input({placeholder: 'Receipt reference'});
  body.appendChild(field({label: 'Receipt', input: i, hint: 'Keep a reference with this transaction'}));
  const go = el('button', 'btn btn--primary btn--block', 'Attach');
  const s = sheet({title: 'Receipt', body, foot: go});
  go.onclick = () => {
    t.receipt = i.value.trim() || 'Attached';
    save(); s.close(); toast('Receipt attached'); rerender();
  };
}

export function newPotSheet() {
  const body = el('div');
  const name = input({placeholder: 'Pot name'});
  const target = input({type: 'number', step: '1', placeholder: '500'});
  let icon = POT_ICONS[0], colour = POT_COLOURS[0];

  const icons = el('div');
  icons.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  POT_ICONS.forEach(ic => {
    const b = el('button');
    b.type = 'button';
    b.style.cssText = 'border:0;background:transparent;padding:0;border-radius:50%';
    b.setAttribute('aria-label', ic);
    b.setAttribute('aria-pressed', String(ic === icon));
    b.appendChild(catIcon(ic, 36, ic === icon ? colour : '#6b6b76'));
    b.onclick = () => {
      icon = ic;
      icons.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      haptic();
    };
    icons.appendChild(b);
  });

  const colours = el('div');
  colours.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  POT_COLOURS.forEach(c => {
    const b = el('button');
    b.type = 'button';
    b.style.cssText = 'width:30px;height:30px;border-radius:50%;background:' + c;
    b.setAttribute('aria-pressed', String(c === colour));
    b.onclick = () => {
      colour = c;
      colours.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      haptic();
    };
    colours.appendChild(b);
  });

  body.appendChild(field({label: 'Name', input: name}));
  body.appendChild(field({label: 'Target', input: target}));
  body.appendChild(field({label: 'Icon', input: icons}));
  body.appendChild(field({label: 'Colour', input: colours}));

  const go = el('button', 'btn btn--primary btn--block', 'Create pot');
  const s = sheet({title: 'New pot', body, foot: go});
  go.onclick = () => {
    if (!name.value.trim()) return toast('Give your pot a name');
    state.pots.push({
      id: uid('pot'), name: name.value.trim(),
      target: Math.max(1, Number(target.value) || 100),
      saved: 0, emoji: '', icon, colour, locked: false, roundUp: false, created: Date.now()
    });
    save(); s.close(); toast('Pot created'); rerender();
  };
}

export function editPotSheet(id) {
  const p = state.pots.find(x => x.id === id);
  if (!p) return;
  const body = el('div');
  const name = input({value: p.name});
  const target = input({type: 'number', value: p.target});
  let icon = p.icon || 'box';
  let colour = p.colour || POT_COLOURS[0];

  const icons = el('div');
  icons.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  POT_ICONS.forEach(ic => {
    const b = el('button');
    b.type = 'button';
    b.style.cssText = 'border:0;background:transparent;padding:0;border-radius:50%';
    b.setAttribute('aria-label', ic);
    b.setAttribute('aria-pressed', String(ic === icon));
    b.appendChild(catIcon(ic, 36, ic === icon ? colour : '#6b6b76'));
    b.onclick = () => {
      icon = ic;
      icons.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      haptic();
    };
    icons.appendChild(b);
  });

  const colours = el('div');
  colours.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  POT_COLOURS.forEach(c => {
    const b = el('button');
    b.type = 'button';
    b.style.cssText = 'width:30px;height:30px;border-radius:50%;background:' + c;
    b.setAttribute('aria-pressed', String(c === colour));
    b.onclick = () => {
      colour = c;
      colours.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      haptic();
    };
    colours.appendChild(b);
  });

  body.appendChild(field({label: 'Name', input: name}));
  body.appendChild(field({label: 'Target', input: target}));
  body.appendChild(field({label: 'Icon', input: icons}));
  body.appendChild(field({label: 'Colour', input: colours}));

  const rw = el('div', 'row');
  const m = el('div', 'row__main');
  m.appendChild(el('div', 'row__t', 'Round-ups'));
  m.appendChild(el('div', 'row__s', 'Round spending to the nearest pound'));
  rw.appendChild(m);
  rw.appendChild(switchEl(p.roundUp, v => { p.roundUp = v; save(); }));
  body.appendChild(rw);

  const go = el('button', 'btn btn--primary btn--block', 'Save');
  const s = sheet({title: 'Edit pot', body, foot: go});
  go.onclick = () => {
    p.name = name.value.trim() || p.name;
    p.target = Math.max(1, Number(target.value) || p.target);
    p.icon = icon;
    p.colour = colour;
    save(); s.close(); toast('Pot updated'); rerender();
  };
}

export function cardsScreen() {
  const body = el('div');
  const physical = state.cards.filter(c => !c.virtual);
  const virtual = state.cards.filter(c => c.virtual);

  body.appendChild(section('Your card'));
  const pl = el('div', 'list list--boxed');
  for (const c of physical) {
    pl.appendChild(row({
      title: c.label + ' card', sub: '•••• ' + c.last4 + (c.frozen ? ' · frozen' : ''),
      onClick: () => cardSheet()
    }));
  }
  body.appendChild(pl);

  body.appendChild(section('Virtual cards'));
  if (virtual.length) {
    const vl = el('div', 'list list--boxed');
    for (const c of virtual) {
      const pot = state.pots.find(p => p.id === c.potId);
      vl.appendChild(row({
        title: c.label + ' · •••• ' + c.last4,
        sub: (pot ? pot.name : 'No pot') + (c.frozen ? ' · frozen' : '') + (c.singleUse ? ' · single use' : ''),
        value: fmt(c.spent || 0),
        onClick: () => { location.hash = '#/virtual-card/' + c.id; }
      }));
    }
    body.appendChild(vl);
  } else {
    body.appendChild(empty('No virtual cards', 'Create one against a pot to spend from it'));
  }

  const add = el('button', 'btn btn--primary btn--block', 'Create virtual card');
  add.onclick = () => {
    if (!canUseVirtualCards()) {
      const s = sheet({title: 'Virtual cards', body: el('div', '', '<p class="hint">Virtual cards come with Plus, Perks and Max. You are on ' + planInfo().name + '.</p>')});
      setTimeout(() => s.close(), 1200);
      location.hash = '#/plus';
      return;
    }
    if (!state.pots.length) return toast('Create a pot first');
    potPickerSheet();
  };
  body.appendChild(add);

  const note = el('p', 'hint');
  note.textContent = 'A virtual card can only spend what is in its pot. Freeze it or make it single use any time.';
  body.appendChild(note);

  return screen('cards', {title: 'Cards', back: '#/settings-personal', body});
}

function potPickerSheet() {
  const body = el('div');
  body.appendChild(el('p', 'hint', 'Pick the pot this card spends from.'));
  const l = el('div', 'list list--boxed');
  const s = sheet({title: 'New virtual card', body});
  for (const p of state.pots) {
    l.appendChild(row({
      title: p.name, sub: fmt(p.saved || 0) + ' in the pot', tile: potIcon(p, 30), chev: false,
      onClick: () => {
        const r = virtualCardCreate(p.id);
        s.close();
        if (!r.ok) return toast('Could not create the card');
        toast('Card created');
        location.hash = '#/virtual-card/' + r.card.id;
      }
    }));
  }
  body.appendChild(l);
}

export function virtualCardScreen(id) {
  const c = state.cards.find(x => x.id === id);
  if (!c || !c.virtual) return screen('virtual-card', {title: 'Virtual card', back: '#/cards', body: empty('Not found')});
  const pot = state.pots.find(p => p.id === c.potId);
  const body = el('div');

  body.appendChild(cardArt(c));

  const info = el('div', 'card');
  info.appendChild(el('div', 'lts__l', 'Spends from'));
  info.appendChild(el('div', 'lts__v', pot ? fmt(pot.saved || 0) : 'No pot'));
  info.appendChild(el('div', 'hint', pot ? pot.name + ' pot · •••• ' + c.last4 : 'This card has no pot'));
  body.appendChild(info);

  const amt = input({type: 'number', step: '0.01', placeholder: '0.00'});
  body.appendChild(field({label: 'Simulate a payment', input: amt, hint: 'Takes the money from the pot'}));
  const spend = el('button', 'btn btn--primary btn--block', 'Pay with this card');
  spend.onclick = () => {
    const v = round2(Number(amt.value) || 0);
    const r = virtualCardSpend(c.id, v);
    if (!r.ok) return toast(
      r.reason === 'frozen' ? 'This card is frozen'
      : r.reason === 'funds' ? 'Not enough in the pot'
      : 'Enter an amount'
    );
    toast(r.single ? 'Paid · card used up' : 'Paid ' + fmt(v));
    if (r.single) location.hash = '#/cards';
    else rerender();
  };
  body.appendChild(spend);

  const sw = el('div', 'row');
  const m = el('div', 'row__main');
  m.appendChild(el('div', 'row__t', 'Single use'));
  m.appendChild(el('div', 'row__s', 'Card is destroyed after one payment'));
  sw.appendChild(m);
  sw.appendChild(switchEl(c.singleUse, v => { virtualCardSingleUse(c.id); c.singleUse = v; rerender(); }));
  body.appendChild(list([sw]));

  body.appendChild(list([
    row({
      title: c.frozen ? 'Unfreeze card' : 'Freeze card',
      onClick: () => {
        const frozen = virtualCardFreeze(c.id);
        toast(frozen ? 'Card frozen' : 'Card unfrozen');
        rerender();
      }
    }),
    row({
      title: 'Change pot',
      value: pot ? pot.name : 'None',
      onClick: () => {
        const b2 = el('div');
        const l2 = el('div', 'list list--boxed');
        const s2 = sheet({title: 'Spend from', body: b2});
        for (const p of state.pots) {
          l2.appendChild(row({
            title: p.name, chev: false,
            onClick: () => { c.potId = p.id; c.label = p.name; save(); s2.close(); rerender(); }
          }));
        }
        b2.appendChild(l2);
      }
    }),
    row({
      title: 'Delete card',
      onClick: () => {
        const snap = snapshot();
        virtualCardRemove(c.id);
        toast('Card deleted', {label: 'Undo', onClick: () => { restore(snap); rerender(); }});
        location.hash = '#/cards';
      }
    })
  ]));

  body.appendChild(el('p', 'hint', 'Card number, expiry and CVV are hidden in this clone.'));

  return screen('virtual-card-' + id, {title: 'Virtual card', back: '#/cards', body});
}

export function pensionScreen() {
  const p = pensionProjection();
  const body = el('div');
  const c = el('div', 'card');
  c.appendChild(el('div', 'lts__l', 'Pension pot'));
  c.appendChild(el('div', 'lts__v', fmt(state.pension.balance)));
  c.appendChild(el('div', 'hint', state.pension.provider + ' · joined ' + dateStr(state.pension.joined)));
  body.appendChild(c);

  const proj = el('div', 'card card--flat');
  proj.appendChild(el('div', 'row__t', 'Projected at 68'));
  proj.appendChild(el('div', 'row__v', fmt(p.pot)));
  proj.appendChild(el('div', 'hint', p.years + ' years at ' + (state.pension.growth * 100).toFixed(1) + '% growth'));
  body.appendChild(proj);

  body.appendChild(section('Contributions'));
  body.appendChild(list([
    row({title: 'You', value: fmt(state.pension.monthly) + '/mo', chev: false}),
    row({title: 'Employer', value: fmt(state.pension.employer) + '/mo', chev: false})
  ]));

  const amt = input({type: 'number', step: '1', value: state.pension.monthly});
  body.appendChild(field({label: 'Your monthly contribution', input: amt}));
  const go = el('button', 'btn btn--primary btn--block', 'Update');
  go.onclick = () => {
    state.pension.monthly = Math.max(0, round2(Number(amt.value) || 0));
    save(); toast('Contribution updated'); rerender();
  };
  body.appendChild(go);

  return screen('pension', {title: 'Pension', back: '#/home', body});
}

export function isaScreen() {
  const body = el('div');
  const c = el('div', 'card');
  c.appendChild(el('div', 'lts__l', 'ISA balance'));
  c.appendChild(el('div', 'lts__v', fmt(state.isa.balance)));
  c.appendChild(spendBar(state.isa.used / Math.max(1, state.isa.allowance)));
  c.appendChild(el('div', 'hint', fmt(state.isa.used) + ' of ' + fmt(state.isa.allowance) + ' allowance used'));
  body.appendChild(c);

  const amt = input({type: 'number', step: '1', value: state.isa.contrib});
  body.appendChild(field({label: 'Monthly contribution', input: amt}));
  const go = el('button', 'btn btn--primary btn--block', 'Update');
  go.onclick = () => {
    state.isa.contrib = Math.max(0, round2(Number(amt.value) || 0));
    save(); toast('Contribution updated'); rerender();
  };
  body.appendChild(go);

  return screen('isa', {title: 'Stocks & Shares ISA', back: '#/home', body});
}

export function plusScreen() {
  const body = el('div');
  const cur = planInfo();
  const c = el('div', 'card');
  c.appendChild(pill(cur.name.toUpperCase(), 'coral'));
  c.appendChild(el('div', 'lts__v', fmt(cur.price) + '/mo'));
  c.appendChild(el('div', 'hint', 'Renews ' + dateStr(state.plus.renews)));
  body.appendChild(c);

  body.appendChild(section('Plans'));
  const l = el('div', 'list list--boxed');
  for (const p of Object.values(PLANS)) {
    l.appendChild(row({
      title: p.name,
      sub: p.price ? fmt(p.price) + '/mo · fee ' + (p.feeRate * 100).toFixed(2) + '%' : 'Free',
      value: state.plan === p.id ? '✓' : '', chev: false,
      onClick: () => planChangeSheet(p.id)
    }));
  }
  body.appendChild(l);

  body.appendChild(section('Benefits'));
  const bl = el('div', 'list list--boxed');
  for (const b of BENEFITS) {
    bl.appendChild(row({
      title: b.name,
      sub: b.blurb,
      value: planHasBenefit(cur.id, b.id) ? '✓' : '—',
      onClick: () => { location.hash = '#/benefit/' + b.id; }
    }));
  }
  body.appendChild(bl);

  const note = el('p', 'hint');
  note.textContent = 'Cancel any time. Benefits stop when your plan ends.';
  body.appendChild(note);

  return screen('plus', {title: 'Monzo Plus', back: '#/account', body});
}

export function profileScreen() {
  const body = el('div');
  const u = state.user;
  for (const [label, key, type] of [
    ['Full name', 'name', 'text'], ['Email', 'email', 'email'],
    ['Phone', 'phone', 'tel'], ['Address', 'address', 'text'],
    ['City', 'city', 'text'], ['Postcode', 'postcode', 'text'], ['Date of birth', 'dob', 'date']
  ]) {
    const i = input({type, value: u[key] || ''});
    i.onchange = () => { u[key] = i.value; save(); toast('Saved'); };
    body.appendChild(field({label, input: i}));
  }
  return screen('profile', {title: 'Personal details', back: '#/settings-personal', body});
}

export function securityScreen() {
  const body = el('div');
  body.appendChild(list([
    row({title: 'Change PIN', onClick: () => toast('PIN change')}),
    row({title: 'Biometrics', value: state.settings.biometrics ? 'On' : 'Off', chev: false})
  ]));
  const b = el('button', 'btn btn--danger btn--block', 'Log out');
  b.onclick = () => {
    sessionStorage.removeItem('monzo_auth');
    location.hash = '#/login';
    rerender();
  };
  body.appendChild(b);
  return screen('security', {title: 'Security', back: '#/settings-security', body});
}

export function notificationsScreen() {
  const body = el('div');
  const s = state.settings;
  const perm = notifyPermission();

  const stateCard = el('div', 'card');
  stateCard.appendChild(el('div', 'row__t',
    perm === 'granted' ? 'Notifications on' : perm === 'denied' ? 'Blocked in your browser' : 'Notifications off'));
  stateCard.appendChild(el('div', 'hint', perm === 'granted'
    ? 'Monzo can send you alerts on this device.'
    : perm === 'denied'
      ? 'Allow notifications for this site in your browser settings.'
      : 'Allow notifications to get bill and spending alerts.'));
  body.appendChild(stateCard);

  if (perm !== 'granted') {
    const ask = el('button', 'btn btn--primary btn--block', 'Turn on notifications');
    ask.onclick = async () => {
      const r = await requestNotify();
      if (r === 'granted') {
        notify('Notifications on', 'This is what an alert looks like');
        toast('Notifications on');
      } else if (r === 'unsupported') {
        toast('This browser has no notifications');
      } else {
        toast('Not allowed');
      }
      rerender();
    };
    body.appendChild(ask);
  } else {
    const test = el('button', 'btn btn--ghost btn--block', 'Send a test');
    test.onclick = () => {
      const sent = notify('Test alert', 'Sent from your Monzo clone');
      toast(sent ? 'Test sent' : 'Could not send');
    };
    body.appendChild(test);
  }

  body.appendChild(section('What to send'));
  const l = el('div', 'list list--boxed');
  const keys = {bills: 'notifyBills', spending: 'notifySpending', pots: 'notifyPots', marketing: 'marketing'};
  for (const t of NOTIFY_TYPES) {
    const r = el('div', 'row');
    const m = el('div', 'row__main');
    m.appendChild(el('div', 'row__t', t.label));
    m.appendChild(el('div', 'row__s', t.note));
    r.appendChild(m);
    r.appendChild(switchEl(s[keys[t.id]], v => { s[keys[t.id]] = v; save(); }));
    l.appendChild(r);
  }
  body.appendChild(l);

  body.appendChild(el('p', 'hint', 'Notifications only work while the app is installed or the tab is open.'));

  return screen('notifications', {title: 'Notifications', back: '#/settings-preferences', body});
}

export function statementsScreen() {
  const body = el('div');
  const months = statementMonths();
  body.appendChild(el('p', 'hint', 'Pick a month. A PDF downloads to your device.'));

  const l = el('div', 'list list--boxed');
  for (const m of months) {
    l.appendChild(row({
      title: m.label,
      sub: m.count + (m.count === 1 ? ' transaction' : ' transactions') + ' · PDF',
      onClick: () => {
        if (!m.count) return toast('Nothing in ' + m.label);
        const rows = statementRows(m.start, m.end);
        const totals = statementTotals(m.start, m.end, rows);
        const blob = buildStatement({
          title: 'Statement · ' + m.label,
          account: acc().name + ' account · •••• ' + acc().card.last4,
          from: dateStr(m.start),
          to: dateStr(m.end - 1),
          opening: totals.opening,
          closing: totals.closing,
          rows
        });
        download(blob, 'monzo-statement-' + m.key + '.pdf');
        toast('Statement downloaded');
      }
    }));
  }
  body.appendChild(l);

  body.appendChild(el('p', 'hint', 'Statements cover the last 12 months. Older ones can be requested from support.'));

  return screen('statements', {title: 'Statements', back: '#/settings-documents', body});
}

export function appearanceScreen() {
  const body = el('div');
  const s = state.settings;
  body.appendChild(field({label: 'Theme', input: seg([
    {label: 'Light', value: 'light'}, {label: 'Dark', value: 'dark'}, {label: 'System', value: 'system'}
  ], s.theme, v => { s.theme = v; save(); applyTheme(); })}));
  const r = el('div', 'row');
  const m = el('div', 'row__main');
  m.appendChild(el('div', 'row__t', 'Reduced motion'));
  m.appendChild(el('div', 'row__s', 'Fewer animations and no sliding'));
  r.appendChild(m);
  r.appendChild(switchEl(s.reducedMotion, v => { s.reducedMotion = v; save(); applyTheme(); }));
  const h = el('div', 'row');
  const hm = el('div', 'row__main');
  hm.appendChild(el('div', 'row__t', 'Haptics'));
  hm.appendChild(el('div', 'row__s', 'Short vibration on taps and toasts'));
  h.appendChild(hm);
  h.appendChild(switchEl(s.haptics, v => { s.haptics = v; save(); if (v) haptic(20); }));
  body.appendChild(list([r, h]));
  return screen('appearance', {title: 'Appearance', back: '#/settings-preferences', body});
}

export function applyTheme() {
  const t = state.settings.theme;
  let dark = t === 'dark';
  if (t === 'system') {
    try { dark = matchMedia('(prefers-color-scheme: dark)').matches; } catch {}
  }
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.motion = state.settings.reducedMotion ? 'reduced' : 'full';
}

export function aboutScreen() {
  const body = el('div');
  body.appendChild(list([
    row({title: 'Version', value: '8.10.0 clone', chev: false}),
    row({title: 'Build', value: 'v42', chev: false}),
    row({title: 'Made by', value: 'Jason Armstrong', chev: false})
  ]));
  return screen('about', {title: 'About', back: '#/settings-about', body});
}

const LAYOUT_LABELS = {
  card: 'Card', balance: 'Balance', ring: 'Left to spend',
  carousel: 'Save & invest', activity: 'Activity'
};
const CAROUSEL_LABELS = {pots: 'Pots', invest: 'Investments', pension: 'Pension', isa: 'ISA'};

export function layoutSheet() {
  const body = el('div');
  const L = state.layout;

  const widget = el('div', 'card card--flat');
  widget.style.cssText = 'background:#ff4f40;color:#fff;padding:16px;border-radius:20px';
  widget.appendChild(el('div', '', '<div style="font-size:11px;font-weight:700;opacity:.8">MONZO · ' + acc().name.toUpperCase() + '</div>'));
  widget.appendChild(el('div', '', '<div style="font-size:24px;font-weight:800;margin-top:6px">' + fmt(bal()) + '</div>'));
  widget.appendChild(el('div', '', '<div style="font-size:11px;opacity:.85;margin-top:2px">' + fmt(leftToSpend()) + ' left to spend</div>'));
  const wl = el('div');
  wl.style.cssText = 'display:flex;gap:4px;margin-top:10px';
  for (let i = 0; i < 7; i++) {
    const d = el('div');
    d.style.cssText = 'flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,' + (i < 4 ? '1' : '.35') + ')';
    wl.appendChild(d);
  }
  widget.appendChild(wl);
  const wWrap = el('div');
  wWrap.style.cssText = 'padding:0 0 12px';
  const wlbl = el('div', 'sect', 'Widget preview');
  wWrap.appendChild(wlbl);
  wWrap.appendChild(widget);
  body.appendChild(wWrap);

  body.appendChild(el('p', 'hint', 'Reorder with the arrows. Hide anything you do not use.'));

  const draw = () => {
    body.querySelectorAll('.row').forEach(n => n.remove());
    for (const key of L.order) {
      const r = el('div', 'row');
      r.appendChild(el('div', 'row__main', LAYOUT_LABELS[key] || key));

      const up = el('button', 'hdr__btn');
      up.type = 'button';
      up.textContent = '↑';
      up.onclick = () => {
        const i = L.order.indexOf(key);
        if (i > 0) { L.order.splice(i, 1); L.order.splice(i - 1, 0, key); save(); draw(); rerender(); }
      };

      const dn = el('button', 'hdr__btn');
      dn.type = 'button';
      dn.textContent = '↓';
      dn.onclick = () => {
        const i = L.order.indexOf(key);
        if (i > -1 && i < L.order.length - 1) { L.order.splice(i, 1); L.order.splice(i + 1, 0, key); save(); draw(); rerender(); }
      };

      r.appendChild(up);
      r.appendChild(dn);
      r.appendChild(switchEl(!L.hidden.includes(key), v => {
        if (v) L.hidden = L.hidden.filter(x => x !== key);
        else if (!L.hidden.includes(key)) L.hidden.push(key);
        save(); rerender();
      }));
      body.appendChild(r);
    }

    body.appendChild(el('div', 'sect', 'Carousel'));
    for (const key of ['pots', 'invest', 'pension', 'isa']) {
      const r = el('div', 'row');
      r.appendChild(el('div', 'row__main', CAROUSEL_LABELS[key]));
      r.appendChild(switchEl(L.carousel.includes(key), v => {
        if (v && !L.carousel.includes(key)) L.carousel.push(key);
        else if (!v) L.carousel = L.carousel.filter(x => x !== key);
        save(); rerender();
      }));
      body.appendChild(r);
    }
  };

  draw();
  sheet({title: 'Edit home', body});
                           }
