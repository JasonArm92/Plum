import { fmt, state } from './core.js?v=43';
import { DOMAINS, BRANDS } from './data.js?v=43';

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

export function haptic(ms = 8) {
  if (!state.settings.haptics) return;
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch {}
}

export function motionOK() {
  return !state.settings.reducedMotion;
}

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
  basket: '<path d="M4 9h16l-1.4 10.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8Z"/><path d="M8.5 9 11 3.5"/><path d="M15.5 9 13 3.5"/>',
  cutlery: '<path d="M6 3v7a2 2 0 0 0 4 0V3"/><path d="M8 12v9"/><path d="M17 3c-1.6 1.4-2.5 3.3-2.5 5.5 0 1.6.9 2.7 2.5 3v9.5"/>',
  train: '<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 10h12"/><path d="M9 19l-2 2"/><path d="M15 19l2 2"/>',
  bag: '<path d="M5 8h14l-1 12H6Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6"/><path d="M9 12h6"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16"/><path d="M16 4v16"/><path d="M3 12h18"/>',
  pill: '<rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-30 12 12)"/><path d="M9 9l6 6"/>',
  dumbbell: '<path d="M4 9v6"/><path d="M20 9v6"/><path d="M7 7v10"/><path d="M17 7v10"/><path d="M7 12h10"/>',
  house: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
  family: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3 20c0-3 2.2-5 5-5s5 2 5 5"/><path d="M14 20c0-2.2 1.2-3.7 3-3.7s3 1.5 3 3.7"/>',
  paw: '<circle cx="7" cy="9" r="2"/><circle cx="12" cy="7" r="2"/><circle cx="17" cy="9" r="2"/><path d="M12 12c3 0 5 2 5 4.2 0 2-1.8 3.3-5 3.3s-5-1.3-5-3.3C7 14 9 12 12 12Z"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>',
  arrowdown: '<path d="M12 4v14"/><path d="M6 13l6 6 6-6"/>',
  swap: '<path d="M4 8h13l-3-3"/><path d="M20 16H7l3 3"/>',
  note: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h3"/>',
  box: '<path d="M4 8l8-4 8 4v9l-8 4-8-4Z"/><path d="M4 8l8 4 8-4"/><path d="M12 12v9"/>'
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
  if (!motionOK()) f.style.transition = 'none';
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
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
  trends: '<path d="M4 17l5-6 4 3 7-8"/>',
  payments: '<path d="M4 9h13l-3-3"/><path d="M20 15H7l3 3"/>',
  borrowing: '<path d="M12 4v16"/><path d="M7 9h10"/><path d="M7 15h10"/>',
  account: '<circle cx="12" cy="9" r="3.4"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/>'
};

export function icon(name, size = 22) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
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
    b.onclick = () => { haptic(); location.hash = back; };
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
  if (onClick) r.onclick = () => { haptic(); onClick(); };
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
  if (card && card.frozen) a.style.opacity = '0.55';
  return a;
}

export function pill(text, kind = '') {
  return el('span', 'pill ' + (kind ? 'pill--' + kind : ''), text);
}

export function toast(msg, action = null, ms = 3200) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  haptic(6);
  const t = el('div', 'toast');
  if (!motionOK()) t.style.transition = 'none';
  t.appendChild(el('span', '', msg));
  if (action) {
    const b = el('button', 'toast__act');
    b.textContent = action.label;
    b.onclick = () => { action.onClick(); t.remove(); };
    t.appendChild(b);
  }
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), motionOK() ? 220 : 0); }, ms);
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
  if (!motionOK()) wrap.style.animation = 'none';
  const scrim = el('div', 'sheet__scrim');
  const panel = el('div', 'sheet__panel');
  if (!motionOK()) panel.style.animation = 'none';
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
  haptic();
  lastFocus = document.activeElement;
  document.addEventListener('keydown', keydown);
  setTimeout(() => {
    const first = panel.querySelector('input,select,textarea,button:not(.sheet__x)');
    if (first) first.focus();
  }, motionOK() ? 60 : 0);
  return {close, panel};
}

export function confirmSheet({title, text, confirm = 'Confirm', danger = false, onConfirm}) {
  const body = el('div', '', '<p class="hint">' + text + '</p>');
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
      haptic();
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
    haptic();
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
