import {
  state, fmt, fmtShort, round2, save, uid, dateStr, dayLabel, acc,
  creditScore, creditBand, creditHistory, creditUpdatedDays, creditRefresh,
  mipQuote, takeDip, MIP_MIN_DEPOSIT_PCT, MIP_INCOME_MULTIPLE,
  connectedExpired, connectedAdd, connectedRefresh, connectedReauth,
  connectedRemove, connectedTotal, connectedConsentDays
} from './core.js?v=44';
import {
  CREDIT_FACTORS, CREDIT_TIPS, CONNECTED_BANKS, CONNECT_CONSENT_DAYS, MORTGAGE_TERMS
} from './data.js?v=44';
import {
  el, screen, row, list, section, tile, catIcon,
  empty, toast, sheet, confirmSheet, field, input, seg
} from './ui.js?v=44';

const rerender = () => document.dispatchEvent(new CustomEvent('render'));

function gauge(score) {
  const band = creditBand(score);
  const pct = Math.max(0, Math.min(1, score / 999));
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 116');
  svg.setAttribute('width', '100%');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Credit score ' + score + ' out of 999, ' + band.label);

  const track = document.createElementNS(NS, 'path');
  track.setAttribute('d', 'M14 100 A86 86 0 0 1 186 100');
  track.setAttribute('fill', 'none');
  track.setAttribute('stroke', 'var(--bg-3)');
  track.setAttribute('stroke-width', '14');
  track.setAttribute('stroke-linecap', 'round');
  svg.appendChild(track);

  const len = Math.PI * 86;
  const arc = document.createElementNS(NS, 'path');
  arc.setAttribute('d', 'M14 100 A86 86 0 0 1 186 100');
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', band.colour);
  arc.setAttribute('stroke-width', '14');
  arc.setAttribute('stroke-linecap', 'round');
  arc.setAttribute('stroke-dasharray', String(len));
  arc.setAttribute('stroke-dashoffset', String(len * (1 - pct)));
  svg.appendChild(arc);

  const num = document.createElementNS(NS, 'text');
  num.setAttribute('x', '100');
  num.setAttribute('y', '92');
  num.setAttribute('text-anchor', 'middle');
  num.setAttribute('font-size', '38');
  num.setAttribute('font-weight', '800');
  num.setAttribute('fill', 'currentColor');
  num.textContent = String(score);
  svg.appendChild(num);

  const cap = document.createElementNS(NS, 'text');
  cap.setAttribute('x', '100');
  cap.setAttribute('y', '112');
  cap.setAttribute('text-anchor', 'middle');
  cap.setAttribute('font-size', '12');
  cap.setAttribute('font-weight', '700');
  cap.setAttribute('fill', band.colour);
  cap.textContent = band.label;
  svg.appendChild(cap);

  return svg;
}

function sparkline(points) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 240 56');
  svg.setAttribute('width', '100%');
  svg.setAttribute('aria-hidden', 'true');
  const min = Math.min(...points.map(p => p.score));
  const max = Math.max(...points.map(p => p.score));
  const span = Math.max(1, max - min);
  const step = points.length > 1 ? 240 / (points.length - 1) : 240;
  const d = points.map((p, i) => {
    const x = i * step;
    const y = 50 - ((p.score - min) / span) * 40;
    return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }).join(' ');
  const line = document.createElementNS(NS, 'path');
  line.setAttribute('d', d);
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'var(--coral)');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(line);
  return svg;
}

export function creditScreen() {
  const score = creditScore();
  const band = creditBand(score);
  const days = creditUpdatedDays();
  const body = el('div');

  const card = el('div', 'card');
  card.style.textAlign = 'center';
  card.appendChild(gauge(score));
  const scale = el('div', 'hint');
  scale.textContent = '0 to 999 · ' + band.label;
  scale.style.color = band.colour;
  card.appendChild(scale);
  const upd = el('div', 'hint');
  upd.textContent = days === 0 ? 'Updated today' : 'Updated ' + days + (days === 1 ? ' day ago' : ' days ago');
  card.appendChild(upd);
  body.appendChild(card);

  const refresh = el('button', 'btn btn--ghost btn--sm btn--block', 'Check for an update');
  refresh.onclick = () => {
    const delta = creditRefresh();
    toast(delta === 0 ? 'No change' : (delta > 0 ? 'Up ' + delta + ' points' : 'Down ' + Math.abs(delta) + ' points'));
    rerender();
  };
  body.appendChild(refresh);

  body.appendChild(section('Last 12 months'));
  const trend = el('div', 'card');
  trend.appendChild(sparkline(creditHistory().slice(-12)));
  body.appendChild(trend);

  body.appendChild(list([
    row({title: 'Full credit report', sub: 'Accounts, searches and public info',
      onClick: () => { location.hash = '#/credit-report'; }})
  ]));

  body.appendChild(section('What is helping and hurting'));
  const l = el('div', 'list list--boxed');
  for (const f of CREDIT_FACTORS) {
    const r = row({
      title: f.label, sub: f.note, chev: false,
      value: f.impact === 'good' ? '↑' : '↓'
    });
    const v = r.querySelector('.row__v');
    if (v) v.style.color = f.impact === 'good' ? 'var(--green)' : 'var(--red)';
    l.appendChild(r);
  }
  body.appendChild(l);

  const tips = el('button', 'btn btn--ghost btn--block', 'How to improve it');
  tips.onclick = () => tipsSheet();
  body.appendChild(tips);

  const foot = el('p', 'hint');
  foot.textContent = 'Score from TransUnion. Checking it here is a soft search and never affects your score.';
  body.appendChild(foot);

  return screen('credit', {title: 'Credit score', back: '#/borrowing', body});
}

function tipsSheet() {
  const body = el('div');
  const l = el('div', 'list list--boxed');
  for (const t of CREDIT_TIPS) l.appendChild(row({title: t, chev: false}));
  body.appendChild(l);
  body.appendChild(el('p', 'hint', 'Changes usually take one to two months to reach your score.'));
  sheet({title: 'Improve your score', body});
}

export function creditReportScreen() {
  const rep = state.credit.report;
  const body = el('div');

  const top = el('div', 'card');
  top.appendChild(el('div', 'lts__l', 'Report updated'));
  top.appendChild(el('div', 'lts__v', dateStr(state.credit.updated)));
  top.appendChild(el('div', 'hint', 'Provided by TransUnion'));
  body.appendChild(top);

  body.appendChild(section('Electoral roll'));
  body.appendChild(list([
    row({title: 'Current address', sub: 'Since ' + dateStr(new Date(rep.electoral.since).getTime()),
      value: 'Registered', chev: false})
  ]));

  body.appendChild(section('Accounts'));
  const al = el('div', 'list list--boxed');
  for (const a of rep.accounts) {
    al.appendChild(row({
      title: a.name, sub: a.type + ' · opened ' + dateStr(new Date(a.opened).getTime()),
      value: a.status, chev: false
    }));
  }
  body.appendChild(al);

  body.appendChild(section('Searches'));
  const sl = el('div', 'list list--boxed');
  for (const s of rep.searches) {
    sl.appendChild(row({title: s.name, sub: s.type, value: dateStr(s.ts), chev: false}));
  }
  if (!rep.searches.length) sl.appendChild(empty('No searches'));
  body.appendChild(sl);

  body.appendChild(section('Public information'));
  const pl = el('div', 'list list--boxed');
  for (const p of rep.public) pl.appendChild(row({title: p.name, value: p.status, chev: false}));
  body.appendChild(pl);

  const dispute = el('button', 'btn btn--ghost btn--block', 'Dispute something');
  dispute.onclick = () => toast('Dispute started with TransUnion');
  body.appendChild(dispute);

  return screen('credit-report', {title: 'Credit report', back: '#/credit', body});
}

export function mortgageScreen() {
  const body = el('div');
  let value = 185000;
  let deposit = 22000;
  let income = 46000;
  let term = 30;

  const head = el('div', 'card');
  head.appendChild(el('div', 'lts__l', 'How much could you borrow'));
  const maxEl = el('div', 'lts__v', '£0');
  head.appendChild(maxEl);
  const sub = el('div', 'hint');
  head.appendChild(sub);
  body.appendChild(head);

  const valCard = el('div', 'card card--flat');
  valCard.appendChild(el('div', 'row__t', 'Property value'));
  const valOut = el('div', 'row__v', fmt(value));
  valCard.appendChild(valOut);
  const valSlider = el('input', 'slider');
  valSlider.type = 'range';
  valSlider.min = '50000';
  valSlider.max = '600000';
  valSlider.step = '5000';
  valSlider.value = String(value);
  valSlider.setAttribute('aria-label', 'Property value');
  valCard.appendChild(valSlider);
  body.appendChild(valCard);

  const depField = field({label: 'Deposit', input: input({type: 'number', step: '500', value: String(deposit)}), hint: 'At least ' + MIP_MIN_DEPOSIT_PCT + '% of the property value'});
  body.appendChild(depField);
  const incField = field({label: 'Household income a year', input: input({type: 'number', step: '1000', value: String(income)}), hint: 'Before tax, both incomes'});
  body.appendChild(incField);

  const termCard = el('div', 'card card--flat');
  termCard.appendChild(el('div', 'row__t', 'Term'));
  termCard.appendChild(seg(MORTGAGE_TERMS.map(t => ({label: t + 'y', value: t})), term, v => { term = v; paint(); }));
  body.appendChild(termCard);

  const quoteCard = el('div', 'card');
  const perMonth = el('div', 'lts__v');
  const quoteSub = el('div', 'hint');
  quoteCard.appendChild(el('div', 'lts__l', 'Estimated monthly'));
  quoteCard.appendChild(perMonth);
  quoteCard.appendChild(quoteSub);
  body.appendChild(quoteCard);

  const go = el('button', 'btn btn--primary btn--block', 'Get an agreement in principle');
  body.appendChild(go);

  const note = el('p', 'hint');
  note.textContent = 'An agreement in principle is not a mortgage offer. Lenders still do a full check. Borrowing ' + MIP_INCOME_MULTIPLE + '× income is a guide, not a promise.';
  body.appendChild(note);

  if (state.mip.dips.length) {
    body.appendChild(section('Your agreements'));
    const dl = el('div', 'list list--boxed');
    for (const d of state.mip.dips) {
      dl.appendChild(row({
        title: fmt(d.amount), sub: d.ref + ' · expires ' + dateStr(d.expires),
        value: d.ltv + '% LTV', onClick: () => { location.hash = '#/dip/' + d.id; }
      }));
    }
    body.appendChild(dl);
  }

  const paint = () => {
    const q = mipQuote({value, deposit, income, term});
    maxEl.textContent = fmt(q.maxLoan);
    perMonth.textContent = q.monthly ? fmt(q.monthly) + '/mo' : '—';
    quoteSub.textContent = q.monthly
      ? Math.round(q.ltvPct) + '% loan to value · ' + (q.rate * 100).toFixed(2) + '% for ' + q.term + ' years'
      : 'Add a deposit and income';
    if (!q.enough) {
      sub.textContent = q.depositPct < MIP_MIN_DEPOSIT_PCT
        ? 'Deposit needs to be ' + MIP_MIN_DEPOSIT_PCT + '% or more'
        : 'Add your income to see a figure';
      sub.style.color = 'var(--red)';
    } else if (q.capped) {
      sub.textContent = 'Capped at ' + MIP_INCOME_MULTIPLE + '× your income';
      sub.style.color = '';
    } else {
      sub.textContent = 'Based on the property and deposit';
      sub.style.color = '';
    }
    go.disabled = !q.enough;
    go.style.opacity = q.enough ? '1' : '0.5';
  };

  valSlider.oninput = () => {
    value = Number(valSlider.value);
    valOut.textContent = fmt(value);
    paint();
  };
  const depInput = depField.querySelector('input');
  const incInput = incField.querySelector('input');
  depInput.oninput = () => { deposit = Number(depInput.value) || 0; paint(); };
  incInput.oninput = () => { income = Number(incInput.value) || 0; paint(); };

  paint();

  go.onclick = () => {
    const q = mipQuote({value, deposit, income, term});
    if (!q.enough) return toast('Not enough deposit or income');
    const dip = takeDip(q);
    toast('Agreement in principle ready');
    location.hash = '#/dip/' + dip.id;
  };

  return screen('mortgage', {title: 'Mortgage in principle', back: '#/borrowing', body});
}

export function dipScreen(id) {
  const d = state.mip.dips.find(x => x.id === id);
  if (!d) return screen('dip', {title: 'Agreement', back: '#/mortgage', body: empty('Not found')});
  const expired = d.expires < Date.now();
  const body = el('div');

  const cert = el('div', 'card');
  cert.style.textAlign = 'center';
  const badge = el('div', 'pill' + (expired ? '' : ' pill--coral'), expired ? 'EXPIRED' : 'AGREED IN PRINCIPLE');
  cert.appendChild(badge);
  cert.appendChild(el('div', 'lts__v', fmt(d.amount)));
  cert.appendChild(el('div', 'row__t', 'You could borrow up to'));
  cert.appendChild(el('div', 'hint', 'Over ' + d.term + ' years · ' + d.ltv + '% loan to value'));
  cert.appendChild(el('div', 'hint', fmt(d.monthly) + ' a month at the current rate'));
  body.appendChild(cert);

  body.appendChild(list([
    row({title: 'Reference', value: d.ref, chev: false}),
    row({title: 'Issued', value: dateStr(d.ts), chev: false}),
    row({title: 'Expires', value: dateStr(d.expires), chev: false}),
    row({title: 'Applicant', value: state.user.name, chev: false})
  ]));

  const share = el('button', 'btn btn--primary btn--block', 'Share with an estate agent');
  share.onclick = () => toast('Certificate shared');
  body.appendChild(share);

  const rm = el('button', 'btn btn--ghost btn--block', 'Delete agreement');
  rm.onclick = () => confirmSheet({
    title: 'Delete agreement', text: 'You can get another one any time.', danger: true, confirm: 'Delete',
    onConfirm: () => {
      state.mip.dips = state.mip.dips.filter(x => x.id !== d.id);
      save(); toast('Deleted'); location.hash = '#/mortgage';
    }
  });
  body.appendChild(rm);

  return screen('dip-' + id, {title: 'Agreement in principle', back: '#/mortgage', body});
}

export function connectedScreen() {
  const body = el('div');

  const c = el('div', 'card');
  c.appendChild(el('div', 'lts__l', 'Connected balances'));
  c.appendChild(el('div', 'lts__v', fmt(connectedTotal())));
  c.appendChild(el('div', 'hint', 'Read only. Monzo cannot move money in these accounts.'));
  body.appendChild(c);

  if (!state.connected.length) {
    body.appendChild(empty('No accounts connected', 'Add a bank to see it alongside Monzo'));
  } else {
    body.appendChild(section('Accounts'));
    const l = el('div', 'list list--boxed');
    for (const a of state.connected) {
      const expired = connectedExpired(a);
      const days = connectedConsentDays(a);
      l.appendChild(row({
        title: a.name,
        sub: expired ? 'Access expired · reconnect' : '•••• ' + a.acct.slice(-4) + ' · ' + days + ' days left',
        value: expired ? '' : fmt(a.balance),
        tile: tile(a.bankName),
        onClick: () => { location.hash = '#/connected-account/' + a.id; }
      }));
    }
    body.appendChild(l);
  }

  const add = el('button', 'btn btn--primary btn--block', 'Add an account');
  add.onclick = () => addAccountSheet();
  body.appendChild(add);

  const note = el('p', 'hint');
  note.textContent = 'Access lasts ' + CONNECT_CONSENT_DAYS + ' days, then you reconnect. You can disconnect at any time.';
  body.appendChild(note);

  return screen('connected', {title: 'Connected accounts', back: '#/account', body});
}

export function connectedAccountScreen(id) {
  const a = state.connected.find(x => x.id === id);
  if (!a) return screen('connected-account', {title: 'Account', back: '#/connected', body: empty('Not found')});
  const expired = connectedExpired(a);
  const days = connectedConsentDays(a);
  const body = el('div');

  const c = el('div', 'card');
  c.style.textAlign = 'center';
  const t = tile(a.bankName, 52);
  t.style.margin = '0 auto 12px';
  c.appendChild(t);
  c.appendChild(el('div', 'row__t', a.name));
  c.appendChild(el('div', 'lts__v', expired ? '—' : fmt(a.balance)));
  c.appendChild(el('div', 'hint', 'Sort ' + a.sort + ' · •••• ' + a.acct.slice(-4)));
  c.appendChild(el('div', 'hint', expired ? 'Access expired ' + Math.abs(days) + ' days ago' : 'Access ends in ' + days + ' days'));
  body.appendChild(c);

  if (expired) {
    const re = el('button', 'btn btn--primary btn--block', 'Reconnect to ' + a.bankName);
    re.onclick = () => reauthSheet(a.id);
    body.appendChild(re);
  } else {
    const ref = el('button', 'btn btn--ghost btn--block', 'Refresh balance');
    ref.onclick = () => {
      if (!connectedRefresh(a.id)) return toast('Reconnect first');
      toast('Refreshed');
      rerender();
    };
    body.appendChild(ref);
  }

  body.appendChild(list([
    row({title: 'Last updated', value: dayLabel(a.lastSync), chev: false}),
    row({title: 'Access ends', value: dateStr(a.consentExpires), chev: false})
  ]));

  const rm = el('button', 'btn btn--danger btn--block', 'Disconnect');
  rm.onclick = () => confirmSheet({
    title: 'Disconnect ' + a.bankName, text: 'Monzo will stop seeing this account.', danger: true, confirm: 'Disconnect',
    onConfirm: () => { connectedRemove(a.id); toast('Disconnected'); location.hash = '#/connected'; }
  });
  body.appendChild(rm);

  return screen('connected-account-' + id, {title: a.bankName, back: '#/connected', body});
}

function addAccountSheet() {
  const body = el('div');
  body.appendChild(el('p', 'hint', 'You will be sent to your bank to approve read-only access.'));
  const l = el('div', 'list list--boxed');
  const s = sheet({title: 'Add an account', body});
  for (const b of CONNECTED_BANKS) {
    if (state.connected.some(a => a.bank === b.id)) continue;
    l.appendChild(row({
      title: b.name, tile: tile(b.name), chev: false,
      onClick: () => {
        connectedAdd(b.id, b.name, 200 + Math.random() * 2400);
        s.close();
        toast(b.name + ' connected');
        location.hash = '#/connected';
      }
    }));
  }
  body.appendChild(l);
}

function reauthSheet(id) {
  const a = state.connected.find(x => x.id === id);
  if (!a) return;
  const body = el('div');
  body.appendChild(el('p', 'hint',
    'Your bank needs to confirm you still want Monzo to see ' + a.name + '. This shares a balance and the last four digits only.'));
  body.appendChild(list([
    row({title: 'Read only', sub: 'Monzo cannot move money', chev: false, value: '✓'}),
    row({title: 'Lasts ' + CONNECT_CONSENT_DAYS + ' days', sub: 'Then you reconnect again', chev: false})
  ]));
  const go = el('button', 'btn btn--primary btn--block', 'Reconnect');
  const s = sheet({title: 'Reconnect ' + a.bankName, body, foot: go});
  go.onclick = () => {
    connectedReauth(a.id);
    s.close();
    toast('Reconnected');
    rerender();
  };
}
