import {
  state, fmt, round2, catById, categories, searchTx, pushSearch,
  clearSearches, recentSearches, planInfo, PLANS, planHasBenefit,
  planChangeQuote, changePlan, save, dayKey, dayLabel
} from './core.js?v=41';
import { BENEFITS, SEARCH_DIRS } from './data.js?v=41';
import {
  el, screen, row, list, section, tile, catIcon, icon,
  empty, toast, sheet, confirmSheet, input, pill
} from './ui.js?v=41';

const rerender = () => document.dispatchEvent(new CustomEvent('render'));

export function searchScreen() {
  const body = el('div');
  let dir = 'all';
  let cat = null;
  let timer = null;

  const box = el('div', 'card card--flat');
  box.style.cssText = 'display:flex;align-items:center;gap:10px';
  box.appendChild(icon('search', 18));
  const q = input({placeholder: 'Search transactions'});
  q.style.border = '0';
  q.style.background = 'transparent';
  q.style.padding = '4px 0';
  q.setAttribute('aria-label', 'Search transactions');
  box.appendChild(q);
  body.appendChild(box);

  const chips = el('div');
  chips.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:12px 0';
  const paintChips = () => {
    chips.innerHTML = '';
    for (const d of SEARCH_DIRS) {
      const b = el('button', 'pill' + (dir === d.id ? ' pill--coral' : ''), d.label);
      b.type = 'button';
      b.onclick = () => { dir = d.id; paintChips(); run(); };
      chips.appendChild(b);
    }
    const c = el('button', 'pill' + (cat ? ' pill--coral' : ''));
    c.type = 'button';
    const chosen = cat ? catById(cat) : null;
    c.textContent = chosen ? chosen.name : 'Category';
    c.onclick = () => categorySheet(v => { cat = v; paintChips(); run(); });
    chips.appendChild(c);
  };
  paintChips();
  body.appendChild(chips);

  const out = el('div');
  body.appendChild(out);

  const run = () => {
    out.innerHTML = '';
    const needle = q.value.trim();
    const rows = searchTx(needle, {dir, cat});
    if (!needle && dir === 'all' && !cat) {
      const recents = recentSearches();
      if (recents.length) {
        const head = el('div', 'sect');
        head.style.display = 'flex';
        head.style.justifyContent = 'space-between';
        head.appendChild(el('span', '', 'Recent'));
        const clr = el('button', 'btn btn--ghost btn--sm', 'Clear');
        clr.onclick = () => { clearSearches(); run(); };
        head.appendChild(clr);
        out.appendChild(head);
        const rl = el('div', 'list list--boxed');
        for (const r of recents) {
          rl.appendChild(row({
            title: r, chev: false,
            onClick: () => { q.value = r; run(); }
          }));
        }
        out.appendChild(rl);
      }
      if (!rows.length) {
        out.appendChild(empty('Search your money', 'Merchant, note, amount or date'));
        return;
      }
    }

    if (!rows.length) {
      out.appendChild(empty('Nothing found', 'Try a different word or filter'));
      return;
    }

    const head = el('div', 'sect');
    head.textContent = rows.length + (rows.length === 1 ? ' result' : ' results');
    out.appendChild(head);

    const l = el('div', 'list list--boxed');
    let lastMonth = '';
    for (const t of rows) {
      const d = new Date(t.ts);
      const mk = d.toLocaleDateString('en-GB', {month:'long', year:'numeric'});
      if (mk !== lastMonth) {
        lastMonth = mk;
        l.appendChild(el('div', 'daysep', mk));
      }
      const c = catById(t.category);
      const r = row({
        title: t.name,
        sub: d.toLocaleDateString('en-GB') + ' · ' + c.name,
        value: (t.amount > 0 ? '+' : '') + fmt(t.amount),
        tile: tile(t.name),
        onClick: () => { location.hash = '#/tx/' + t.id; }
      });
      const v = r.querySelector('.row__v');
      if (v && t.amount > 0) v.style.color = 'var(--green)';
      l.appendChild(r);
    }
    out.appendChild(l);
  };

  q.oninput = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (q.value.trim().length >= 2) pushSearch(q.value);
      run();
    }, 140);
  };

  run();

  const s = screen('search', {title: 'Search', back: '#/home', body});
  setTimeout(() => q.focus(), 60);
  return s;
}

function categorySheet(onPick) {
  const body = el('div');
  const l = el('div', 'list list--boxed');
  const s = sheet({title: 'Category', body});
  l.appendChild(row({
    title: 'Any category', chev: false,
    onClick: () => { s.close(); onPick(null); }
  }));
  for (const c of categories()) {
    if (c.id === 'transfers') continue;
    const r = row({
      title: c.name, chev: false,
      onClick: () => { s.close(); onPick(c.id); }
    });
    r.insertBefore(catIcon(c.icon, 26, c.colour), r.firstChild);
    l.appendChild(r);
  }
  body.appendChild(l);
}

export function benefitScreen(id) {
  const b = BENEFITS.find(x => x.id === id);
  if (!b) return screen('benefit', {title: 'Benefit', back: '#/plus', body: empty('Not found')});
  const plan = planInfo();
  const included = planHasBenefit(plan.id, b.id);
  const body = el('div');

  const head = el('div', 'card');
  head.appendChild(pill(b.name.toUpperCase(), 'coral'));
  head.appendChild(el('div', 'row__t', b.name));
  head.appendChild(el('div', 'hint', b.blurb));
  body.appendChild(head);

  const stateCard = el('div', 'card card--flat');
  stateCard.appendChild(el('div', 'row__t', included ? 'Included in ' + plan.name : 'Not in ' + plan.name));
  stateCard.appendChild(el('div', 'hint', included
    ? 'You have this now. Nothing to switch on.'
    : 'Available on ' + b.plans.map(p => PLANS[p].name).join(' and ') + '.'));
  body.appendChild(stateCard);

  body.appendChild(section('What you get'));
  const il = el('div', 'list list--boxed');
  for (const i of b.includes) il.appendChild(row({title: i, chev: false, value: '✓'}));
  body.appendChild(il);

  body.appendChild(section('How it works'));
  const hl = el('div', 'list list--boxed');
  for (const h of b.how) hl.appendChild(row({title: h, chev: false}));
  body.appendChild(hl);

  if (!included) {
    const cheapest = b.plans
      .map(pid => ({pid, price: PLANS[pid].price}))
      .sort((a, z) => a.price - z.price)[0];
    const go = el('button', 'btn btn--primary btn--block', 'Upgrade to ' + PLANS[cheapest.pid].name);
    go.onclick = () => planChangeSheet(cheapest.pid);
    body.appendChild(go);
  } else {
    const manage = el('button', 'btn btn--ghost btn--block', 'Manage plan');
    manage.onclick = () => { location.hash = '#/plus'; };
    body.appendChild(manage);
  }

  return screen('benefit-' + id, {title: b.name, back: '#/plus', body});
}

export function planChangeSheet(id) {
  const q = planChangeQuote(id);
  if (q.same) return toast('You are already on ' + q.to.name);
  const body = el('div');
  body.appendChild(el('p', 'hint', q.downgrade
    ? 'You will move to ' + q.to.name + ' straight away. ' + fmt(q.credit) + ' comes off your next bill.'
    : 'You will move to ' + q.to.name + ' straight away. ' + fmt(q.due) + ' is charged today, then ' + fmt(q.to.price) + ' a month.'));
  body.appendChild(list([
    row({title: 'Now', value: q.from.name + ' · ' + fmt(q.from.price) + '/mo', chev: false}),
    row({title: 'After', value: q.to.name + ' · ' + fmt(q.to.price) + '/mo', chev: false})
  ]));
  if (q.due > 0) {
    body.appendChild(list([row({title: 'Charged today', value: fmt(q.due), chev: false})]));
  }
  const go = el('button', 'btn btn--primary btn--block', q.downgrade ? 'Downgrade' : 'Upgrade');
  const s = sheet({title: q.downgrade ? 'Downgrade plan' : 'Upgrade plan', body, foot: go});
  go.onclick = () => {
    changePlan(id);
    s.close();
    toast('You are on ' + q.to.name);
    rerender();
  };
                }
