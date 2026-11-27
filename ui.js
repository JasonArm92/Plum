import { fmt, state } from './core.js?v=36';
import { DOMAINS, BRANDS } from './data.js?v=36';

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

export function ring(pct, size = 78, stroke = 8) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ring');
  svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('class', 'ring__bg');
  bg.setAttribute('cx', size / 2); bg.setAttribute('cy', size / 2);
  bg.setAttribute('r', r); bg.setAttribute('fill', 'none'); bg.setAttribute('stroke-width', stroke);
  const fg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  fg.setAttribute('class', 'ring__fg');
  fg.setAttribute('cx', size / 2); fg.setAttribute('cy', size / 2);
  fg.setAttribute('r', r); fg.setAttribute('fill', 'none'); fg.setAttribute('stroke-width', stroke);
  fg.setAttribute('stroke-dasharray', c);
  fg.setAttribute('stroke-dashoffset', c * (1 - Math.min(1, Math.max(0, Number(pct) || 0))));
  svg.appendChild(bg); svg.appendChild(fg);
  return svg;
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
