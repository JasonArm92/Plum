/* src/logos.js — merchant, company and holding logo resolution.

   DOMAINS in data.js is the single source of truth for merchant → domain, so
   this module reads it rather than keeping a second copy. Anything without a
   domain, or whose logo fails to load, falls back to the initials badge the
   app already uses, so a missing or dead logo never leaves a hole.

   Resolution chain per name: Clearbit logo → Google favicon → initials. */

import { DOMAINS } from './data.js';

/* Funds and tickers. Extend when a holding is added. */
export const TICKERS = {
  VUSA: 'vanguardinvestor.co.uk',
  VWRL: 'vanguardinvestor.co.uk',
  VUKE: 'vanguardinvestor.co.uk',
  VFEM: 'vanguardinvestor.co.uk',
  VHYL: 'vanguardinvestor.co.uk',
  VAGP: 'vanguardinvestor.co.uk',
  VWRP: 'vanguardinvestor.co.uk'
};

const CDN = 'https://logo.clearbit.com/';
const FAV = 'https://www.google.com/s2/favicons?sz=128&domain=';

const norm = s => String(s || '')
  .toLowerCase()
  .replace(/[’‘]/g, "'")
  .replace(/\s+(retainer|dividend.*|subscription)$/, '')
  .replace(/[^a-z0-9'& ]/g, '')
  .trim();

const LOOKUP = new Map();
Object.entries(DOMAINS).forEach(([k, v]) => { if (v) LOOKUP.set(norm(k), v); });
Object.entries(TICKERS).forEach(([k, v]) => { if (v) LOOKUP.set(norm(k), v); });

export function domainFor(name){
  return LOOKUP.get(norm(name)) || '';
}

export function hasLogo(name){
  return !!domainFor(name);
}

export function initials(name){
  const words = String(name || '').replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean);
  const out = ((words[0] || '?')[0] + (words[1] || '')[0] || '').toUpperCase();
  return out || '?';
}

/* HTML string form, for the template-built lists. */
export function logoHTML(name, size = 40, extra = ''){
  const d = domainFor(name);
  const i = initials(name);
  const style = `--logo-size:${size}px`;
  const cls = extra ? `logo ${extra}` : 'logo';
  if (!d) return `<span class="${cls} logo--initials" style="${style}" aria-hidden="true">${i}</span>`;
  return `<span class="${cls}" style="${style}">`
    + `<span class="logo__ini" aria-hidden="true">${i}</span>`
    + `<img class="logo__img" src="${CDN}${d}" alt="" loading="lazy" decoding="async" data-fb="${FAV}${d}">`
    + `</span>`;
}

/* Element form, for the places that build nodes directly. */
export function logoEl(name, size = 40, extra = ''){
  const wrap = document.createElement('span');
  wrap.innerHTML = logoHTML(name, size, extra);
  return wrap.firstElementChild;
}

/* Fill any [data-logo] placeholder in a freshly rendered subtree. */
export function paintLogos(root){
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('[data-logo]').forEach(el => {
    const name = el.dataset.logo;
    el.replaceWith(logoEl(name, Number(el.dataset.logoSize) || 40, el.className));
  });
}

/* `error` does not bubble, so it is captured. One listener for the whole app:
   step down the chain, then settle on the initials badge. */
document.addEventListener('error', e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('logo__img')) return;
  const chain = (img.dataset.fb || '').split('|').filter(Boolean);
  if (chain.length){
    img.dataset.fb = chain.slice(1).join('|');
    img.src = chain[0];
  } else {
    const box = img.parentElement;
    img.remove();
    if (box) box.classList.add('logo--initials');
  }
}, true);

document.addEventListener('load', e => {
  const img = e.target;
  if (img instanceof HTMLImageElement && img.classList.contains('logo__img')) img.classList.add('is-loaded');
}, true);

if (!document.getElementById('logo-css')){
  const style = document.createElement('style');
  style.id = 'logo-css';
  style.textContent = `
.logo{position:relative;display:inline-flex;align-items:center;justify-content:center;
  width:var(--logo-size,40px);height:var(--logo-size,40px);border-radius:50%;overflow:hidden;
  background:#fff;border:1px solid rgba(0,0,0,.08);flex:0 0 auto;
  font:600 calc(var(--logo-size,40px) * .38)/1 system-ui,sans-serif;color:#4a4a4a;
  text-transform:uppercase;letter-spacing:0}
.logo__img{width:100%;height:100%;object-fit:contain;padding:14%;box-sizing:border-box;
  opacity:0;transition:opacity .18s ease}
.logo__img.is-loaded{opacity:1}
.logo--initials{background:#eef1f4}
@media (prefers-reduced-motion:reduce){.logo__img{transition:none}}`;
  document.head.append(style);
}
