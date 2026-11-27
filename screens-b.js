import {
  state, fmt, round2, addTx, save, uid, investBuy, investSell,
  investDeposit, portfolioValue, platformFeeMonthly, planInfo, PLANS,
  pensionProjection, reset, dateStr, timeStr, scan, restoreFrom, recoveredFrom
} from './core.js?v=34';
import { FUNDS, CATEGORIES, POT_EMOJI, POT_COLOURS } from './data.js?v=34';
import {
  el, screen, row, list, section, tile, empty, toast, sheet, confirmSheet,
  field, input, seg, switchEl, pill, cardArt, avatar
} from './ui.js?v=34';

const cat = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
const rerender = () => document.dispatchEvent(new CustomEvent('render'));

export function cardSheet() {
  const body = el('div');
  body.appendChild(cardArt(state.cards[0]));
  const freeze = el('button', 'btn btn--block btn--ghost',
    state.cards[0].frozen ? 'Unfreeze card' : 'Freeze card');
  body.appendChild(list([
    row({title: 'View card number', onClick: () => toast('•••• •••• •••• ' + state.cards[0].last4)}),
    row({title: 'Card PIN', onClick: () => toast('PIN 2580')}),
    row({title: 'Add to Apple Pay', onClick: () => toast('Added to Apple Pay')})
  ]));
  freeze.onclick = () => {
    state.cards[0].frozen = !state.cards[0].frozen;
    save();
    freeze.textContent = state.cards[0].frozen ? 'Unfreeze card' : 'Freeze card';
    toast(state.cards[0].frozen ? 'Card frozen' : 'Card unfrozen');
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
  for (const c of CATEGORIES) {
    const b = el('button', 'pill');
    b.type = 'button';
    b.textContent = c.emoji + ' ' + c.name;
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
  const s = sheet({title: 'Add transaction', body, foot: go});
  go.onclick = () => {
    const a = round2(Number(amount.value) || 0);
    if (!a) return toast('Enter an amount');
    addTx({name: name.value || 'Transaction', amount: a, category});
    s.close();
    toast('Added ' + fmt(a));
    rerender();
  };
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
  c.appendChild(el('div', 'ringwrap__v', (t.amount > 0 ? '+' : '') + fmt(t.amount)));
  c.appendChild(el('div', 'row__t', t.name));
  c.appendChild(el('div', 'hint', dateStr(t.ts) + ' · ' + timeStr(t.ts)));
  body.appendChild(c);

  body.appendChild(list([
    row({title: 'Category', value: cat(t.category).emoji + ' ' + cat(t.category).name, onClick: () => categorySheet(t.id)}),
    row({title: 'Note', value: t.note || 'Add', onClick: () => noteSheet(t.id)}),
    row({title: 'Receipt', value: t.receipt ? 'Attached' : 'Add', onClick: () => receiptSheet(t.id)}),
    row({title: 'Split bill', onClick: () => splitSheet(t.id)}),
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
  for (const c of CATEGORIES) {
    l.appendChild(row({
      title: c.emoji + ' ' + c.name, chev: false,
      value: t.category === c.id ? '✓' : '',
      onClick: () => {
        t.category = c.id;
        save(); s.close(); toast('Category updated'); rerender();
      }
    }));
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

export function splitSheet(id) {
  const t = state.tx.find(x => x.id === id);
  if (!t) return;
  const body = el('div');
  const n = input({type: 'number', value: 2, min: 2, max: 12});
  const each = el('p', 'hint');
  const update = () => {
    const c = Math.max(2, Number(n.value) || 2);
    each.textContent = fmt(round2(Math.abs(t.amount) / c)) + ' each across ' + c + ' people';
  };
  update();
  n.oninput = update;
  body.appendChild(field({label: 'Split between', input: n}));
  body.appendChild(each);
  const go = el('button', 'btn btn--primary btn--block', 'Request shares');
  const s = sheet({title: 'Split bill', body, foot: go});
  go.onclick = () => { s.close(); toast('Requests sent'); };
}

export function newPotSheet() {
  const body = el('div');
  const name = input({placeholder: 'Pot name'});
  const target = input({type: 'number', step: '1', placeholder: '500'});
  let emoji = POT_EMOJI[0], colour = POT_COLOURS[0];

  const emojis = el('div');
  emojis.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
  POT_EMOJI.forEach(e => {
    const b = el('button', 'pill');
    b.type = 'button';
    b.textContent = e;
    b.onclick = () => {
      emoji = e;
      emojis.querySelectorAll('.pill').forEach(x => x.className = 'pill');
      b.className = 'pill pill--coral';
    };
    emojis.appendChild(b);
  });

  const colours = el('div');
  colours.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  POT_COLOURS.forEach(c => {
    const b = el('button');
    b.type = 'button';
    b.style.cssText = 'width:30px;height:30px;border-radius:50%;background:' + c;
    b.onclick = () => {
      colour = c;
      colours.querySelectorAll('button').forEach(x => x.style.outline = 'none');
      b.style.outline = '3px solid currentColor';
    };
    colours.appendChild(b);
  });

  body.appendChild(field({label: 'Name', input: name}));
  body.appendChild(field({label: 'Target', input: target}));
  body.appendChild(field({label: 'Icon', input: emojis}));
  body.appendChild(field({label: 'Colour', input: colours}));

  const go = el('button', 'btn btn--primary btn--block', 'Create pot');
  const s = sheet({title: 'New pot', body, foot: go});
  go.onclick = () => {
    if (!name.value.trim()) return toast('Give your pot a name');
    state.pots.push({
      id: uid('pot'), name: name.value.trim(),
      target: Math.max(1, Number(target.value) || 100),
      saved: 0, emoji, colour, locked: false, roundUp: false, created: Date.now()
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
  body.appendChild(field({label: 'Name', input: name}));
  body.appendChild(field({label: 'Target', input: target}));
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
    save(); s.close(); toast('Pot updated'); rerender();
  };
}

export function investScreen() {
  const value = portfolioValue();
  const body = el('div');
  const c = el('div', 'card');
  c.appendChild(el('div', 'ringwrap__l', 'Portfolio value'));
  c.appendChild(el('div', 'ringwrap__v', fmt(value)));
  c.appendChild(el('div', 'hint', 'Platform fee ' + fmt(platformFeeMonthly()) + '/month on ' + planInfo().name));
  body.appendChild(c);

  const cash = el('div', 'card card--flat');
  cash.appendChild(el('div', 'row__t', 'Cash to invest'));
  cash.appendChild(el('div', 'row__v', fmt(state.invest.cash)));
  const dep = el('button', 'btn btn--primary btn--sm btn--block', 'Add money');
  dep.style.marginTop = '10px';
  dep.onclick = () => depositSheet();
  cash.appendChild(dep);
  body.appendChild(cash);

  body.appendChild(section('Holdings'));
  const l = el('div', 'list list--boxed');
  for (const f of FUNDS) {
    if (f.id === 'cash') continue;
    const units = state.invest.units[f.id] || 0;
    if (units <= 0) continue;
    l.appendChild(row({
      title: f.name, sub: units.toFixed(3) + ' units · ' + f.ticker,
      value: fmt(units * f.price),
      onClick: () => { location.hash = '#/fund/' + f.id; }
    }));
  }
  if (!l.children.length) l.appendChild(empty('No holdings yet', 'Buy your first fund'));
  body.appendChild(l);

  body.appendChild(section('Available funds'));
  const l2 = el('div', 'list list--boxed');
  for (const f of FUNDS) {
    if (f.id === 'cash') continue;
    l2.appendChild(row({title: f.name, sub: f.region + ' · risk ' + f.risk + '/7', value: fmt(f.price), onClick: () => { location.hash = '#/fund/' + f.id; }}));
  }
  body.appendChild(l2);

  return screen('invest', {title: 'Investments', back: '#/account', body});
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
  const f = FUNDS.find(x => x.id === id);
  if (!f) return screen('fund', {title: 'Fund', back: '#/invest', body: empty('Not found')});
  const units = state.invest.units[f.id] || 0;
  const body = el('div');
  const c = el('div', 'card');
  c.appendChild(el('div', 'row__t', f.name));
  c.appendChild(el('div', 'hint', f.ticker + ' · ' + f.region + ' · risk ' + f.risk + '/7'));
  c.appendChild(el('div', 'ringwrap__v', fmt(f.price)));
  body.appendChild(c);

  const held = el('div', 'card card--flat');
  held.appendChild(el('div', 'row__t', 'Your holding'));
  held.appendChild(el('div', 'row__v', units.toFixed(4) + ' units'));
  held.appendChild(el('div', 'hint', fmt(units * f.price)));
  body.appendChild(held);

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

  const sell = el('button', 'btn btn--ghost btn--block', 'Sell');
  sell.onclick = () => {
    const v = round2(Number(amt.value) || 0);
    if (!v) return toast('Enter an amount');
    if (!investSell(f.id, v)) return toast('Nothing to sell');
    toast('Sold ' + fmt(v)); rerender();
  };
  body.appendChild(sell);

  return screen('fund-' + id, {title: f.ticker, back: '#/invest', body});
}

export function pensionScreen() {
  const p = pensionProjection();
  const body = el('div');
  const c = el('div', 'card');
  c.appendChild(el('div', 'ringwrap__l', 'Pension pot'));
  c.appendChild(el('div', 'ringwrap__v', fmt(state.pension.balance)));
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
  c.appendChild(el('div', 'ringwrap__l', 'ISA balance'));
  c.appendChild(el('div', 'ringwrap__v', fmt(state.isa.balance)));
  const bar = el('div', 'pbar');
  bar.style.marginTop = '10px';
  const f = el('div', 'pbar__f');
  f.style.width = Math.round((state.isa.used / Math.max(1, state.isa.allowance)) * 100) + '%';
  bar.appendChild(f);
  c.appendChild(bar);
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
  c.appendChild(el('div', 'ringwrap__v', fmt(cur.price) + '/mo'));
  c.appendChild(el('div', 'hint', 'Renews ' + dateStr(state.plus.renews)));
  body.appendChild(c);

  body.appendChild(section('Plans'));
  const l = el('div', 'list list--boxed');
  for (const p of Object.values(PLANS)) {
    l.appendChild(row({
      title: p.name,
      sub: p.price ? fmt(p.price) + '/mo · fee ' + (p.feeRate * 100).toFixed(2) + '%' : 'Free',
      value: state.plan === p.id ? '✓' : '', chev: false,
      onClick: () => { state.plan = p.id; save(); toast('Switched to ' + p.name); rerender(); }
    }));
  }
  body.appendChild(l);

  body.appendChild(section('Benefits'));
  body.appendChild(list([
    row({title: 'Fee-free spending abroad', chev: false, value: cur.id === 'free' ? '—' : '✓'}),
    row({title: 'Capped platform fee', chev: false, value: fmt(cur.feeCap)}),
    row({title: 'Priority support', chev: false, value: (cur.id === 'max' || cur.id === 'perks') ? '✓' : '—'})
  ]));

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
  return screen('profile', {title: 'Personal details', back: '#/account', body});
}

export function dataScreen() {
  const body = el('div');
  if (recoveredFrom) {
    const p = el('p', 'hint');
    p.textContent = 'Restored from ' + recoveredFrom + '.';
    body.appendChild(p);
  }
  const note = el('p', 'hint');
  note.textContent = 'Every stored copy is listed below, richest first. Use any of them to replace the current data.';
  body.appendChild(note);

  const rows = scan();
  if (!rows.length) {
    body.appendChild(empty('No stored data found'));
  } else {
    const l = el('div', 'list list--boxed');
    for (const r of rows) {
      const isCurrent = r.key === (recoveredFrom || 'monzo_v22');
      const m = el('div', 'row__main');
      m.appendChild(el('div', 'row__t', r.key));
      m.appendChild(el('div', 'row__s',
        fmt(r.balance) + ' balance · ' + r.pots + ' pots · ' + fmt(r.portfolio) + ' invested · ' + r.tx + ' tx'));
      const b = el('button', 'row');
      b.type = 'button';
      b.appendChild(m);
      b.appendChild(el('div', 'row__v', isCurrent ? 'now' : 'use'));
      b.onclick = () => {
        if (!restoreFrom(r.key)) return toast('Could not read that copy');
        toast('Restored ' + r.key);
        rerender();
      };
      l.appendChild(b);
    }
    body.appendChild(l);
  }

  const dump = el('button', 'btn btn--ghost btn--block', 'Copy current data');
  dump.onclick = async () => {
    const txt = JSON.stringify(state);
    try {
      await navigator.clipboard.writeText(txt);
      toast('Copied to clipboard');
    } catch {
      const box = el('pre', 'errbox', txt);
      body.appendChild(box);
      toast('Copy from the box below');
    }
  };
  body.appendChild(dump);

  return screen('data', {title: 'Stored data', back: '#/account', body});
}

export function securityScreen() {
  const body = el('div');
  body.appendChild(list([
    row({title: 'Change PIN', onClick: () => toast('PIN change')}),
    row({title: 'Biometrics', value: state.settings.biometrics ? 'On' : 'Off', chev: false}),
    row({title: 'Stored data', onClick: () => { location.hash = '#/data'; }})
  ]));
  const b = el('button', 'btn btn--danger btn--block', 'Log out');
  b.onclick = () => {
    sessionStorage.removeItem('monzo_auth');
    location.hash = '#/login';
    rerender();
  };
  body.appendChild(b);
  const r = el('button', 'btn btn--ghost btn--block', 'Reset app data');
  r.onclick = () => confirmSheet({
    title: 'Reset everything', text: 'This wipes the current copy. Older copies stay in Stored data.', danger: true, confirm: 'Reset',
    onConfirm: () => { reset(); location.hash = '#/login'; rerender(); }
  });
  body.appendChild(r);
  return screen('security', {title: 'Security', back: '#/account', body});
}

export function notificationsScreen() {
  const body = el('div');
  const s = state.settings;
  const mk = (title, sub, key) => {
    const r = el('div', 'row');
    const m = el('div', 'row__main');
    m.appendChild(el('div', 'row__t', title));
    if (sub) m.appendChild(el('div', 'row__s', sub));
    r.appendChild(m);
    r.appendChild(switchEl(s[key], v => { s[key] = v; save(); }));
    return r;
  };
  body.appendChild(list([
    mk('Push notifications', 'Transactions and bills', 'notifications'),
    mk('Marketing', 'Offers and product news', 'marketing'),
    mk('Haptics', 'Vibrate on actions', 'haptics')
  ]));
  return screen('notifications', {title: 'Notifications', back: '#/account', body});
}

export function statementsScreen() {
  const body = el('div');
  const l = el('div', 'list list--boxed');
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const label = m.toLocaleDateString('en-GB', {month: 'long', year: 'numeric'});
    l.appendChild(row({title: label, sub: 'PDF statement', onClick: () => toast('Preparing ' + label)}));
  }
  body.appendChild(l);
  return screen('statements', {title: 'Statements', back: '#/account', body});
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
  m.appendChild(el('div', 'row__s', 'Fewer animations'));
  r.appendChild(m);
  r.appendChild(switchEl(s.reducedMotion, v => { s.reducedMotion = v; save(); applyTheme(); }));
  body.appendChild(list([r]));
  return screen('appearance', {title: 'Appearance', back: '#/account', body});
}

export function applyTheme() {
  const t = state.settings.theme;
  let dark = t === 'dark';
  if (t === 'system') {
    try { dark = matchMedia('(prefers-color-scheme: dark)').matches; } catch {}
  }
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function aboutScreen() {
  const body = el('div');
  body.appendChild(list([
    row({title: 'Version', value: '8.10.0 clone', chev: false}),
    row({title: 'Build', value: 'v34', chev: false}),
    row({title: 'Made by', value: 'Jason Armstrong', chev: false})
  ]));
  return screen('about', {title: 'About', back: '#/account', body});
}

export function cardsScreen() {
  const body = el('div');
  const l = el('div', 'list list--boxed');
  for (const c of state.cards) {
    l.appendChild(row({
      title: c.label + ' card', sub: '•••• ' + c.last4 + (c.frozen ? ' · frozen' : ''),
      onClick: () => cardSheet()
    }));
  }
  body.appendChild(l);
  const add = el('button', 'btn btn--ghost btn--block', 'Create virtual card');
  add.onclick = () => {
    state.cards.push({
      id: uid('card'), label: 'Virtual',
      last4: String(Math.floor(1000 + Math.random() * 9000)),
      type: 'virtual', frozen: false, virtual: true, network: 'mastercard'
    });
    save(); toast('Virtual card created'); rerender();
  };
  body.appendChild(add);
  return screen('cards', {title: 'Cards', back: '#/account', body});
}

const LAYOUT_LABELS = {
  card: 'Card', balance: 'Balance', ring: 'Left to spend',
  carousel: 'Save & invest', activity: 'Activity'
};
const CAROUSEL_LABELS = {pots: 'Pots', pension: 'Pension', isa: 'ISA'};

export function layoutSheet() {
  const body = el('div');
  const L = state.layout;

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
    for (const key of ['pots', 'pension', 'isa']) {
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
