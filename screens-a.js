import {
  state, fmt, fmtShort, round2, leftToSpend, spentThisMonth, byCategory,
  lastMonthByCategory, upcoming, totalPots, flexApr, flexPurchase, FLEX_MIN,
  FLEX_MONTHS, addTx, takeFunds, potMove, save, acc, bal, setActive, isJoint,
  portfolioValue, budgetFor, setBudget, totalBudget, hasBudget, budgetLeft,
  payeesSorted, addPayee, updatePayee, removePayee, toggleFav, recentPayments,
  splitsOutstandingTotal, flexUsed, flexAvailable, totalLoanRemaining, totalBorrowed,
  loanQuote, loanApr, takeLoan, flexSettle, LOAN_MIN, LOAN_MAX, LOAN_TERMS,
  OVERDRAFT_LIMITS, OVERDRAFT_EAR, overdraftDaily, reset, snapshot, restore,
  creditScore, creditBand, creditUpdatedDays, connectedTotal, connectedExpired,
  categories, catById, isCustomCategory, addCategory, updateCategory,
  removeCategory, categoryUsage
} from './core.js?v=42';
import { SAVINGS_INTEREST, CATEGORY_ICONS, CATEGORY_COLOURS, POT_ICONS, POT_COLOURS } from './data.js?v=42';
import {
  el, screen, row, list, section, tile, avatar, icon, catIcon, cardArt, spendBar,
  empty, toast, sheet, confirmSheet, field, input, seg, switchEl, pill
} from './ui.js?v=42';

const cat = id => catById(id);
const rerender = () => document.dispatchEvent(new CustomEvent('render'));

function potIcon(p, size = 30) {
  const wrap = el('span', 'pcard__ico');
  wrap.style.width = size + 'px';
  wrap.style.height = size + 'px';
  wrap.style.background = (p.colour || '#eeeeee') + '22';
  wrap.appendChild(catIcon(p.icon || 'box', Math.round(size * 0.6), p.colour || '#6b6b76'));
  return wrap;
}

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
  title.textContent = acc().name;
  h.appendChild(title);
  const find = el('button', 'hdr__btn');
  find.type = 'button';
  find.setAttribute('aria-label', 'Search');
  find.appendChild(icon('search', 18));
  find.onclick = () => { location.hash = '#/search'; };
  h.appendChild(find);
  const add = el('button', 'hdr__btn');
  add.type = 'button';
  add.setAttribute('aria-label', 'Add transaction');
  add.appendChild(icon('plus', 18));
  add.onclick = () => import('./screens-b.js?v=42').then(m => m.addTxSheet());
  h.appendChild(add);
  s.appendChild(h);

  const body = el('div', 'screen__body');
  body.style.padding = '16px 0 16px';

  body.appendChild(switcher());

  const L = state.layout;
  for (const key of L.order) {
    if (L.hidden.includes(key)) continue;
    if (key === 'card') {
      const w = el('div');
      w.style.padding = '0 16px';
      w.appendChild(cardArt(acc().card, () => import('./screens-b.js?v=42').then(m => m.cardSheet())));
      body.appendChild(w);
    } else if (key === 'balance') {
      const w = el('div');
      w.style.padding = '0 16px';
      const lbl = el('div', 'balance__lbl');
      lbl.textContent = isJoint() ? 'Joint · with ' + acc().with : 'Personal · ' + acc().card.last4;
      w.appendChild(lbl);
      const b = el('div', 'balance', state.settings.hideBalance ? '••••••' : fmt(bal()));
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
  eb.onclick = () => import('./screens-b.js?v=42').then(m => m.layoutSheet());
  edit.appendChild(eb);
  body.appendChild(edit);

  s.appendChild(body);
  return s;
}

function switcher() {
  const wrap = el('div', 'acctsw');
  const mk = (id) => {
    const a = state.accounts[id];
    const b = el('button', 'acctsw__b');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(state.active === id));
    b.appendChild(el('span', 'acctsw__n', id === 'joint' ? 'Joint · ' + a.with : 'Personal'));
    b.appendChild(el('span', 'acctsw__v', fmtShort(a.balance)));
    b.onclick = () => { setActive(id); rerender(); };
    return b;
  };
  wrap.appendChild(mk('personal'));
  wrap.appendChild(mk('joint'));
  return wrap;
}

function leftToSpendCard() {
  const c = el('div', 'card');
  const left = leftToSpend();
  const usingBudget = hasBudget();
  const denom = usingBudget ? Math.max(1, totalBudget()) : Math.max(1, bal());
  c.appendChild(el('div', 'lts__l', 'Left to spend'));
  c.appendChild(el('div', 'lts__v', fmt(left)));
  c.appendChild(spendBar(left / denom));
  c.appendChild(el('div', 'hint', usingBudget
    ? 'of ' + fmt(totalBudget()) + ' budget'
    : 'After ' + fmt(upcoming()) + ' of bills in the next 7 days'));
  if (!usingBudget) {
    const b = el('button', 'btn btn--ghost btn--sm btn--block', 'Set a budget');
    b.style.marginTop = '12px';
    b.onclick = () => { location.hash = '#/trends'; };
    c.appendChild(b);
  }
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
        b.appendChild(potIcon(p, 34));
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
      add.innerHTML = '<div style="font-size:22px;line-height:1">＋</div><div style="margin-top:6px">New pot</div>';
      add.onclick = () => import('./screens-b.js?v=42').then(m => m.newPotSheet());
      track.appendChild(add);
    } else if (key === 'invest') {
      const b = el('button', 'pcard');
      b.type = 'button';
      const ico = el('div', 'pcard__ico');
      ico.style.background = '#e8eefc';
      ico.appendChild(catIcon('trends', 22, '#1f6feb'));
      b.appendChild(ico);
      b.appendChild(el('div', 'pcard__n', 'Investments'));
      b.appendChild(el('div', 'pcard__v', fmtShort(portfolioValue())));
      b.onclick = () => { location.hash = '#/invest'; };
      track.appendChild(b);
    } else if (key === 'pension') {
      const b = el('button', 'pcard');
      b.type = 'button';
      const ico = el('div', 'pcard__ico');
      ico.style.background = '#e8f0fe';
      ico.appendChild(catIcon('family', 22, '#1c3f94'));
      b.appendChild(ico);
      b.appendChild(el('div', 'pcard__n', 'Pension'));
      b.appendChild(el('div', 'pcard__v', fmtShort(state.pension.balance)));
      b.onclick = () => { location.hash = '#/pension'; };
      track.appendChild(b);
    } else if (key === 'isa') {
      const b = el('button', 'pcard');
      b.type = 'button';
      const ico = el('div', 'pcard__ico');
      ico.style.background = '#e6f7ee';
      ico.appendChild(catIcon('note', 22, '#0b7a3c'));
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
  const sorted = state.tx
    .filter(t => (t.acct || 'personal') === state.active)
    .sort((a, b) => b.ts - a.ts).slice(0, 40);
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

export function trendsScreen() {
  const spent = spentThisMonth();
  const cats = byCategory();
  const prev = lastMonthByCategory();
  const total = Math.max(1, spent);
  const budget = totalBudget();
  const usingBudget = hasBudget();
  const body = el('div');

  const top = el('div', 'card');
  top.appendChild(el('div', 'lts__l', 'Spent this month'));
  top.appendChild(el('div', 'lts__v', fmt(spent)));
  if (usingBudget) {
    const left = budgetLeft();
    top.appendChild(spendBar(spent / Math.max(1, budget), left < 0));
    const sub = el('div', 'hint ' + (left < 0 ? 'budgetover' : 'budgetleft'));
    sub.textContent = left < 0
      ? fmt(Math.abs(left)) + ' over ' + fmt(budget) + ' budget'
      : fmt(left) + ' left of ' + fmt(budget) + ' budget';
    top.appendChild(sub);
  } else {
    top.appendChild(spendBar(0));
    top.appendChild(el('div', 'hint', 'No budget set'));
    const b = el('button', 'btn btn--ghost btn--sm btn--block', 'Set a budget');
    b.style.marginTop = '12px';
    b.onclick = () => import('./screens-b.js?v=42').then(x => x.budgetSheet());
    top.appendChild(b);
  }
  body.appendChild(top);

  body.appendChild(section('Categories'));
  const l = el('div', 'list list--boxed');
  const rows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  for (const [id, amt] of rows) {
    const c = cat(id);
    const p = prev[id] || 0;
    const delta = p ? Math.round(((amt - p) / p) * 100) : null;
    const tgt = budgetFor(id);

    const r = el('div', 'catrow');
    const main = el('button', 'catrow__main');
    main.type = 'button';
    main.appendChild(catIcon(c.icon, 30, c.colour));
    const mid = el('div', 'row__main');
    mid.appendChild(el('div', 'row__t', c.name));
    const bar = el('div', 'pbar');
    bar.style.marginTop = '6px';
    const f = el('div', 'pbar__f');
    f.style.width = Math.min(100, Math.round((amt / Math.max(1, tgt || total)) * 100)) + '%';
    f.style.background = tgt && amt > tgt ? 'var(--red)' : c.colour;
    bar.appendChild(f);
    mid.appendChild(bar);
    main.appendChild(mid);
    main.onclick = () => { location.hash = '#/trend/' + id; };
    r.appendChild(main);

    const amtWrap = el('div', 'catrow__amt');
    const amtBtn = el('button', 'catrow__v');
    amtBtn.type = 'button';
    amtBtn.textContent = fmt(amt);
    amtBtn.onclick = () => import('./screens-b.js?v=42').then(x => x.targetSheet(id));
    amtWrap.appendChild(amtBtn);
    if (delta !== null) {
      const d = el('span', 'hint');
      d.textContent = (delta > 0 ? '▲' : '▼') + Math.abs(delta) + '%';
      d.style.color = delta > 0 ? 'var(--red)' : 'var(--green)';
      amtWrap.appendChild(d);
    }
    const chip = el('button', 'tgt' + (tgt ? ' tgt--on' : ''));
    chip.type = 'button';
    chip.textContent = tgt ? fmt(tgt, {dp: 0}) : 'Set';
    chip.onclick = () => import('./screens-b.js?v=42').then(x => x.targetSheet(id));
    amtWrap.appendChild(chip);
    r.appendChild(amtWrap);

    const chev = el('button', 'catrow__chev');
    chev.type = 'button';
    chev.appendChild(icon('chev', 16));
    chev.onclick = () => { location.hash = '#/trend/' + id; };
    r.appendChild(chev);

    l.appendChild(r);
  }
  if (!rows.length) l.appendChild(empty('Nothing spent yet', 'Your categories will appear here'));
  body.appendChild(l);

  const manage = el('button', 'btn btn--ghost btn--sm btn--block', 'Manage categories');
  manage.onclick = () => { location.hash = '#/categories'; };
  body.appendChild(manage);

  body.appendChild(section('Daily'));
  const strip = el('div', 'card');
  const days = new Date().getDate();
  const perDay = new Array(days).fill(0);
  const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
  for (const t of state.tx) {
    if (t.amount >= 0 || t.ts < start.getTime()) continue;
    if ((t.acct || 'personal') !== state.active) continue;
    const d = new Date(t.ts).getDate();
    if (d >= 1 && d <= days) perDay[d - 1] += Math.abs(t.amount);
  }
  const maxD = Math.max(1, ...perDay);
  const bars = el('div');
  bars.style.cssText = 'display:flex;align-items:flex-end;gap:3px;height:72px';
  perDay.forEach(v => {
    const b = el('div');
    b.style.cssText = 'flex:1;border-radius:2px;height:' + Math.max(4, (v / maxD) * 72) + 'px;background:' + (v ? 'var(--coral)' : 'var(--bg-3)');
    bars.appendChild(b);
  });
  strip.appendChild(bars);
  body.appendChild(strip);

  return screen('trends', {title: 'Trends', body});
}

export function trendCatScreen(id) {
  const c = cat(id);
  const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
  const txs = state.tx
    .filter(t => t.category === id && t.ts >= start.getTime() && (t.acct || 'personal') === state.active)
    .sort((a, b) => b.ts - a.ts);
  const body = el('div');
  const total = txs.reduce((s, t) => s + Math.abs(t.amount), 0);
  const tgt = budgetFor(id);
  const card = el('div', 'card');
  card.appendChild(el('div', 'lts__l', 'This month'));
  card.appendChild(el('div', 'lts__v', fmt(total)));
  card.appendChild(el('div', 'hint', txs.length + ' transactions'));
  if (tgt) {
    card.appendChild(spendBar(total / tgt, total > tgt));
    card.appendChild(el('div', 'hint', fmt(Math.max(0, tgt - total)) + ' left of ' + fmt(tgt) + ' target'));
  }
  body.appendChild(card);

  const tgtRow = el('div', 'card card--flat');
  tgtRow.style.cssText = 'display:flex;align-items:center;gap:12px';
  const tm = el('div', 'row__main');
  tm.appendChild(el('div', 'row__t', 'Monthly target'));
  tm.appendChild(el('div', 'row__s', tgt ? fmt(tgt) : 'Not set'));
  tgtRow.appendChild(tm);
  const tb = el('button', 'btn btn--primary btn--sm');
  tb.textContent = tgt ? 'Edit' : 'Set';
  tb.onclick = () => import('./screens-b.js?v=42').then(x => x.targetSheet(id));
  tgtRow.appendChild(tb);
  body.appendChild(tgtRow);

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

  return screen('trend-' + id, {title: c.name, back: '#/trends', body});
}

/* ---------- categories ---------- */

export function categoriesScreen() {
  const body = el('div');
  body.appendChild(el('p', 'hint', 'Rename, recolour or add your own. Deleting one moves its transactions to General.'));

  const custom = state.customCats;
  if (custom.length) {
    body.appendChild(section('Yours'));
    const cl = el('div', 'list list--boxed');
    for (const c of custom) {
      cl.appendChild(row({
        title: c.name,
        sub: categoryUsage(c.id) + ' transactions',
        tile: catIcon(c.icon, 30, c.colour),
        onClick: () => { location.hash = '#/category-edit/' + c.id; }
      }));
    }
    body.appendChild(cl);
  }

  body.appendChild(section('Built in'));
  const l = el('div', 'list list--boxed');
  for (const c of categories()) {
    if (isCustomCategory(c.id)) continue;
    if (c.id === 'transfers' || c.id === 'income') continue;
    l.appendChild(row({
      title: c.name,
      sub: categoryUsage(c.id) + ' transactions',
      tile: catIcon(c.icon, 30, c.colour),
      onClick: () => { location.hash = '#/category-edit/' + c.id; }
    }));
  }
  body.appendChild(l);

  const add = el('button', 'btn btn--primary btn--block', 'New category');
  add.onclick = () => { location.hash = '#/category-new'; };
  body.appendChild(add);

  return screen('categories', {title: 'Categories', back: '#/trends', body});
}

export function categoryFormScreen(id) {
  const editing = !!id;
  const existing = editing ? categories().find(c => c.id === id) : null;
  if (editing && !existing) {
    return screen('category-form', {title: 'Category', back: '#/categories', body: empty('Not found')});
  }
  const custom = editing && isCustomCategory(id);
  const body = el('div');

  const name = input({value: existing ? existing.name : '', placeholder: 'Category name'});
  body.appendChild(field({label: 'Name', input: name}));

  let icon = existing ? existing.icon : 'box';
  let colour = existing ? existing.colour : CATEGORY_COLOURS[0];

  const preview = el('div', 'card card--flat');
  preview.style.cssText = 'display:flex;align-items:center;gap:12px';
  const previewIcon = el('span');
  const previewName = el('div', 'row__t');
  preview.appendChild(previewIcon);
  preview.appendChild(previewName);
  body.appendChild(preview);

  const paint = () => {
    previewIcon.innerHTML = '';
    previewIcon.appendChild(catIcon(icon, 32, colour));
    previewName.textContent = name.value.trim() || 'New category';
  };

  const iconWrap = el('div');
  iconWrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  for (const ic of CATEGORY_ICONS) {
    const b = el('button');
    b.type = 'button';
    b.style.cssText = 'border:0;background:transparent;padding:0;border-radius:50%';
    b.setAttribute('aria-label', ic);
    b.setAttribute('aria-pressed', String(ic === icon));
    b.appendChild(catIcon(ic, 36, ic === icon ? colour : '#6b6b76'));
    b.onclick = () => {
      icon = ic;
      iconWrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      paint();
    };
    iconWrap.appendChild(b);
  }
  body.appendChild(field({label: 'Icon', input: iconWrap}));

  const colourWrap = el('div');
  colourWrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
  for (const col of CATEGORY_COLOURS) {
    const b = el('button');
    b.type = 'button';
    b.style.cssText = 'width:32px;height:32px;border-radius:50%;background:' + col;
    b.setAttribute('aria-label', col);
    b.setAttribute('aria-pressed', String(col === colour));
    b.onclick = () => {
      colour = col;
      colourWrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      paint();
    };
    colourWrap.appendChild(b);
  }
  body.appendChild(field({label: 'Colour', input: colourWrap}));

  name.oninput = paint;
  paint();

  const go = el('button', 'btn btn--primary btn--block', editing ? 'Save category' : 'Create category');
  go.onclick = () => {
    const n = name.value.trim();
    if (!n) return toast('Give it a name');
    if (editing) {
      updateCategory(id, {name: n, icon, colour});
      toast('Category updated');
    } else {
      addCategory({name: n, icon, colour});
      toast('Category created');
    }
    location.hash = '#/categories';
  };
  body.appendChild(go);

  if (custom) {
    const rm = el('button', 'btn btn--ghost btn--block', 'Delete category');
    rm.onclick = () => {
      const snap = snapshot();
      removeCategory(id);
      toast('Category deleted', {label: 'Undo', onClick: () => { restore(snap); rerender(); }});
      location.hash = '#/categories';
    };
    body.appendChild(rm);
  } else if (editing) {
    body.appendChild(el('p', 'hint', 'Built-in categories can be renamed but not deleted.'));
  }

  return screen('category-form', {
    title: editing ? 'Edit category' : 'New category',
    back: '#/categories',
    body
  });
}

/* ---------- payments ---------- */

const ACTIONS = {
  send: {label: 'Send', icon: 'payments', hash: '#/send'},
  request: {label: 'Request', icon: 'trends', hash: '#/request'},
  split: {label: 'Split bill', icon: 'plus', hash: '#/splits'},
  bank: {label: 'Bank transfer', icon: 'chev', hash: '#/bank'},
  scheduled: {label: 'Scheduled', icon: 'trends', hash: '#/scheduled'},
  payees: {label: 'Payees', icon: 'account', hash: '#/payees'}
};

export function paymentsScreen() {
  const body = el('div');
  const grid = el('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px';
  for (const id of state.settings.payOrder) {
    if (state.settings.payHidden.includes(id)) continue;
    const a = ACTIONS[id];
    if (!a) continue;
    const b = el('button', 'card');
    b.type = 'button';
    b.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 8px;font-weight:800;font-size:12px';
    b.appendChild(icon(a.icon, 22));
    b.appendChild(el('span', '', a.label));
    b.onclick = () => { location.hash = a.hash; };
    grid.appendChild(b);
  }
  body.appendChild(grid);

  const outstanding = splitsOutstandingTotal();
  if (outstanding > 0) {
    body.appendChild(list([
      row({title: 'Owed to you', sub: 'From your splits', value: fmt(outstanding),
        onClick: () => { location.hash = '#/splits'; }})
    ]));
  }

  body.appendChild(section('Payees'));
  const l = el('div', 'list list--boxed');
  for (const p of payeesSorted()) {
    const r = row({
      title: p.name, sub: p.sort + ' · ' + p.acct, tile: tile(p.name),
      onClick: () => { location.hash = '#/payee/' + p.id; }
    });
    if (p.fav) {
      const star = el('span', 'fav');
      star.setAttribute('aria-pressed', 'true');
      star.textContent = '★';
      r.insertBefore(star, r.lastChild);
    }
    l.appendChild(r);
  }
  if (!state.payees.length) {
    l.appendChild(empty('No payees', 'Add someone to send money', {
      label: 'Add payee', onClick: () => { location.hash = '#/payee-new'; }
    }));
  }
  body.appendChild(l);

  const add = el('button', 'btn btn--ghost btn--block', 'Add payee');
  add.onclick = () => { location.hash = '#/payee-new'; };
  body.appendChild(add);

  const edit = el('button', 'btn btn--ghost btn--sm btn--block', 'Edit actions');
  edit.onclick = () => import('./screens-b.js?v=42').then(m => m.paymentsEditorSheet());
  body.appendChild(edit);

  return screen('payments', {title: 'Payments', body});
}

export function payeesScreen() {
  const body = el('div');
  const l = el('div', 'list list--boxed');
  for (const p of payeesSorted()) {
    l.appendChild(row({
      title: p.name, sub: p.sort + ' · ' + p.acct, tile: tile(p.name),
      onClick: () => { location.hash = '#/payee/' + p.id; }
    }));
  }
  if (!state.payees.length) l.appendChild(empty('No payees yet'));
  body.appendChild(l);
  const add = el('button', 'btn btn--primary btn--block', 'Add payee');
  add.onclick = () => { location.hash = '#/payee-new'; };
  body.appendChild(add);
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
  const favBtn = el('button', 'btn btn--ghost btn--sm');
  favBtn.style.marginTop = '12px';
  favBtn.textContent = p.fav ? '★ Favourite' : '☆ Add to favourites';
  favBtn.onclick = () => { toggleFav(p.id); rerender(); };
  c.appendChild(favBtn);
  body.appendChild(c);

  const send = el('button', 'btn btn--primary btn--block', 'Send money');
  send.onclick = () => { location.hash = '#/send/' + p.id; };
  body.appendChild(send);

  const recents = recentPayments(p.id);
  if (recents.length) {
    body.appendChild(section('Recent'));
    const rl = el('div', 'list list--boxed');
    for (const r of recents) {
      rl.appendChild(row({
        title: fmt(r.amount), sub: new Date(r.ts).toLocaleDateString('en-GB'), chev: false
      }));
    }
    body.appendChild(rl);
  }

  body.appendChild(list([
    row({title: 'Edit payee', onClick: () => { location.hash = '#/payee-edit/' + p.id; }}),
    row({title: 'Remove payee', onClick: () => {
      const snap = snapshot();
      removePayee(p.id);
      toast('Payee removed', {label: 'Undo', onClick: () => { restore(snap); rerender(); }});
      location.hash = '#/payments';
    }})
  ]));

  return screen('payee-' + id, {title: p.name, back: '#/payments', body});
}

export function payeeFormScreen(id) {
  const editing = !!id;
  const p = editing ? state.payees.find(x => x.id === id) : null;
  if (editing && !p) return screen('payee-form', {title: 'Payee', back: '#/payments', body: empty('Not found')});

  const body = el('div');
  const name = input({value: p ? p.name : '', placeholder: 'Full name'});
  const sort = input({value: p ? p.sort : '', placeholder: '00-00-00'});
  const acct = input({value: p ? p.acct : '', placeholder: '12345678', type: 'number'});
  body.appendChild(field({label: 'Name', input: name}));
  body.appendChild(field({label: 'Sort code', input: sort, hint: 'Six digits'}));
  body.appendChild(field({label: 'Account number', input: acct, hint: 'Eight digits'}));

  const go = el('button', 'btn btn--primary btn--block', editing ? 'Save changes' : 'Add payee');
  go.onclick = () => {
    const n = name.value.trim();
    const sDigits = sort.value.replace(/\D/g, '');
    const aDigits = acct.value.replace(/\D/g, '');
    if (!n) return toast('Enter a name');
    if (sDigits.length !== 6) return toast('Sort code needs six digits');
    if (aDigits.length !== 8) return toast('Account number needs eight digits');
    const pretty = sDigits.slice(0, 2) + '-' + sDigits.slice(2, 4) + '-' + sDigits.slice(4);
    if (editing) {
      updatePayee(p.id, {name: n, sort: pretty, acct: aDigits});
      toast('Payee updated');
      location.hash = '#/payee/' + p.id;
    } else {
      const created = addPayee({name: n, sort: pretty, acct: aDigits});
      toast('Payee added');
      location.hash = '#/payee/' + created.id;
    }
  };
  body.appendChild(go);

  return screen('payee-form', {
    title: editing ? 'Edit payee' : 'New payee',
    back: editing ? '#/payee/' + id : '#/payments',
    body
  });
}

export function sendScreen(payeeId) {
  const p = state.payees.find(x => x.id === payeeId);
  const body = el('div');
  const amount = input({type: 'number', step: '0.01', placeholder: '0.00'});
  const ref = input({placeholder: 'Reference'});
  body.appendChild(field({label: 'Amount', input: amount}));
  body.appendChild(field({label: 'Reference', input: ref}));
  if (p) body.appendChild(el('p', 'hint', 'To ' + p.name + ' from ' + acc().name));
  const go = el('button', 'btn btn--primary btn--block', 'Send');
  go.onclick = () => {
    const a = round2(Number(amount.value));
    if (!a || a <= 0) return toast('Enter an amount');
    if (!takeFunds(a)) return toast('Not enough money');
    const tx = addTx({name: p ? p.name : 'Bank transfer', amount: -a, category: 'transfers', note: ref.value, ref: ref.value});
    toast('Sent ' + fmt(a));
    location.hash = '#/receipt/' + tx.id;
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
    const tx = addTx({name: name.value || 'Bank transfer', amount: -a, category: 'transfers'});
    toast('Sent ' + fmt(a));
    location.hash = '#/receipt/' + tx.id;
  };
  body.appendChild(go);
  return screen('bank', {title: 'Bank transfer', back: '#/payments', body});
}

export function scheduledScreen() {
  const body = el('div');
  const l = el('div', 'list list--boxed');
  const items = state.scheduled.filter(s => (s.acct || 'personal') === state.active);
  for (const s of items) {
    l.appendChild(row({
      title: s.name,
      sub: s.freq === 'once' ? 'Once' : 'Day ' + s.day + ' monthly',
      value: fmt(s.amount), tile: tile(s.name),
      onClick: () => confirmSheet({
        title: s.name, text: 'Cancel this scheduled payment?', confirm: 'Cancel payment', danger: true,
        onConfirm: () => {
          const snap = snapshot();
          state.scheduled = state.scheduled.filter(x => x.id !== s.id);
          save();
          toast('Cancelled', {label: 'Undo', onClick: () => { restore(snap); rerender(); }});
          rerender();
        }
      })
    }));
  }
  if (!items.length) l.appendChild(empty('Nothing scheduled'));
  body.appendChild(l);
  return screen('scheduled', {title: 'Scheduled', back: '#/payments', body});
}

/* ---------- borrowing ---------- */

export function borrowingScreen() {
  const body = el('div');
  const owed = totalBorrowed();
  const band = creditBand(creditScore());

  const c = el('div', 'card');
  c.appendChild(el('div', 'lts__l', 'Total borrowed'));
  c.appendChild(el('div', 'lts__v', fmt(owed)));
  c.appendChild(el('div', 'hint', 'Across Flex, loans and overdraft'));
  body.appendChild(c);

  body.appendChild(section('Credit'));
  body.appendChild(list([
    row({title: 'Credit score', sub: band.label + ' · updated ' + creditUpdatedDays() + ' days ago',
      value: String(creditScore()), onClick: () => { location.hash = '#/credit'; }}),
    row({title: 'Mortgage in principle', sub: 'See what you could borrow',
      onClick: () => { location.hash = '#/mortgage'; }})
  ]));

  body.appendChild(section('Flex'));
  body.appendChild(list([
    row({title: 'Flex', sub: flexUsed() > 0 ? fmt(flexUsed()) + ' in plans' : 'Nothing owed',
      value: fmt(flexAvailable()) + ' left', onClick: () => { location.hash = '#/flex'; }}),
    row({title: 'Split a purchase', sub: 'Minimum ' + fmt(FLEX_MIN) + ' · 0% on 3 months',
      onClick: () => flexSheet()})
  ]));

  body.appendChild(section('Borrow'));
  body.appendChild(list([
    row({title: 'Personal loan', sub: fmt(LOAN_MIN) + ' – ' + fmt(LOAN_MAX) + ' · from 7.9% APR',
      value: state.loans.length ? fmt(totalLoanRemaining()) : '',
      onClick: () => { location.hash = '#/loan'; }}),
    row({title: 'Overdraft', sub: state.overdraft.enabled ? 'Up to ' + fmt(state.overdraft.limit) : 'Not set up',
      onClick: () => { location.hash = '#/overdraft'; }})
  ]));

  if (state.flex.plans.length) {
    body.appendChild(section('Your Flex plans'));
    const l = el('div', 'list list--boxed');
    for (const p of state.flex.plans) {
      l.appendChild(row({
        title: p.name, sub: fmt(p.per) + '/month · ' + p.months + ' months',
        value: fmt(p.remaining), onClick: () => { location.hash = '#/flex-plan/' + p.id; }
      }));
    }
    body.appendChild(l);
  }

  if (state.loans.length) {
    body.appendChild(section('Your loans'));
    const l = el('div', 'list list--boxed');
    for (const l2 of state.loans) {
      l.appendChild(row({
        title: 'Personal loan', sub: fmt(l2.per) + '/month · ' + l2.months + ' months',
        value: fmt(l2.remaining), chev: false
      }));
    }
    body.appendChild(l);
  }

  return screen('borrowing', {title: 'Borrowing', body});
}

export function flexScreen() {
  const body = el('div');
  const c = el('div', 'card');
  c.appendChild(el('div', 'lts__l', 'Available to Flex'));
  c.appendChild(el('div', 'lts__v', fmt(flexAvailable())));
  c.appendChild(spendBar(flexUsed() / Math.max(1, state.flex.limit)));
  c.appendChild(el('div', 'hint', 'Limit ' + fmt(state.flex.limit)));
  body.appendChild(c);

  const s = el('button', 'btn btn--primary btn--block', 'Flex a purchase');
  s.onclick = () => flexSheet();
  body.appendChild(s);

  const lim = el('button', 'btn btn--ghost btn--block', 'Manage limit');
  lim.onclick = () => flexLimitSheet();
  body.appendChild(lim);

  if (state.flex.plans.length) {
    body.appendChild(section('Plans'));
    const l = el('div', 'list list--boxed');
    for (const p of state.flex.plans) {
      l.appendChild(row({
        title: p.name, sub: fmt(p.per) + '/month · ' + p.months + ' months',
        value: fmt(p.remaining), onClick: () => { location.hash = '#/flex-plan/' + p.id; }
      }));
    }
    body.appendChild(l);
  } else {
    body.appendChild(empty('No Flex plans', 'Flex a purchase to start one'));
  }

  return screen('flex', {title: 'Flex', back: '#/borrowing', body});
}

export function flexPlanScreen(id) {
  const p = state.flex.plans.find(x => x.id === id);
  if (!p) return screen('flex-plan', {title: 'Plan', back: '#/flex', body: empty('Not found')});
  const body = el('div');
  const c = el('div', 'card');
  c.appendChild(el('div', 'row__t', p.name));
  c.appendChild(el('div', 'lts__v', fmt(p.remaining)));
  c.appendChild(el('div', 'hint', 'left of ' + fmt(p.principal) + ' · ' + (p.apr * 100).toFixed(0) + '% APR'));
  c.appendChild(el('div', 'hint', fmt(p.per) + ' a month for ' + p.months + ' months'));
  body.appendChild(c);

  const settle = el('button', 'btn btn--primary btn--block', 'Settle early');
  settle.onclick = () => confirmSheet({
    title: 'Settle ' + p.name,
    text: 'Pay ' + fmt(round2(p.remaining * 0.98)) + ' now and save ' + fmt(round2(p.remaining * 0.02)) + '.',
    confirm: 'Settle',
    onConfirm: () => {
      const r = flexSettle(p.id);
      if (!r) return toast('Not enough money');
      toast('Settled, saved ' + fmt(r.saved));
      location.hash = '#/flex';
    }
  });
  body.appendChild(settle);

  return screen('flex-plan-' + id, {title: 'Flex plan', back: '#/flex', body});
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
    if (a > flexAvailable()) return 'Over your ' + fmt(flexAvailable()) + ' available';
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
    if (!r.ok) return toast(r.reason === 'minimum' ? 'Minimum is ' + fmt(FLEX_MIN)
      : r.reason === 'limit' ? 'Over your available limit' : 'Pick a term');
    sh.close();
    toast('Flex plan created');
    location.hash = '#/flex';
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

export function loanScreen() {
  const body = el('div');
  let amount = 5000;
  let months = 36;

  const c = el('div', 'card');
  c.appendChild(el('div', 'lts__l', 'How much'));
  c.appendChild(el('div', 'lts__v', fmt(amount)));
  const slider = el('input', 'slider');
  slider.type = 'range';
  slider.min = String(LOAN_MIN);
  slider.max = String(LOAN_MAX);
  slider.step = '500';
  slider.value = String(amount);
  c.appendChild(slider);
  body.appendChild(c);

  const termCard = el('div', 'card card--flat');
  termCard.appendChild(el('div', 'row__t', 'Over how long'));
  termCard.appendChild(field({label: '', input: seg(
    LOAN_TERMS.map(m => ({label: m + 'm', value: m})), months,
    v => { months = v; update(); }
  )}));
  body.appendChild(termCard);

  const q = el('div', 'quote');
  body.appendChild(q);

  const update = () => {
    const quote = loanQuote(amount, months);
    q.innerHTML = '';
    q.appendChild(el('div', 'hint', 'Monthly repayment'));
    q.appendChild(el('div', 'quote__v', fmt(quote.per)));
    q.appendChild(el('div', 'hint',
      fmt(quote.total) + ' total · ' + (quote.apr * 100).toFixed(1) + '% APR representative'));
  };
  update();
  slider.oninput = () => {
    amount = Number(slider.value);
    c.querySelector('.lts__v').textContent = fmt(amount);
    update();
  };

  const eligible = el('div', 'card card--flat');
  eligible.appendChild(el('div', 'row__t', 'You are eligible'));
  eligible.appendChild(el('div', 'hint', 'Based on your Monzo history. A hard check happens when you accept.'));
  body.appendChild(eligible);

  const go = el('button', 'btn btn--primary btn--block', 'Accept ' + fmt(amount));
  go.onclick = () => {
    takeLoan(amount, months);
    toast('Loan paid into your account');
    location.hash = '#/borrowing';
  };
  body.appendChild(go);

  const note = el('p', 'hint',
    'Representative example: ' + fmt(5000) + ' over 36 months at 12.9% APR costs ' +
    fmt(loanQuote(5000, 36).total) + ' in total.');
  body.appendChild(note);

  return screen('loan', {title: 'Personal loan', back: '#/borrowing', body});
}

export function overdraftScreen() {
  const body = el('div');
  const bodyCard = el('div', 'card');
  bodyCard.appendChild(el('div', 'lts__l', 'Overdraft'));
  bodyCard.appendChild(el('div', 'lts__v', state.overdraft.enabled ? fmt(state.overdraft.limit) : 'Off'));
  bodyCard.appendChild(el('div', 'hint', (OVERDRAFT_EAR * 100).toFixed(0) + '% EAR · charged daily only when used'));
  body.appendChild(bodyCard);

  body.appendChild(section('Choose a limit'));
  const l = el('div', 'list list--boxed');
  for (const lim of OVERDRAFT_LIMITS) {
    l.appendChild(row({
      title: fmt(lim),
      sub: fmt(overdraftDaily(lim)) + ' a day when fully used',
      value: state.overdraft.enabled && state.overdraft.limit === lim ? '✓' : '',
      chev: false,
      onClick: () => {
        state.overdraft.enabled = true;
        state.overdraft.limit = lim;
        save(); toast('Overdraft set to ' + fmt(lim)); rerender();
      }
    }));
  }
  body.appendChild(l);

  const cost = el('div', 'card card--flat');
  cost.appendChild(el('div', 'row__t', 'What it costs'));
  cost.appendChild(el('div', 'hint',
    'Using the full ' + fmt(OVERDRAFT_LIMITS[1]) + ' for 30 days costs about ' +
    fmt(round2(overdraftDaily(OVERDRAFT_LIMITS[1]) * 30)) + '.'));
  body.appendChild(cost);

  if (state.overdraft.enabled) {
    const off = el('button', 'btn btn--ghost btn--block', 'Turn off overdraft');
    off.onclick = () => {
      state.overdraft.enabled = false;
      state.overdraft.limit = 0;
      save(); toast('Overdraft off'); rerender();
    };
    body.appendChild(off);
  }

  return screen('overdraft', {title: 'Overdraft', back: '#/borrowing', body});
}

/* ---------- account & settings ---------- */

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

  body.appendChild(section('Accounts'));
  const al = el('div', 'list list--boxed');
  for (const k of ['personal', 'joint']) {
    const a = state.accounts[k];
    al.appendChild(row({
      title: k === 'joint' ? 'Joint · ' + a.with : 'Personal',
      sub: '•••• ' + a.card.last4,
      value: fmt(a.balance),
      onClick: () => { setActive(k); location.hash = '#/home'; }
    }));
  }
  body.appendChild(al);

  body.appendChild(section('Money'));
  body.appendChild(list([
    row({title: 'Pots', sub: state.pots.length + ' pots · ' + fmt(totalPots()) + ' saved', onClick: () => { location.hash = '#/pots'; }}),
    row({title: 'Investments', sub: '3 funds · ' + fmt(portfolioValue()), onClick: () => { location.hash = '#/invest'; }}),
    row({title: 'Pension', sub: state.pension.provider, onClick: () => { location.hash = '#/pension'; }}),
    row({title: 'Stocks & Shares ISA', sub: 'Allowance used ' + fmt(state.isa.used), onClick: () => { location.hash = '#/isa'; }}),
    row({title: 'Monzo Plus', sub: 'Manage your plan', onClick: () => { location.hash = '#/plus'; }})
  ]));

  body.appendChild(list([
    row({
      title: 'Connected accounts',
      sub: state.connected.length
        ? state.connected.length + ' connected · ' + fmt(connectedTotal()) +
          (state.connected.some(connectedExpired) ? ' · reconnect needed' : '')
        : 'See your other banks here',
      onClick: () => { location.hash = '#/connected'; }
    }),
    row({title: 'Settings', sub: 'Details, security, preferences', onClick: () => { location.hash = '#/settings'; }})
  ]));

  return screen('account', {title: 'Account', body});
}

export function settingsScreen() {
  const body = el('div');
  body.appendChild(list([
    row({title: 'Personal details', sub: 'Name, address, contact', onClick: () => { location.hash = '#/settings-personal'; }}),
    row({title: 'Security and privacy', sub: 'PIN, biometrics, app lock', onClick: () => { location.hash = '#/settings-security'; }}),
    row({title: 'Preferences', sub: 'Theme, notifications, budgets', onClick: () => { location.hash = '#/settings-preferences'; }}),
    row({title: 'Credit and lending', sub: 'Score, report, mortgage', onClick: () => { location.hash = '#/credit'; }}),
    row({title: 'Documents', sub: 'Statements and letters', onClick: () => { location.hash = '#/settings-documents'; }}),
    row({title: 'About Monzo', sub: 'Version and legal', onClick: () => { location.hash = '#/settings-about'; }})
  ]));
  return screen('settings', {title: 'Settings', back: '#/account', body});
}

export function settingsPersonalScreen() {
  const body = el('div');
  body.appendChild(list([
    row({title: 'Name and date of birth', onClick: () => { location.hash = '#/profile'; }}),
    row({title: 'Address', sub: state.user.address + ', ' + state.user.postcode, onClick: () => { location.hash = '#/profile'; }}),
    row({title: 'Email', sub: state.user.email, onClick: () => { location.hash = '#/profile'; }}),
    row({title: 'Phone', sub: state.user.phone, onClick: () => { location.hash = '#/profile'; }}),
    row({title: 'Cards', sub: state.cards.length + ' active', onClick: () => { location.hash = '#/cards'; }}),
    row({
      title: 'Connected accounts',
      sub: state.connected.length + ' connected',
      onClick: () => { location.hash = '#/connected'; }
    })
  ]));
  return screen('settings-personal', {title: 'Personal details', back: '#/settings', body});
}

export function settingsSecurityScreen() {
  const body = el('div');
  body.appendChild(list([
    row({title: 'Change PIN', onClick: () => { location.hash = '#/security'; }}),
    row({title: 'Biometrics', sub: 'Face or fingerprint unlock',
      value: state.settings.biometrics ? 'On' : 'Off', chev: false,
      onClick: () => { state.settings.biometrics = !state.settings.biometrics; save(); rerender(); }}),
    row({title: 'App lock', sub: 'Require PIN on open',
      value: state.settings.appLock ? 'On' : 'Off', chev: false,
      onClick: () => { state.settings.appLock = !state.settings.appLock; save(); rerender(); }})
  ]));

  body.appendChild(section('Sessions'));
  body.appendChild(list([
    row({title: 'This device', sub: 'iPhone · Stockton-on-Tees', value: 'Active', chev: false})
  ]));

  const r = el('button', 'btn btn--ghost btn--block', 'Reset app data');
  r.onclick = () => confirmSheet({
    title: 'Reset everything', text: 'This wipes all local data.', danger: true, confirm: 'Reset',
    onConfirm: () => { reset(); location.hash = '#/login'; }
  });
  body.appendChild(r);
  return screen('settings-security', {title: 'Security and privacy', back: '#/settings', body});
}

export function settingsPreferencesScreen() {
  const body = el('div');
  body.appendChild(list([
    row({title: 'Appearance', sub: 'Theme and motion', onClick: () => { location.hash = '#/appearance'; }}),
    row({title: 'Notifications', sub: 'Alerts and haptics', onClick: () => { location.hash = '#/notifications'; }}),
    row({title: 'Budgets', sub: 'Monthly targets', onClick: () => { location.hash = '#/trends'; }}),
    row({title: 'Categories', sub: 'Add your own', onClick: () => { location.hash = '#/categories'; }}),
    row({title: 'Home layout', sub: 'Reorder sections', onClick: () => import('./screens-b.js?v=42').then(m => m.layoutSheet())})
  ]));
  return screen('settings-preferences', {title: 'Preferences', back: '#/settings', body});
}

export function settingsDocumentsScreen() {
  const body = el('div');
  body.appendChild(list([
    row({title: 'Statements', sub: 'Monthly PDFs', onClick: () => { location.hash = '#/statements'; }}),
    row({title: 'Proof of income', sub: 'Letters for landlords', onClick: () => toast('Letter requested')}),
    row({title: 'Terms and conditions', onClick: () => toast('Opening terms')})
  ]));
  return screen('settings-documents', {title: 'Documents', back: '#/settings', body});
}

export function settingsAboutScreen() {
  const body = el('div');
  body.appendChild(list([
    row({title: 'About', sub: 'Version and build', onClick: () => { location.hash = '#/about'; }}),
    row({title: 'Privacy policy', onClick: () => toast('Opening policy')})
  ]));
  const out = el('button', 'btn btn--danger btn--block', 'Log out');
  out.onclick = () => {
    sessionStorage.removeItem('monzo_auth');
    location.hash = '#/login';
    rerender();
  };
  body.appendChild(out);
  return screen('settings-about', {title: 'About Monzo', back: '#/settings', body});
}

export function potsScreen() {
  const body = el('div');
  const c = el('div', 'card');
  c.appendChild(el('div', 'lts__l', 'Total saved'));
  c.appendChild(el('div', 'lts__v', fmt(totalPots())));
  c.appendChild(el('div', 'hint', (SAVINGS_INTEREST * 100).toFixed(1) + '% AER on savings'));
  body.appendChild(c);

  const l = el('div', 'list list--boxed');
  for (const p of state.pots) {
    l.appendChild(row({
      title: p.name, sub: fmt(p.saved || 0) + ' of ' + fmt(p.target),
      value: p.locked ? 'Locked' : '', tile: potIcon(p, 34),
      onClick: () => { location.hash = '#/pot/' + p.id; }
    }));
  }
  if (!state.pots.length) {
    l.appendChild(empty('No pots yet', 'Pots help you put money aside', {
      label: 'Create a pot', onClick: () => import('./screens-b.js?v=42').then(m => m.newPotSheet())
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
  const pi = potIcon(p, 56);
  pi.style.margin = '0 auto 12px';
  c.appendChild(pi);
  c.appendChild(el('div', 'lts__v', fmt(p.saved || 0)));
  c.appendChild(el('div', 'hint', 'of ' + fmt(p.target) + ' target'));
  c.appendChild(spendBar((p.saved || 0) / Math.max(1, p.target)));
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

  const linked = state.cards.filter(x => x.potId === p.id);

  body.appendChild(list([
    row({title: 'Edit pot', onClick: () => import('./screens-b.js?v=42').then(m => m.editPotSheet(p.id))}),
    row({
      title: 'Virtual card',
      sub: linked.length ? linked.length + ' card' + (linked.length === 1 ? '' : 's') + ' linked' : 'Spend straight from this pot',
      onClick: () => { location.hash = '#/pot-card/' + p.id; }
    }),
    row({title: 'Round-ups', value: p.roundUp ? 'On' : 'Off', chev: false}),
    row({title: 'Delete pot', onClick: () => {
      const snap = snapshot();
      acc().balance = round2(acc().balance + (p.saved || 0));
      state.pots = state.pots.filter(x => x.id !== p.id);
      for (const cd of state.cards) if (cd.potId === p.id) cd.potId = null;
      save();
      toast('Pot deleted', {label: 'Undo', onClick: () => { restore(snap); rerender(); }});
      location.hash = '#/pots';
    }})
  ]));

  return screen('pot-' + id, {title: p.name, back: '#/pots', body});
}

export function potCardScreen(potId) {
  const p = state.pots.find(x => x.id === potId);
  if (!p) return screen('pot-card', {title: 'Virtual card', back: '#/pots', body: empty('Pot not found')});
  const body = el('div');
  const cards = state.cards.filter(c => c.potId === potId);

  const c = el('div', 'card');
  c.appendChild(el('div', 'lts__l', p.name + ' card'));
  c.appendChild(el('div', 'lts__v', fmt(p.saved || 0)));
  c.appendChild(el('div', 'hint', 'Spending on these cards comes out of the pot, not your balance.'));
  body.appendChild(c);

  if (cards.length) {
    const l = el('div', 'list list--boxed');
    for (const cd of cards) {
      l.appendChild(row({
        title: '•••• ' + cd.last4,
        sub: (cd.frozen ? 'Frozen' : 'Active') + (cd.singleUse ? ' · single use' : '') + ' · ' + fmt(cd.spent || 0) + ' spent',
        onClick: () => { location.hash = '#/virtual-card/' + cd.id; }
      }));
    }
    body.appendChild(l);
  }

  const add = el('button', 'btn btn--primary btn--block', 'Create a virtual card');
  add.onclick = () => {
    const r = virtualCardCreate(p.id);
    if (!r.ok) return toast('Virtual cards need Plus');
    toast('Card created');
    location.hash = '#/virtual-card/' + r.card.id;
  };
  body.appendChild(add);

  if (!canUseVirtualCards()) {
    body.appendChild(el('p', 'hint', 'Virtual cards are part of Plus. Upgrade to create one.'));
    const up = el('button', 'btn btn--ghost btn--block', 'See plans');
    up.onclick = () => { location.hash = '#/plus'; };
    body.appendChild(up);
  }

  return screen('pot-card-' + potId, {title: 'Virtual card', back: '#/pot/' + potId, body});
                                              }
