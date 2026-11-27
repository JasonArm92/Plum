/* src/logos.js — merchant, company and holding logo resolution.

   DOMAINS in data.js is the single source of truth for merchant → domain, so
   this module reads it rather than keeping a second copy. Resolution chain per
   name: Clearbit logo → Google favicon → the initials badge. A missing, dead
   or blocked logo therefore never leaves a hole in the list. */

import { esc } from './core.js';
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

/* Tolerates the suffixes the ledger appends to merchant names. */
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
  return (((words[0] || '?')[0] + (words[1] || '')[0]) || '?').toUpperCase();
}

/* Same .lg markup the app already uses, so styles.css keeps control of size,
   shape and spacing. */
export function logoHTML(name, big){
  const d = domainFor(name);
  const ini = esc(initials(name));
  const cls = big ? 'lg lg--lg' : 'lg';
  if (!d) return `<span class="${cls}"><span class="lg__i">${ini}</span></span>`;
  return `<span class="${cls}"><span class="lg__i">${ini}</span>`
    + `<img src="${CDN}${d}" alt="" loading="lazy" decoding="async"`
    + ` referrerpolicy="no-referrer" data-fb="${FAV}${d}"></span>`;
}

export function logoEl(name, big){
  const wrap = document.createElement('span');
  wrap.innerHTML = logoHTML(name, big);
  return wrap.firstElementChild;
}

/* Fill any [data-logo] placeholder in a freshly rendered subtree. */
export function paintLogos(root){
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('[data-logo]').forEach(el => {
    el.replaceWith(logoEl(el.dataset.logo, el.dataset.logoBig === '1'));
  });
}

/* `error` does not bubble, so it is captured: one listener serves the whole app.
   Steps down the chain, then settles on the initials badge. */
document.addEventListener('error', e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.hasAttribute('data-fb')) return;
  const next = img.dataset.fb;
  if (next){ img.removeAttribute('data-fb'); img.src = next; }
  else img.remove();
}, true);

document.addEventListener('load', e => {
  const img = e.target;
  if (img instanceof HTMLImageElement && img.parentElement?.classList.contains('lg')){
    img.classList.add('is-loaded');
  }
}, true);

if (!document.getElementById('logo-css')){
  const style = document.createElement('style');
  style.id = 'logo-css';
  style.textContent = `
.lg{position:relative;overflow:hidden}
.lg>img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;
  background:#fff;padding:12%;box-sizing:border-box;opacity:0;transition:opacity .18s ease}
.lg>img.is-loaded{opacity:1}
@media (prefers-reduced-motion:reduce){.lg>img{transition:none}}`;
  document.head.append(style);
}
