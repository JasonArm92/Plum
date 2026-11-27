import { fmt, state } from './core.js?v=38';
import { DOMAINS, BRANDS } from './data.js?v=38';

export const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};

export const on = (id, fn) => {
  const n = typeof id === 'string' ? document.getElementById(id) : id;
  if (n) n.addEventListener('click', fn);
  return n;
};

export function initials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  const a = words[0] ? words[0].charAt(0) : '';
  const b = words[1] ? words[1].charAt(0) : (words[0] ? words[0].charAt(1) : '');
  return (a + b).toUpperCase() || '?';
}

export function colourFor(name = '') {
  const key = String(name).toLowerCase().split(/\s+/)[0];
  if (!key) return '#6b6b76';
  const hit = Object.keys(BRANDS).find(k => key.includes(k) || k.includes(key));
  return hit ? BRANDS[hit] : '#6b6b76';
}

export function domainFor(name = '') {
  const low = String(name).toLowerCase();
  if (!low) return null;
  const hit = Object.keys(DOMAINS).find(k => new RegExp('\\b' + k + '\\b').test(low));
  return hit ? DOMAINS[hit] : null;
}

export function logoSources(name = '') {
  const d = domainFor(name);
  if (!d) return [];
  return [
    'https://logo.clearbit.com/' + d,
    'https://www.google.com/s2/favicons?sz=128&domain=' + d,
    'https://icon.horse/icon/' + d,
    'https://icons.duckduckgo.com/ip3/' + d + '.ico'
  ];
}

export function tile(name, size = 42) {
  const wrap = el('span', 'tile');
  wrap.style.width = size + 'px';
  wrap.style.height = size + 'px';
  wrap.style.background = colourFor(name);
  const ini = el('span', 'tile__ini', initials(name));
  ini.style.fontSize = Math.round(size / 3.4) + 'px';
  wrap.appendChild(ini);
  const srcs = logoSources(name);
  if (srcs.length) {
    let i = 0;
    const img = new Image();
    img.className = 'tile__img';
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {
      i++;
      if (i < srcs.length) img.src = srcs[i];
      else img.remove();
    };
    img.onload = () => { ini.style.display = 'none'; };
    img.src = srcs[0];
    wrap.appendChild(img);
  }
  return wrap;
}

const CAT_ICONS = {
  basket: '<path d="M4 9h16l-1.6 9.2a1.5 1.5 0 0 1-1.5 1.3H7.1a1.5 1.5 0 0 1-1.5-1.3L4 9z"/><path d="M8.5 9L11 3.5M15.5 9L13 3.5"/>',
  cutlery: '<path d="M7 3v7a2 2 0 0 0 4 0V3"/><path d="M9 12v9"/><path d="M16.5 3c-1.4 1.6-2 3.6-2 5.6 0 1.6.8 2.6 2 2.9V21"/>',
  train: '<rect x="5" y="3" width="14" height="13" rx="3"/><path d="M5 10h14"/><path d="M9 16l-2 4M15 16l2 4"/><circle cx="9" cy="13" r=".8"/><circle cx="15" cy="13" r=".8"/>',
  bag: '<path d="M5 8h14l-1.2 12.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M8 5v14M16 5v14M3 12h18"/>',
  pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)"/><path d="M9 9.5l6 5"/>',
  dumbbell: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
  house: '<path d="M4 11l8-6.5 8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/>',
  family: '<circle cx="9" cy="8" r="2.6"/><circle cx="16" cy="9" r="2"/><path d="M4 19c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5"/><path d="M14.5 19c0-2.2 1.1-3.6 2.8-3.6 1.8 0 3.2 1.4 3.2 3.6"/>',
  paw: '<ellipse cx="7" cy="9" rx="1.9" ry="2.4"/><ellipse cx="12" cy="7" rx="1.9" ry="2.6"/><ellipse cx="17" cy="9" rx="1.9" ry="2.4"/><path d="M12 12c-2.6 0-4.6 1.9-4.6 4 0 1.7 1.4 2.6 3 2.2 1-.3 2.1-.3 3.1 0 1.6.4 3-.5 3-2.2 0-2.1-2-4-4.5-4z"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18"/>',
  arrowdown: '<path d="M12 4v13M6 12l6 6 6-6"/>',
  swap: '<path d="M4 8h13M14 5l3 3-3 3"/><path d="M20 16H7M10 13l-3 3 3 3"/>',
  note: '<rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2.4"/>',
  box: '<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>'
};

export function catIcon(name, size = 30, colour = '#6b6b76') {
  const wrap = el('span', 'cico');
  wrap.style.width = size + 'px';
  wrap.style.height = size + 'px';
  wrap.style.background = colour + '1f';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', colour);
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = CAT_ICONS[name] || CAT_ICONS.box;
  wrap.appendChild(svg);
  return wrap;
}

export function spendBar(pct, over = false) {
  const b = el('div', 'bar');
  b.setAttribute('role', 'progressbar');
  b.setAttribute('aria-valuemin', '0');
  b.setAttribute('aria-valuemax', '100');
  b.setAttribute('aria-valuenow', String(Math.round(Math.min(1, Math.max(0, pct)) * 100)));
  const f = el('div', 'bar__f' + (over ? ' bar__f--over' : ''));
  f.style.width = Math.min(100, Math.max(0, pct * 100)) + '%';
  b.appendChild(f);
  return b;
}

export function avatar(size = 36) {
  const a = el('span', 'avatar');
  a.style.width = a.style.height = size + 'px';
  a.textContent = initials(state.user.name);
  return a;
}

const ICONS = {
  back: '<path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  chev: '<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  search: '<circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  home: '<path d="M4 11l8-6.5 8 6.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linejoin="round"/>',
  trends: '<path d="M4 18l5-6 4 3 7-9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 6h-4M20 6v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  payments: '<path d="M4 8h16M4 8l3-3M20 16H4m16 0l-3 3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  borrowing: '<rect x="3.5" y="6" width="17" height="12" rx="2.5" stroke="currentColor" stroke-width="1.9" fill="none"/><path d="M3.5 10h17" stroke="currentColor" stroke-width="1.9"/>',
  account: '<circle cx="12" cy="8.5" r="3.5" stroke="currentColor" stroke-width="1.9" fill="none"/><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linecap="round"/>'
};

export function icon(name, size = 22) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name] || '';
  return svg;
}

export function header({title = '', back = null, actions = []} = {}) {
  const h = el('header', 'hdr');
  if (back !== null) {
    const b = el('button', 'hdr__btn');
    b.type = 'button';
    b.setAttribute('aria-label', 'Back');
    b.appendChild(icon('back', 18));
    b.onclick = () => { location.hash = back; };
    h.appendChild(b);
  }
  const t = el('div', 'hdr__title');
  t.textContent = title;
  h.appendChild(t);
  for (const a of actions) {
    const b = el('button', 'hdr__btn');
    b.type = 'button';
    if (a.id) b.id = a.id;
    b.setAttribute('aria-label', a.label || '');
    if (a.icon) b.appendChild(icon(a.icon, 18));
    if (a.text) b.textContent = a.text;
    if (a.onClick) b.onclick = a.onClick;
    h.appendChild(b);
  }
  return h;
}

export function screen(id, {title = '', back = null, actions = [], body = null, flush = false} = {}) {
  const s = el('section', 'screen');
  s.id = 'screen-' + id;
  if (title || back !== null || actions.length) {
    s.appendChild(header({title, back, actions}));
  }
  const b = el('div', 'screen__body' + (flush ? ' screen__body--flush' : ''));
  if (typeof body === 'string') b.innerHTML = body;
  else if (body) b.appendChild(body);
  s.appendChild(b);
  return s;
}

export function row({title = '', sub = '', value = '', chev = true, tile: t = null, onClick = null, cls = ''}) {
  const r = el(onClick ? 'button' : 'div', 'row ' + cls);
  if (onClick) r.type = 'button';
  if (t) r.appendChild(t);
  const m = el('div', 'row__main');
  m.appendChild(el('div', 'row__t', title));
  if (sub) m.appendChild(el('div', 'row__s', sub));
  r.appendChild(m);
  if (value !== '') r.appendChild(el('div', 'row__v', value));
  if (chev) {
    const c = icon('chev', 16);
    c.classList.add('row__chev');
    r.appendChild(c);
  }
  if (onClick) r.onclick = onClick;
  return r;
}

export function empty(title, sub = '', action = null) {
  const e = el('div', 'empty');
  e.appendChild(el('div', 'empty__t', title));
  if (sub) e.appendChild(el('div', '', sub));
  if (action) {
    const b = el('button', 'btn btn--primary btn--sm');
    b.textContent = action.label;
    b.style.marginTop = '16px';
    b.onclick = action.onClick;
    e.appendChild(b);
  }
  return e;
}

export function cardArt(card, onClick = null) {
  const a = el(onClick ? 'button' : 'div', 'cardart');
  if (onClick) { a.type = 'button'; a.onclick = onClick; }
  const top = el('div', 'cardart__top');
  top.appendChild(el('div', 'cardart__chip'));
  top.appendChild(el('div', 'cardart__brand', 'monzo'));
  a.appendChild(top);
  a.appendChild(el('div', 'cardart__num', '•••• •••• •••• ' + ((card && card.last4) || '4821')));
  const bottom = el('div', 'cardart__row');
  bottom.appendChild(el('span', '', String(state.user.name || '').toUpperCase()));
  const dots = el('div', 'cardart__dots');
  dots.appendChild(el('i')); dots.appendChild(el('i'));
  bottom.appendChild(dots);
  a.appendChild(bottom);
  return a;
}

export function pill(text, kind = '') {
  return el('span', 'pill ' + (kind ? 'pill--' + kind : ''), text);
}

export function toast(msg, action = null, ms = 3200) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const t = el('div', 'toast');
  t.appendChild(el('span', '', msg));
  if (action) {
    const b = el('button', 'toast__act');
    b.textContent = action.label;
    b.onclick = () => { action.onClick(); t.remove(); };
    t.appendChild(b);
  }
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 220); }, ms);
}

let openSheets = 0;
let lastFocus = null;

export function sheet({title = '', body = null, foot = null, onClose = null}) {
  const host = document.getElementById('sheets');
  if (!host) return {close(){}, panel: document.body};
  const wrap = el('div', 'sheet');
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', title || 'Sheet');
  const scrim = el('div', 'sheet__scrim');
  const panel = el('div', 'sheet__panel');
  panel.appendChild(el('div', 'sheet__grab'));

  const close = () => {
    wrap.remove();
    openSheets--;
    document.removeEventListener('keydown', keydown);
    if (!openSheets && lastFocus && lastFocus.focus) lastFocus.focus();
    if (onClose) onClose();
  };

  const keydown = e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const f = panel.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  scrim.onclick = close;
  const hdr = el('div', 'sheet__hdr');
  hdr.appendChild(el('div', 'sheet__title', title));
  const x = el('button', 'sheet__x');
  x.type = 'button';
  x.setAttribute('aria-label', 'Close');
  x.appendChild(icon('close', 16));
  x.onclick = close;
  hdr.appendChild(x);
  panel.appendChild(hdr);

  const b = el('div', 'sheet__body');
  if (typeof body === 'string') b.innerHTML = body;
  else if (body) b.appendChild(body);
  panel.appendChild(b);

  if (foot) {
    const f = el('div', 'sheet__foot');
    if (typeof foot === 'string') f.innerHTML = foot;
    else f.appendChild(foot);
    panel.appendChild(f);
  }

  wrap.appendChild(scrim);
  wrap.appendChild(panel);
  host.appendChild(wrap);
  openSheets++;
  lastFocus = document.activeElement;
  document.addEventListener('keydown', keydown);
  setTimeout(() => {
    const first = panel.querySelector('input,select,textarea,button:not(.sheet__x)');
    if (first) first.focus();
  }, 60);
  return {close, panel};
}

export function confirmSheet({title, text, confirm = 'Confirm', danger = false, onConfirm}) {
  const body = el('div', '', '<p class="hint" style="margin:0">' + text + '</p>');
  const btn = el('button', 'btn btn--block ' + (danger ? 'btn--danger' : 'btn--primary'));
  btn.textContent = confirm;
  const s = sheet({title, body, foot: btn});
  btn.onclick = () => { s.close(); onConfirm(); };
}

export function field({label, input, hint = ''}) {
  const f = el('label', 'field');
  f.appendChild(el('span', 'field__l', label));
  f.appendChild(input);
  if (hint) f.appendChild(el('span', 'hint', hint));
  return f;
}

export function input({id = '', type = 'text', value = '', placeholder = '', step = null, min = null, max = null}) {
  const i = el('input', 'input');
  i.type = type;
  if (id) i.id = id;
  i.value = value;
  if (placeholder) i.placeholder = placeholder;
  if (step) i.step = step;
  if (min !== null) i.min = min;
  if (max !== null) i.max = max;
  return i;
}

export function seg(options, current, onPick) {
  const s = el('div', 'seg');
  s.setAttribute('role', 'group');
  for (const o of options) {
    const b = el('button', 'seg__b');
    b.type = 'button';
    b.textContent = o.label;
    b.setAttribute('aria-pressed', String(o.value === current));
    b.onclick = () => {
      s.querySelectorAll('.seg__b').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      onPick(o.value);
    };
    s.appendChild(b);
  }
  return s;
}

export function switchEl(checked, onToggle) {
  const b = el('button', 'switch');
  b.type = 'button';
  b.setAttribute('role', 'switch');
  b.setAttribute('aria-checked', String(!!checked));
  b.onclick = () => {
    const next = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(next));
    onToggle(next);
  };
  return b;
}

export function section(title) {
  return el('div', 'sect', title);
}

export function list(children, boxed = true) {
  const l = el('div', 'list' + (boxed ? ' list--boxed' : ''));
  for (const c of children) l.appendChild(c);
  return l;
}

export function money(n, dp = 2) {
  return el('span', 'money', fmt(n, {dp}));
}
