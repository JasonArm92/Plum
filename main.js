/* src/main.js — boot: hydrate state, apply appearance, wire chrome and lock, register screens. */

import {
  load, getState, subscribe, runInterest, runTick, runScheduled, togglePriv, syncBell
} from './core.js';
import {
  initRouter, register, go, goBack, reload, closeSheet, bindGlobalChrome, toast
} from './ui.js';

import {
  mountHome, mountSave, mountGrow, mountPay, mountTrends, mountAccount, mountAcc, mountPots,
  mountPotDetail, mountInvest, mountStatements
} from './screens-a.js';

import {
  mountPayees, mountRequest, mountBackup, mountCards, mountPlan, mountLimits, mountBorrow,
  mountFlex, mountAura, mountOverdraft, mountLoans, mountConnected, mountCredit, mountChallenge,
  mountBillsback, mountInsurance, mountAccounts, mountAppearance, mountSearch, mountNotifs,
  mountChat, mountDisputes, mountJoint, mountPersonal, mountSecurity, mountTxDetail
} from './screens-b.js';

/* How long the app can sit in the background before it re-locks. */
const RELOCK_AFTER = 60 * 1000;

function applyTheme(){ document.documentElement.dataset.theme = getState().theme; }
function applyZoom(){ document.documentElement.style.setProperty('--zoom', getState().zoom); }
function applyMotion(){ document.documentElement.dataset.motion = getState().motion ? 'on' : 'off'; }
function applyPrivacy(){ document.documentElement.dataset.priv = getState().priv ? '1' : '0'; }
function applyAll(){ applyTheme(); applyZoom(); applyMotion(); applyPrivacy(); }

function paintAvatar(){
  const name = getState().profile.name;
  const el = document.getElementById('avatarBtn');
  if (el) el.textContent = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

let pinBuffer = '';
let hiddenAt = 0;

function paintDots(){
  const dots = document.getElementById('dots');
  if (!dots) return;
  dots.innerHTML = [0, 1, 2, 3]
    .map(i => `<span class="dot ${i < pinBuffer.length ? 'f' : ''}"></span>`).join('');
}

function buildKeys(){
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  const host = document.getElementById('keys');
  if (!host) return;
  host.innerHTML = keys.map(k => k === '' ? '<span></span>'
    : `<button class="key" data-k="${k}" aria-label="${k === '⌫' ? 'Delete' : k}">${k}</button>`).join('');
  host.addEventListener('click', e => {
    const btn = e.target.closest('[data-k]');
    if (!btn) return;
    const k = btn.dataset.k;
    if (k === '⌫') pinBuffer = pinBuffer.slice(0, -1);
    else if (pinBuffer.length < 4) pinBuffer += k;
    paintDots();
    if (pinBuffer.length === 4) checkPin();
  });
}

function checkPin(){
  if (pinBuffer === getState().pin) return unlock();
  const err = document.getElementById('pinErr');
  if (err) err.classList.add('on');
  pinBuffer = '';
  paintDots();
  setTimeout(() => { if (err) err.classList.remove('on'); }, 1600);
}

function unlock(){
  sessionStorage.setItem('unlocked', '1');
  document.body.classList.remove('locked');
  pinBuffer = '';
  hiddenAt = 0;
  paintDots();
  const pad = document.getElementById('pinpad');
  if (pad) pad.classList.remove('on');
  runScheduled();
  /* back where they were, not home */
  reload();
}

/* Covers the app and drops the session flag, leaving the screen mounted
   underneath so unlocking can restore it. */
function lockNow(){
  if (document.body.classList.contains('locked')) return;
  sessionStorage.removeItem('unlocked');
  closeSheet();
  document.body.classList.add('locked');
  pinBuffer = '';
  paintDots();
  showPinPad();
}

function showPinPad(){
  const pad = document.getElementById('pinpad');
  if (pad) pad.classList.add('on');
  paintDots();
}

async function biometricUnlock(){
  const s = getState();
  if (!s.credId) return showPinPad();
  try {
    await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: Uint8Array.from(atob(s.credId), c => c.charCodeAt(0)) }],
      userVerification: 'required', timeout: 60000
    } });
    unlock();
  } catch { toast('Fingerprint not recognised'); }
}

function boot(){
  load();
  runInterest();
  runTick();
  /* catch up on anything the scheduler owes since the app was last open */
  runScheduled();

  applyAll();
  paintAvatar();

  initRouter(document.getElementById('main'));
  bindGlobalChrome();

  const screens = {
    home: mountHome, save: mountSave, grow: mountGrow, pay: mountPay, trends: mountTrends,
    account: mountAccount, acc: mountAcc, pots: mountPots, potdetail: mountPotDetail,
    invest: mountInvest, statements: mountStatements, payees: mountPayees, request: mountRequest,
    backup: mountBackup, cards: mountCards, plan: mountPlan, limits: mountLimits,
    borrow: mountBorrow, flex: mountFlex, aura: mountAura, overdraft: mountOverdraft,
    loans: mountLoans, connected: mountConnected, credit: mountCredit,
    challenge: mountChallenge, billsback: mountBillsback, insurance: mountInsurance,
    accounts: mountAccounts, appearance: mountAppearance, search: mountSearch,
    notifs: mountNotifs, chat: mountChat, disputes: mountDisputes, joint: mountJoint,
    personal: mountPersonal, security: mountSecurity, txdetail: mountTxDetail
  };
  Object.entries(screens).forEach(([name, mount]) => register(name, mount));

  buildKeys();
  paintDots();

  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  on('usePin', showPinPad);
  on('bioBtn', biometricUnlock);
  on('avatarBtn', () => go('account'));
  on('bellBtn', () => go('notifs'));
  on('searchBtn', () => go('search'));
  on('backBtn', goBack);

  on('privBtn', () => {
    const on_ = togglePriv();
    applyPrivacy();
    toast(on_ ? 'Privacy mode on' : 'Privacy mode off');
  });

  document.addEventListener('click', e => {
    const node = e.target.closest('.rev');
    if (node && getState().priv) node.classList.toggle('open');
  });

  /* cross-screen delegation: rows produced by shared components */
  document.getElementById('main').addEventListener('click', e => {
    if (e.target.closest('[data-go]')) return;
    const tx = e.target.closest('[data-tx]');
    if (tx) return go('txdetail', { id: tx.dataset.tx });
    const pot = e.target.closest('[data-pot]');
    if (pot) return go('potdetail', { id: pot.dataset.pot });
  });

  subscribe(() => { paintAvatar(); applyAll(); syncBell(); });

  /* --- locking --- */
  document.addEventListener('monzo:lock', lockNow);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden'){
      hiddenAt = Date.now();
      return;
    }
    runScheduled();
    if (hiddenAt && Date.now() - hiddenAt > RELOCK_AFTER) lockNow();
    hiddenAt = 0;
  });

  /* a reload or a closed tab always needs the passcode again */
  window.addEventListener('pagehide', () => {
    sessionStorage.removeItem('unlocked');
  });

  if (sessionStorage.getItem('unlocked') === '1') document.body.classList.remove('locked');
  go('home');

  window.addEventListener('online', () => document.body.classList.remove('is-offline'));
  window.addEventListener('offline', () => document.body.classList.add('is-offline'));
  if (!navigator.onLine) document.body.classList.add('is-offline');

  if ('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js?v=20').catch(() => {});
    });
  }
}

boot();
