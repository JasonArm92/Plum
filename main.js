import { load, state, runScheduled, VERSION, save } from './core.js';
import { el, icon, toast } from './ui.js';
import {
  homeScreen, trendsScreen, trendCatScreen, paymentsScreen, payeesScreen,
  payeeScreen, sendScreen, requestScreen, bankScreen, scheduledScreen,
  borrowingScreen, accountScreen, potsScreen, potScreen
} from './screens-a.js';
import {
  txScreen, investScreen, fundScreen, pensionScreen, isaScreen, plusScreen,
  profileScreen, securityScreen, notificationsScreen, statementsScreen,
  appearanceScreen, applyTheme, aboutScreen, cardsScreen, addTxSheet, cardSheet
} from './screens-b.js';

const view = document.getElementById('view');
const tabbar = document.getElementById('tabbar');

const TABS = [
  {id: 'home', label: 'Home', icon: 'home', hash: '#/home'},
  {id: 'trends', label: 'Trends', icon: 'trends', hash: '#/trends'},
  {id: 'payments', label: 'Payments', icon: 'payments', hash: '#/payments'},
  {id: 'borrowing', label: 'Borrowing', icon: 'borrowing', hash: '#/borrowing'},
  {id: 'account', label: 'Account', icon: 'account', hash: '#/account'}
];

function renderTabs(active) {
  tabbar.innerHTML = '';
  for (const t of TABS) {
    const b = el('button', 'tab');
    b.type = 'button';
    b.appendChild(icon(t.icon, 23));
    b.appendChild(el('span', '', t.label));
    if (t.id === active) b.setAttribute('aria-current', 'page');
    b.onclick = () => { location.hash = t.hash; };
    tabbar.appendChild(b);
  }
}

function parse() {
  const raw = location.hash.replace(/^#\/?/, '');
  const parts = raw.split('/').filter(Boolean);
  return {route: parts[0] || 'home', arg: parts[1] || null};
}

const SCREENS = {
  home: () => homeScreen(),
  trends: () => trendsScreen(),
  payments: () => paymentsScreen(),
  borrowing: () => borrowingScreen(),
  account: () => accountScreen(),
  pots: () => potsScreen(),
  payees: () => payeesScreen(),
  send: a => sendScreen(a),
  request: () => requestScreen(),
  bank: () => bankScreen(),
  scheduled: () => scheduledScreen(),
  invest: () => investScreen(),
  pension: () => pensionScreen(),
  isa: () => isaScreen(),
  plus: () => plusScreen(),
  profile: () => profileScreen(),
  security: () => securityScreen(),
  notifications: () => notificationsScreen(),
  statements: () => statementsScreen(),
  appearance: () => appearanceScreen(),
  about: () => aboutScreen(),
  cards: () => cardsScreen(),
  payee: a => payeeScreen(a),
  pot: a => potScreen(a),
  tx: a => txScreen(a),
  fund: a => fundScreen(a),
  'trend-cat': a => trendCatScreen(a),
  search: () => homeScreen()
};

const TAB_ROUTES = new Set(['home', 'trends', 'payments', 'borrowing', 'account']);

function render() {
  const {route, arg} = parse();
  const key = route === 'trends' && arg ? 'trend-cat' : route;
  const fn = SCREENS[key] || SCREENS.home;
  view.innerHTML = '';
  view.appendChild(fn(arg));
  renderTabs(TAB_ROUTES.has(route) ? route : '');
  window.scrollTo(0, 0);
}

function boot() {
  load();
  applyTheme();
  runScheduled();

  if (!sessionStorage.getItem('monzo_auth')) {
    location.hash = '#/login';
  }
  if (!location.hash) location.hash = '#/home';

  window.addEventListener('hashchange', () => {
    if (location.hash === '#/login') return;
    render();
  });
  document.addEventListener('render', render);

  if (location.hash === '#/login') login();
  else render();

  const plusBtn = document.getElementById('plusBtn');
  if (plusBtn) plusBtn.onclick = addTxSheet;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

/* ---------- login ---------- */

function login() {
  view.innerHTML = '';
  tabbar.innerHTML = '';
  const wrap = el('div', 'center');
  const inner = el('div');
  inner.appendChild(el('div', 'logo', 'M'));
  inner.appendChild(el('div', 'row__t', 'Welcome back, Jason'));
  inner.appendChild(el('p', 'hint', 'Enter your PIN to continue'));

  let entered = '';
  const dots = el('div', 'pin');
  for (let i = 0; i < 4; i++) dots.appendChild(el('div', 'pin__d'));
  inner.appendChild(dots);

  const pad = el('div', 'keypad');
  for (const k of ['1','2','3','4','5','6','7','8','9','','0','⌫']) {
    const b = el('button', 'key', k);
    if (!k) { b.style.background = 'transparent'; }
    else b.onclick = () => press(k);
    pad.appendChild(b);
  }
  inner.appendChild(pad);
  wrap.appendChild(inner);
  view.appendChild(wrap);

  function paint() {
    dots.querySelectorAll('.pin__d').forEach((d, i) => {
      d.classList.toggle('pin__d--on', i < entered.length);
    });
  }

  function press(k) {
    if (k === '⌫') entered = entered.slice(0, -1);
    else if (entered.length < 4) entered += k;
    paint();
    if (entered.length === 4) check();
  }

  function check() {
    if (entered === state.user.pin) {
      sessionStorage.setItem('monzo_auth', '1');
      location.hash = '#/home';
      render();
    } else {
      toast('Wrong PIN');
      entered = '';
      paint();
    }
  }
}

boot();
