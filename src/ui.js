/* src/ui.js — router, sheet, toast, charts, logo, shared components. */

import { esc, fmt, pct } from './core.js';
import { DOMAINS } from './data.js';

/* --- logo marks ------------------------------------------------------------
   A branded inline-SVG tile is always drawn first, then a real logo is layered
   over it inline-styled. If the image resolves you see the logo; if it does not
   you keep the brand-coloured tile. Chain: icon.horse → favicone → Google
   favicon. (Clearbit's public API was shut down in December 2025.) */

const ICON = 'https://icon.horse/icon/';
const FAV  = 'https://favicone.com/';
const GOOG = 'https://www.google.com/s2/favicons?sz=128&domain=';

const FUNDS = {
  iShares: 'ishares.com',
  Invesco: 'invesco.co.uk',
  'Legal & General': 'legalandgeneral.com',
  Fidelity: 'fidelity.co.uk',
  BlackRock: 'blackrock.com',
  abrdn: 'abrdn.com',
  'Scottish Widows': 'scottishwidows.co.uk'
};

export const TICKERS = {
  VUSA: 'vanguardinvestor.co.uk',
  VWRL: 'vanguardinvestor.co.uk',
  VUKE: 'vanguardinvestor.co.uk',
  VFEM: 'vanguardinvestor.co.uk',
  VHYL: 'vanguardinvestor.co.uk',
  VAGP: 'vanguardinvestor.co.uk',
  VWRP: 'vanguardinvestor.co.uk'
};

const norm = s => String(s || '')
  .toLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/\s+(retainer|dividend.*|subscription)$/, '')
  .replace(/[^a-z0-9'& ]/g, '')
  .trim();

const DOMAIN_MAP = new Map();
const addDomain = (k, v) => { if (v) DOMAIN_MAP.set(norm(k), v); };
Object.entries(DOMAINS).forEach(([k, v]) => addDomain(k, v));
Object.entries(FUNDS).forEach(([k, v]) => addDomain(k, v));
Object.entries(TICKERS).forEach(([k, v]) => addDomain(k, v));

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const DOMAIN_MATCHERS = [...DOMAIN_MAP.keys()]
  .sort((a, b) => b.length - a.length)
  .map(k => [new RegExp(`(^|[^a-z0-9])${escapeRe(k)}([^a-z0-9]|$)`), DOMAIN_MAP.get(k)]);

export function domainFor(name){
  const n = norm(name);
  if (!n) return '';
  const exact = DOMAIN_MAP.get(n);
  if (exact) return exact;
  for (const [re, domain] of DOMAIN_MATCHERS) if (re.test(n)) return domain;
  return '';
}

export function hasLogo(name){ return !!domainFor(name); }

/* --- brand colours, for the base tile -------------------------------------- */

const BRANDS = new Map();
const addBrand = (k, bg, fg) => BRANDS.set(norm(k), { bg, fg });

addBrand('Tesco', '#00539F', '#fff');
addBrand('Aldi', '#00005A', '#fff');
addBrand('Asda', '#6DBE45', '#053B2C');
addBrand('Morrisons', '#00703C', '#fff');
addBrand('Lidl', '#0050AA', '#FFDD00');
addBrand('Iceland', '#CC0000', '#fff');
addBrand('Farmfoods', '#003C71', '#fff');
addBrand("Sainsbury's", '#F06C00', '#fff');
addBrand('Costa', '#6C1D45', '#fff');
addBrand('Greggs', '#004B8D', '#fff');
addBrand('The Masham', '#5A3E2B', '#fff');
addBrand('Hope & Union', '#1F3A5F', '#fff');
addBrand('Cena', '#7A2E2E', '#fff');
addBrand('Borge', '#3B3B3B', '#fff');
addBrand('The Twisted Peel', '#4A2C6B', '#fff');
addBrand("McDonald's", '#FFC72C', '#DA291C');
addBrand('KFC', '#E4002B', '#fff');
addBrand("Domino's", '#006491', '#fff');
addBrand("Nando's", '#1A1A1A', '#E4002B');
addBrand('Stagecoach', '#00539F', '#fff');
addBrand('Arriva', '#005EB8', '#fff');
addBrand('BP', '#009B3A', '#fff');
addBrand('Shell', '#FBCE07', '#DD1D21');
addBrand('Amazon', '#FF9900', '#131A22');
addBrand('Argos', '#DA291C', '#fff');
addBrand('Matalan', '#E30613', '#fff');
addBrand('Sports Direct', '#00205B', '#fff');
addBrand('Smyths', '#003DA5', '#fff');
addBrand('Next', '#111111', '#fff');
addBrand('B&M', '#00447C', '#fff');
addBrand('Home Bargains', '#DA291C', '#fff');
addBrand('Screwfix', '#003A70', '#fff');
addBrand('Boots', '#00539B', '#fff');
addBrand('Specsavers', '#007A33', '#fff');
addBrand('PureGym', '#1A1A1A', '#fff');
addBrand('Everyone Active', '#005EB8', '#fff');
addBrand('Odeon', '#00205B', '#fff');
addBrand('Cineworld', '#00205B', '#fff');
addBrand('Steam', '#1B2838', '#66C0F4');
addBrand('Netflix', '#0B0B0B', '#E50914');
addBrand('Spotify', '#1DB954', '#0B0B0B');
addBrand('Monzo', '#FF4F40', '#fff');
addBrand('Monzo Flex', '#FF4F40', '#fff');
addBrand('Monzo Aura', '#FF4F40', '#fff');
addBrand('Monzo Loans', '#FF4F40', '#fff');
addBrand('Monzo Billsback', '#FF4F40', '#fff');
addBrand('Saving Challenge', '#FF4F40', '#fff');
addBrand('Twinkl', '#1F9BD1', '#fff');
addBrand('The Works', '#C8102E', '#fff');
addBrand('Clarks', '#4A3B2A', '#fff');
addBrand('Preston Park Museum', '#4F6B3A', '#fff');
addBrand("St Aidan's School", '#1F3A5F', '#fff');
addBrand('British Gas', '#003C71', '#fff');
addBrand('Northumbrian Water', '#005EB8', '#fff');
addBrand('Virgin Media', '#E10A0A', '#fff');
addBrand('EE', '#00A5A8', '#fff');
addBrand('Aviva', '#FFD100', '#00205B');
addBrand('Stockton Council', '#003C71', '#fff');
addBrand('Kingdom Services Group', '#00205B', '#fff');
addBrand('Vanguard', '#96151D', '#fff');
addBrand('iShares', '#111111', '#fff');
addBrand('Invesco', '#00205B', '#fff');
addBrand('Legal & General', '#00205B', '#fff');
addBrand('Fidelity', '#0B5C33', '#fff');
addBrand('BlackRock', '#111111', '#fff');
addBrand('abrdn', '#003D7C', '#fff');
addBrand('Scottish Widows', '#0B3B6F', '#fff');
addBrand('Pointens', '#00539F', '#fff');
addBrand('OpenRent', '#005EB8', '#fff');
addBrand('Blue Skies Lets', '#38A3DC', '#fff');
addBrand('Barclays', '#00AEEF', '#002D62');
addBrand('HSBC', '#DB0011', '#fff');
addBrand('Lloyds', '#006A4D', '#fff');
addBrand('NatWest', '#42145F', '#fff');
addBrand('Santander', '#EC0000', '#fff');
addBrand('Nationwide', '#00205B', '#fff');
addBrand('Starling', '#00555A', '#fff');
addBrand('Chase', '#117ACA', '#fff');
addBrand('Child Benefit', '#1D70B8', '#fff');
addBrand('Universal Credit', '#1D70B8', '#fff');
addBrand('Savings interest', '#005EA5', '#fff');
addBrand('Cash', '#6B7C8A', '#fff');
addBrand('Rainy Day', '#2F6F8F', '#fff');
addBrand('Emergency', '#8F3B2F', '#fff');
addBrand('Holiday', '#2F8F6A', '#fff');
addBrand('Rent buffer', '#6B5B2F', '#fff');
addBrand('Home education', '#4B5B8F', '#fff');
addBrand("Kids' savings", '#8F2F6A', '#fff');

const BRAND_MATCHERS = [...BRANDS.keys()]
  .sort((a, b) => b.length - a.length)
  .map(k => [new RegExp(`(^|[^a-z0-9])${escapeRe(k)}([^a-z0-9]|$)`), BRANDS.get(k)]);

const hueOf = s => {
  let h = 0;
  const t = String(s || '');
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 360;
  return h;
};

function brandOf(name){
  const n = norm(name);
  if (!n) return { bg: '#6B7C8A', fg: '#fff' };
  const exact = BRANDS.get(n);
  if (exact) return exact;
  for (const [re, brand] of BRAND_MATCHERS) if (re.test(n)) return brand;
  return { bg: `hsl(${hueOf(n)} 38% 32%)`, fg: '#fff' };
}

export function initials(name){
  const words = String(name || '').replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean);
  const a = (words[0] || '?').charAt(0) || '?';
  const b = words[1] ? words[1].charAt(0) : '';
  return (a + b).toUpperCase();
}

const IMG_STYLE = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;'
  + 'background:#fff;padding:14%;box-sizing:border-box';

export function logoHTML(name, big){
  const size = big ? 48 : 40;
  const { bg, fg } = brandOf(name);
  const mono = esc(initials(name));
  const fs = Math.round(size * (mono.length > 1 ? 0.32 : 0.42));
  const wrap = `position:relative;display:inline-flex;align-items:center;justify-content:center;`
    + `width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex:0 0 auto;background:${bg}`;
  const tile = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"`
    + ` focusable="false" style="display:block"><rect width="${size}" height="${size}" fill="${bg}"/>`
    + `<text x="50%" y="50%" dy=".36em" text-anchor="middle" fill="${fg}"`
    + ` font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-weight="700"`
    + ` font-size="${fs}" letter-spacing=".4">${mono}</text></svg>`;

  const d = domainFor(name);
  if (!d) return `<span class="lg" style="${wrap}">${tile}</span>`;
  return `<span class="lg" style="${wrap}">${tile}`
    + `<img src="${ICON}${d}" alt="" decoding="async" referrerpolicy="no-referrer"`
    + ` style="${IMG_STYLE}" data-fb="${FAV}${d}?s=128|${GOOG}${d}"></span>`;
}

export function logoEl(name, big){
  const wrap = document.createElement('span');
  wrap.innerHTML = logoHTML(name, big);
  return wrap.firstElementChild;
}

export function paintLogos(root){
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('[data-logo]').forEach(el => {
    el.replaceWith(logoEl(el.dataset.logo, el.dataset.logoBig === '1'));
  });
}

function stepDown(img){
  const chain = (img.dataset.fb || '').split('|').filter(Boolean);
  if (chain.length){
    img.dataset.fb = chain.slice(1).join('|');
    img.src = chain[0];
  } else {
    img.remove();
  }
}

document.addEventListener('error', e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.hasAttribute('data-fb')) return;
  stepDown(img);
}, true);

/* -------------------------------------------------------------------------- */

const registry = new Map();
const TABS = new Set(['home', 'save', 'grow', 'pay', 'account']);
const TITLES = {
  grow:'Grow', save:'Save', pay:'Pay', trends:'Trends', acc:'Current account', pots:'Pots',
  invest:'Investments', statements:'Statements', accounts:'Your accounts', borrow:'Borrowing',
  flex:'Monzo Flex', aura:'Monzo Aura', overdraft:'Overdraft', loans:'Loans',
  connected:'Connected accounts', credit:'Credit insights', challenge:'Saving Challenge',
  billsback:'Billsback', insurance:'Insurance', personal:'Personal details', security:'Security',
  appearance:'Appearance', cards:'Cards', plan:'Plans', limits:'Limits', payees:'Payees',
  search:'Search', notifs:'Notifications', chat:'Support', disputes:'Disputes',
  joint:'Joint account', potdetail:'Pot', txdetail:'Transaction', request:'Request money',
  backup:'Backup'
};

let cleanup = null;
let current = null;
let currentParams = {};
let mountRoot = null;
let stack = [];
let sheetOpener = null;

export function initRouter(root){ mountRoot = root; }
export function register(name, mount){ registry.set(name, mount); }
export function currentScreen(){ return current; }

const sheetEl = () => document.getElementById('sheet');

const FOCUSABLE = 'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex="-1"])';

export function sheet(html){
  const s = sheetEl();
  if (!s) return;
  const panel = s.querySelector('.panel');
  if (!panel) return;
  if (!s.classList.contains('on')) sheetOpener = document.activeElement;
  panel.innerHTML = `<div class="grab"></div>` + html;
  s.classList.add('on');
  s.setAttribute('role', 'dialog');
  s.setAttribute('aria-modal', 'true');
  if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
  const first = panel.querySelector(FOCUSABLE);
  (first || panel).focus({ preventScroll: true });
}

export function closeSheet(){
  const s = sheetEl();
  if (!s) return;
  const wasOpen = s.classList.contains('on');
  s.classList.remove('on');
  s.removeAttribute('role');
  s.removeAttribute('aria-modal');
  if (wasOpen && sheetOpener && sheetOpener.isConnected){
    try { sheetOpener.focus({ preventScroll: true }); } catch {}
  }
  sheetOpener = null;
}

function paintHeader(name){
  const sub = !TABS.has(name);
  const hdr = document.getElementById('hdr');
  if (hdr) hdr.classList.toggle('hdr--sub', sub);
  const title = document.getElementById('hdrTitle');
  if (title) title.textContent = sub ? (TITLES[name] || '') : '';
}

export function go(name, params = {}, back = false){
  const mount = registry.get(name);
  if (!mount || !mountRoot) return;

  if (!back && name !== current){
    if (TABS.has(name)) stack = [];
    else if (current) stack.push(current);
  }

  closeSheet();
  if (cleanup){ try { cleanup(); } catch {} cleanup = null; }

  const host = document.querySelector(`section[data-screen="${name}"]`);
  if (!host) return;

  document.querySelectorAll('section[data-screen]').forEach(s => {
    const on = s === host;
    s.classList.toggle('on', on);
    if (on) s.removeAttribute('aria-hidden');
    else s.setAttribute('aria-hidden', 'true');
  });
  document.querySelectorAll('.tabbar button')
    .forEach(b => b.classList.toggle('on', b.dataset.go === name));

  paintHeader(name);

  const view = document.createElement('div');
  view.className = 'view';
  view.tabIndex = -1;
  host.replaceChildren(view);

  current = name;
  currentParams = params;
  cleanup = mount(view, params) || null;
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

export function reload(){
  if (!current) return go('home');
  go(current, currentParams, true);
}

export function goBack(){
  const prev = stack.pop();
  go(prev || 'home', {}, true);
}

let toastTimer = null;
export function toast(msg){
  const t = document.getElementById('toast');
  if (!t) return;
  if (!t.hasAttribute('role')){
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.setAttribute('aria-atomic', 'true');
  }
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

export function logo(name, big){
  return logoHTML(name, big);
}

export function lineChart(host, series, opts = {}){
  if (!host || !series.length) return;
  const W = 640, H = opts.h || 160, padB = 22, padT = 10;
  const values = series.map(p => p.v);
  let min = Math.min(...values), max = Math.max(...values);
  if (max - min < 20){ const mid = (max + min) / 2; min = mid - 40; max = mid + 40; }
  const span = max - min || 1;
  const x = i => (i / (series.length - 1 || 1)) * (W - 8) + 4;
  const y = v => padT + (1 - (v - min) / span) * (H - padB - padT);
  const pts = series.map((p, i) => [x(i), y(p.v)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${H - padB} L ${pts[0][0].toFixed(1)} ${H - padB} Z`;
  const ticks = [0, 1, 2, 3].map(k => {
    const v = min + span * (k / 3);
    return `<line class="grid" x1="0" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>
      <text class="axis" x="2" y="${(y(v) - 4).toFixed(1)}">${fmt(v).replace('.00', '')}</text>`;
  }).join('');
  host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Balance over time">
    <defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FF4F40" stop-opacity=".26"/>
      <stop offset="100%" stop-color="#FF4F40" stop-opacity="0"/>
    </linearGradient></defs>${ticks}<path class="sparkfill" d="${area}"/><path class="spark" d="${line}"/></svg>`;
}

const DONUT_COLOURS = ['#FF4F40','#091723','#f5a623','#2f9e6b','#7b5cff','#00a3b4','#d9342b','#8a99a5'];
export function donut(host, parts){
  if (!host) return;
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  const R = 54, C = 2 * Math.PI * R;
  let acc = 0;
  const segs = parts.map((p, i) => {
    const len = (p.v / total) * C;
    const seg = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${DONUT_COLOURS[i % 8]}"
      stroke-width="20" stroke-dasharray="${len.toFixed(1)} ${(C - len).toFixed(1)}"
      stroke-dashoffset="${(-acc).toFixed(1)}" transform="rotate(-90 70 70)"/>`;
    acc += len;
    return seg;
  }).join('');
  host.innerHTML = `<div class="donutwrap">
    <svg viewBox="0 0 140 140" class="donutsvg" role="img" aria-label="Spending by category">${segs}</svg>
    <div class="donutlegend">${parts.map((p, i) =>
      `<div class="donutrow"><span><i style="background:${DONUT_COLOURS[i % 8]}"></i>${esc(p.k)}</span>
        <b class="rev">${fmt(p.v)}</b></div>`).join('')}</div></div>`;
}

export function heatmap(host, counts, days = 56){
  if (!host) return;
  let html = '';
  const now = new Date();
  for (let i = days - 1; i >= 0; i--){
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const v = counts[key] || 0;
    const a = v === 0 ? 0 : Math.min(1, v / 90);
    html += `<i style="background:${v ? `rgba(255,79,64,${(0.15 + a * 0.85).toFixed(2)})` : ''}"></i>`;
  }
  host.innerHTML = html;
}

export function meter(value, total, tone){
  const width = pct(value, total);
  const colour = tone || (width > 95 ? 'var(--bad)' : width > 75 ? 'var(--warn)' : 'var(--ok)');
  return `<div class="meter" role="progressbar" aria-valuenow="${Math.round(width)}"
    aria-valuemin="0" aria-valuemax="100"><i style="width:${width}%;background:${colour}"></i></div>`;
}

export function chipRow(items, active, attr){
  const activeKey = active == null ? null : String(active);
  return `<div class="pill-row">${items.map(item => {
    const value = String(typeof item === 'string' ? item : item.value);
    const label = typeof item === 'string' ? item : item.label;
    const on = value === activeKey;
    return `<button class="chip ${on ? 'on' : ''}" data-${attr}="${esc(value)}"
      aria-pressed="${on}">${esc(label)}</button>`;
  }).join('')}</div>`;
}

export function kv(k, v){
  return `<div class="kv"><span class="k">${k}</span><span class="v">${v}</span></div>`;
}
export function badge(text, tone){
  return `<span class="badge ${tone || ''}">${esc(text)}</span>`;
}
export function empty(msg){
  return `<div class="empty">${esc(msg)}</div>`;
}

export function txRow(t){
  const signed = t.amt > 0 ? '+' : '';
  return `<button class="tx" data-tx="${t.id}">
    ${logo(t.name)}
    <span class="mid"><span class="nm">${esc(t.name)}${t.receipt ? '<span class="txattach">📎</span>' : ''}</span>
      <span class="mt">${esc(t.cat)} · ${esc(t.time)}</span></span>
    <span class="amt ${t.amt > 0 ? 'in' : ''} rev">${signed}${fmt(t.amt)}</span>
  </button>`;
}

export function potRow(p, rate){
  const progress = pct(p.bal, p.goal);
  const rateNote = p.type === 'savings' && rate ? `${rate}% AER · ` : '';
  return `<button class="pot ${p.locked ? 'pot--locked' : ''}" data-pot="${p.id}">
    ${logo(p.name)}
    <span class="mid"><span class="nm">${esc(p.name)}</span>
      <span class="sub">${rateNote}${Math.round(progress)}% of ${fmt(p.goal)}</span>
      <span class="bar"><i style="width:${progress}%"></i></span></span>
    <span class="amt rev">${fmt(p.bal)}</span>
  </button>`;
}

export function accCard({ cls = '', label, meta, balance, tag, go: target }){
  return `<button class="accard ${cls}" ${target ? `data-go="${target}"` : ''}>
    <div class="accrow">
      <div><div class="accname">${label}</div><div class="accmeta">${meta}</div></div>
      ${tag || ''}
    </div>
    ${balance != null ? `<div class="balance rev">${balance}</div>` : ''}
  </button>`;
}

export function spotCard({ label, value, note, tone, go: target }){
  return `<button class="spotcard ${tone || ''}" ${target ? `data-go="${target}"` : ''}>
    <div class="st">${label}</div><div class="sv rev">${value}</div><div class="sd">${note}</div>
  </button>`;
}

export function sectionHead(title, actionLabel, actionAttrs = ''){
  return `<div class="h-sec"><h2>${esc(title)}</h2>
    ${actionLabel ? `<button ${actionAttrs}>${esc(actionLabel)}</button>` : ''}</div>`;
}

export function bindGlobalChrome(){
  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-go]');
    if (nav){ go(nav.dataset.go); return; }
    if (e.target.matches('[data-close]') || e.target.id === 'sheet' ||
        e.target.classList.contains('scrim')){
      closeSheet();
    }
  });

  document.addEventListener('keydown', e => {
    const s = sheetEl();
    if (!s || !s.classList.contains('on')) return;
    if (e.key === 'Escape'){ e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    const panel = s.querySelector('.panel');
    if (!panel) return;
    const items = [...panel.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });

  window.addEventListener('scroll', () => {
    const h = document.getElementById('hdr');
    if (h) h.classList.toggle('hdr--scrolled', window.scrollY > 4);
  }, { passive: true });
}

/* TEMP diagnostic — delete once logos work */
setTimeout(() => {
  try {
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const imgs = document.querySelectorAll('.lg img');
    const d = document.createElement('div');
    d.style.cssText = 'font:12px/1.5 monospace;background:#000;color:#0f0;padding:8px;'
      + 'white-space:pre-wrap;word-break:break-all;margin:0 0 8px';
    d.textContent = 'csp=' + (csp ? 'YES' : 'none')
      + '\nimgs=' + imgs.length
      + '\nsrc=' + (imgs[0] ? imgs[0].getAttribute('src') : 'none');
    if (csp) d.textContent += '\n' + csp.getAttribute('content');
    document.body.prepend(d);
    const t = document.getElementById('hdrTitle');
    if (t) t.textContent = 'csp=' + (csp ? 'YES' : 'none') + ' imgs=' + imgs.length;
    const p = new Image();
    p.onload = () => { d.textContent += '\nimg=OK ' + p.naturalWidth + 'px'; };
    p.onerror = () => { d.textContent += '\nimg=FAIL'; };
    p.src = 'https://icon.horse/icon/tesco.com';
    fetch('https://icon.horse/icon/tesco.com', { mode: 'no-cors' })
      .then(() => { d.textContent += '\nfetch=OK'; })
      .catch(() => { d.textContent += '\nfetch=FAIL'; });
  } catch (e) { document.title = 'diag:' + e.message; }
}, 1500);
