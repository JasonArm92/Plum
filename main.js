import { load, state, runScheduled } from './core.js?v=35';
import { el, icon, toast } from './ui.js?v=35';
import {
  homeScreen, trendsScreen, trendCatScreen, paymentsScreen, payeesScreen,
  payeeScreen, sendScreen, requestScreen, bankScreen, scheduledScreen,
  borrowingScreen, accountScreen, potsScreen, potScreen
} from './screens-a.js?v=35';
import {
  txScreen, investScreen, fundScreen, pensionScreen, isaScreen, plusScreen,
  profileScreen, securityScreen, notificationsScreen, statementsScreen,
  appearanceScreen, applyTheme, aboutScreen, cardsScreen, addTxSheet
} from './screens-b.js?v=35';

const BUILD = 35;

const TABS = [
  {id: 'home', label: 'Home', icon: 'home', hash: '#/home'},
  {id: 'trends', label: 'Trends', icon: 'trends', hash: '#/trends'},
  {id: 'payments', label: 'Payments', icon: 'payments', hash: '#/payments'},
  {id: 'borrowing', label: 'Borrowing', icon: 'borrowing', hash: '#/borrowing'},
  {id: 'account', label: 'Account', icon: 'account', hash: '#/account'}
];

function view() {
  let v = document.getElementById('view');
  if (!v) {
    v = el('main');
    v.id = 'view';
    (document.getElementById('app') || document.body).appendChild(v);
  }
  return v;
}

function tabbar() {
  let t = document.getElementById('tabbar');
  if (!t) {
    t = el('nav', 'tabbar');
    t.id = 'tabbar';
    document.body.appendChild(t);
  }
  return t;
}

function renderTabs(active) {
  const bar = tabbar();
  bar.innerHTML = '';
  for (const t of TABS) {
    const b = el('button', 'tab');
    b.type = 'button';
    b.appendChild(icon(t.icon, 23));
    b.appendChild(el('span', '', t.label));
    if (t.id === active) b.setAttribute('aria-current', 'page');
    b.onclick = () => { location.hash = t.hash; };
    bar.appendChild(b);
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
  trend: a => trendCatScreen(a),
  split: () => paymentsScreen(),
  search: () => homeScreen()
};

const TAB_ROUTES = new Set(['home', 'trends', 'payments', 'borrowing', 'account']);

export function render() {
  try {
    const {route, arg} = parse();
    if (route === 'login') { login(); return; }
    const fn = SCREENS[route] || SCREENS.home;
    const v = view();
    v.innerHTML = '';
    v.appendChild(fn(arg));
    renderTabs(TAB_ROUTES.has(route) ? route : '');
    window.scrollTo(0, 0);
  } catch (err) {
    showError(err);
  }
}

function showError(err) {
  const v = view();
  v.innerHTML = '';
  const wrap = el('div', 'center');
  const inner = el('div');
  inner.appendChild(el('div', 'logo', '!'));
  inner.appendChild(el('div', 'row__t', 'Screen failed'));
  inner.appendChild(el('pre', 'errbox', String((err && (err.stack || err.message)) || err)));
  const b = el('button', 'btn btn--primary', 'Reload');
  b.style.marginTop = '16px';
  b.onclick = () => location.reload();
  inner.appendChild(b);
  const h = el('button', 'btn btn--ghost', 'Go home');
  h.style.marginTop = '8px';
  h.onclick = () => { location.hash = '#/home'; render(); };
  inner.appendChild(h);
  wrap.appendChild(inner);
  v.appendChild(wrap);
}

function login() {
  const v = view();
  tabbar().innerHTML = '';
  v.innerHTML = '';
  const wrap = el('div', 'center');
  const inner = el('div');
  inner.appendChild(el('div', 'logo', 'M'));
  inner.appendChild(el('div', 'row__t', 'Welcome back, ' + (state.user.first || 'Jason')));
  inner.appendChild(el('p', 'hint', 'Enter your PIN to continue'));

  let entered = '';
  const dots = el('div', 'pin');
  for (let i = 0; i < 4; i++) dots.appendChild(el('div', 'pin__d'));
  inner.appendChild(dots);

  const pad = el('div', 'keypad');
  for (const k of ['1','2','3','4','5','6','7','8','9','','0','⌫']) {
    const b = el('button', 'key', k);
    if (!k) b.style.background = 'transparent';
    else b.onclick = () => press(k);
    pad.appendChild(b);
  }
  inner.appendChild(pad);

  const foot = el('p', 'hint');
  foot.style.marginTop = '16px';
  foot.textContent = 'build ' + BUILD;
  inner.appendChild(foot);

  wrap.appendChild(inner);
  v.appendChild(wrap);

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
    if (entered === (state.user.pin || '2580')) {
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

function boot() {
  try {
    load();
    applyTheme();
    runScheduled();
  } catch (err) {
    showError(err);
    return;
  }

  window.addEventListener('hashchange', render);
  document.addEventListener('render', render);

  if (!location.hash) location.hash = '#/home';
  if (!sessionStorage.getItem('monzo_auth')) location.hash = '#/login';

  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
