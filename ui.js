/* src/ui.js — router, sheet, toast, charts, logo, shared components.
   Knows DOM, not banking. Imports core only for formatting. */

import { esc, fmt, pct } from './core.js';
import { DOMAINS } from './data.js';

/* ---------------- router ---------------- */
const registry = new Map();
let cleanup = null;
let current = null;
let mountRoot = null;

export function initRouter(root){ mountRoot = root; }
export function register(name, mount){ registry.set(name, mount); }
export function currentScreen(){ return current; }

export function go(name, params = {}){
  const mount = registry.get(name);
  if (!mount || !mountRoot) return;
  if (cleanup){ try { cleanup(); } catch {} cleanup = null; }

  document.querySelectorAll('section[data-screen]').forEach(s =>
    s.classList.toggle('on', s.dataset.screen === name));
  document.querySelectorAll('.tabbar button').forEach(b =>
    b.classList.toggle('on', b.dataset.go === name));

  const host = document.querySelector(`section[data-screen="${name}"]`);
  if (host){
    host.innerHTML = '';
    cleanup = mount(host, params) || null;
  }
  current = name;
  window.scrollTo(0, 0);
}

/* ---------------- sheet ---------------- */
const sheetEl = () => document.getElementById('sheet');
export function sheet(html){
  const s = sheetEl();
  if (!s) return;
  s.querySelector('.panel').innerHTML = `<div class="grab"></div>` + html;
  s.classList.add('on');
}
export function closeSheet(){ sheetEl()?.classList.remove('on'); }

/* ---------------- toast ---------------- */
let toastTimer = null;
export function toast(msg){
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------------- logo ---------------- */
export function logo(name){
  const domain = DOMAINS[name];
  const initials = String(name).split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (!domain) return `<span class="lg">${esc(initials)}</span>`;
  return `<span class="lg"><img src="https://logo.clearbit.com/${domain}" alt="" loading="lazy"
    onerror="this.parentNode.textContent='${esc(initials)}'"></span>`;
}

/* ---------------- charts ---------------- */
export function lineChart(host, series, opts = {}){
  if (!host) return;
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
  host.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Chart">
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
    <svg viewBox="0 0 140 140" class="donutsvg">${segs}</svg>
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

/* ---------------- components ---------------- */
export function meter(value, total, tone){
  const width = pct(value, total);
  const colour = tone || (width > 95 ? 'var(--bad)' : width > 75 ? 'var(--warn)' : 'var(--ok)');
  return `<div class="meter"><i style="width:${width}%;background:${colour}"></i></div>`;
}

export function chipRow(items, active, attr){
  return `<div class="pill-row">${items.map(item => {
    const value = typeof item === 'string' ? item : item.value;
    const label = typeof item === 'string' ? item : item.label;
    return `<button class="chip ${value === active ? 'on' : ''}" data-${attr}="${esc(value)}">${esc(label)}</button>`;
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
    <span class="mid"><span class="nm">${esc(t.name)}</span>
      <span class="mt">${esc(t.cat)} · ${esc(t.time)}</span></span>
    <span class="amt ${t.amt > 0 ? 'in' : ''} rev">${signed}${fmt(t.amt)}</span>
  </button>`;
}

export function potRow(p, rate){
  const progress = pct(p.bal, p.goal);
  const rateNote = p.type === 'savings' && rate ? `${rate}% AER · ` : '';
  return `<button class="pot" data-pot="${p.id}">
    <span class="lg">${esc(p.name[0])}</span>
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

/* delegated global navigation + sheet dismissal */
export function bindGlobalChrome(){
  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-go]');
    if (nav){ go(nav.dataset.go); return; }
    if (e.target.matches('[data-close]') || e.target.id === 'sheet' ||
        e.target.classList.contains('scrim')) closeSheet();
  });
}
