/* src/main.js — boot: hydrate state, apply appearance, wire chrome and lock, register screens. */

import {
  load, getState, subscribe, runInterest, runTick, togglePriv
} from './core.js';
import { initRouter, register, go, bindGlobalChrome, toast } from './ui.js';

import {
  mountHome, mountGrow, mountPay, mountTrends, mountAccount, mountAcc, mountPots,
  mountPotDetail, mountInvest, mountStatements
} from './screens-a.js';

import {
  mountPayees, mountCards, mountPlan, mountLimits, mountBorrow, mountFlex, mountAura,
  mountOverdraft, mountLoans, mountConnected, mountCredit, mountChallenge, mountBillsback,
  mountInsurance, mountAccounts, mountAppearance, mountSearch, mountNotifs, mountChat,
  mountDisputes, mountJoint, mountPersonal, mountSecurity, mountTxDetail
} from './screens-b.js';

/* ---------------- appearance ---------------- */
function applyTheme(){ document.documentElement.dataset.theme = getState().theme; }
function applyZoom(){ document.documentElement.style.setProperty('--zoom', getState().zoom); }
function applyMotion(){ document.documentElement.dataset.motion = getState().motion ? 'on' : 'off'; }
function applyPrivacy(){ document.documentElement.dataset.priv = getState().priv ? '1' : '0'; }
function applyAll(){ applyTheme(); applyZoom(); applyMotion(); applyPrivacy(); }

function paintAvatar(){
  const s = getState();
  document.getElementById('avatarBtn').textContent =
    s.profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('hName').textContent = s.profile.name.split(' ')[0];
}

/* ---------------- lock ---------------- */
let pinBuffer = '';

function paintDots(){
  const dots = document.getElementById('dots');
  if (!dots) return;
  dots.innerHTML = [0, 1, 2, 3]
    .map(i => `<span class="dot ${i < pinBuffer.length ? 'f' : ''}"></span>`).join('');
}

function buildKeys(){
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  const host = document.getElementById('keys');
  host.innerHTML = keys.map(k => k === '' ? '<span></span>'
    : `<button class="key" data-k="${k}">${k}</button>`).join('');
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
  err.classList.add('on');
  pinBuffer = '';
  paintDots();
  setTimeout(() => err.classList.remove('on'), 1600);
}

function unlock(){
  sessionStorage.setItem('unlocked', '1');
  document.body.classList.remove('locked');
  pinBuffer = '';
  paintDots();
  document.getElementById('pinpad').classList.remove('on');
  go('home');
}

function showPinPad(){
  document.getElementById('pinpad').classList.add('on');
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

/* ---------------- boot ---------------- */
function boot(){
  load();

  /* monthly money movements — interest on savings pots, flex instalments,
     loan repayments. Both are idempotent per calendar month. */
  runInterest();
  runTick();

  applyAll();
  paintAvatar();

  initRouter(document.getElementById('main'));
  bindGlobalChrome();

  const screens = {
    home: mountHome, grow: mountGrow, pay: mountPay, trends: mountTrends, account: mountAccount,
    acc: mountAcc, pots: mountPots, potdetail: mountPotDetail, invest: mountInvest,
    statements: mountStatements, payees: mountPayees, cards: mountCards, plan: mountPlan,
    limits: mountLimits, borrow: mountBorrow, flex: mountFlex, aura: mountAura,
    overdraft: mountOverdraft, loans: mountLoans, connected: mountConnected, credit: mountCredit,
    challenge: mountChallenge, billsback: mountBillsback, insurance: mountInsurance,
    accounts: mountAccounts, appearance: mountAppearance, search: mountSearch,
    notifs: mountNotifs, chat: mountChat, disputes: mountDisputes, joint: mountJoint,
    personal: mountPersonal, security: mountSecurity, txdetail: mountTxDetail
  };
  Object.entries(screens).forEach(([name, mount]) => register(name, mount));

  buildKeys();
  paintDots();

  document.getElementById('usePin').onclick = showPinPad;
  document.getElementById('bioBtn').onclick = biometricUnlock;
  document.getElementById('avatarBtn').onclick = () => go('account');
  document.getElementById('bellBtn').onclick = () => go('notifs');

  document.getElementById('privBtn').onclick = () => {
    const on = togglePriv();
    applyPrivacy();
    toast(on ? 'Privacy mode on' : 'Privacy mode off');
  };

  document.addEventListener('click', e => {
    const node = e.target.closest('.rev');
    if (node && getState().priv) node.classList.toggle('open');
  });

  /* row navigation — skipped when a data-go ancestor already navigated */
  document.getElementById('main').addEventListener('click', e => {
    if (e.monzoHandled || e.target.closest('[data-go]')) return;
    const tx = e.target.closest('[data-tx]');
    if (tx) return go('txdetail', { id: tx.dataset.tx });
    const pot = e.target.closest('[data-pot]');
    if (pot) return go('potdetail', { id: pot.dataset.pot });
  });

  subscribe(() => { paintAvatar(); applyAll(); });

  if (sessionStorage.getItem('unlocked') === '1') document.body.classList.remove('locked');
  go('home');

  window.addEventListener('online', () => document.body.classList.remove('is-offline'));
  window.addEventListener('offline', () => document.body.classList.add('is-offline'));
  if (!navigator.onLine) document.body.classList.add('is-offline');

  if ('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js?v=12').catch(() => {});
    });
  }
}

boot();
