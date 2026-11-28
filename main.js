import { load, state, runScheduled, onboarded } from './core.js?v=45';
import { el, icon, toast } from './ui.js?v=45';
import { verify } from './verify.js?v=45';
import {
  homeScreen, trendsScreen, trendCatScreen, paymentsScreen, payeesScreen,
  payeeScreen, payeeFormScreen, sendScreen, requestScreen, bankScreen,
  scheduledScreen, borrowingScreen, accountScreen, potsScreen, potScreen,
  potCardScreen, flexScreen, flexPlanScreen, loanScreen, overdraftScreen,
  settingsScreen, settingsPersonalScreen, settingsSecurityScreen,
  settingsPreferencesScreen, settingsDocumentsScreen, settingsAboutScreen,
  categoriesScreen, categoryFormScreen
} from './screens-a.js?v=45';
import {
  txScreen, investScreen, fundScreen, pensionScreen, isaScreen, plusScreen,
  profileScreen, securityScreen, notificationsScreen, statementsScreen,
  appearanceScreen, applyTheme, aboutScreen, cardsScreen, addTxSheet, ledgerScreen,
  splitScreen, splitsScreen, splitDetailScreen, receiptScreen, virtualCardScreen
} from './screens-b.js?v=45';
import {
  creditScreen, creditReportScreen, mortgageScreen, dipScreen,
  connectedScreen, connectedAccountScreen
} from './screens-c.js?v=45';
import { searchScreen, benefitScreen, planChangeSheet } from './screens-d.js?v=45';
import {
  welcomeScreen, signupEmailScreen, signupCheckScreen, signupPhoneScreen,
  signupPinScreen, signupCardScreen, loginScreen, forgotPinScreen,
  forgotSentScreen, resetPinScreen
} from './screens-e.js?v=45';
import { helpScreen, helpTopicScreen, helpArticleScreen } from './screens-f.js?v=45';
import { testsScreen } from './tests.js?v=45';

const BUILD = 45;

const TABS = [
  {id: 'home', label: 'Home', icon: 'home', hash: '#/home'},
  {id: 'trends', label: 'Trends', icon: 'trends', hash: '#/trends'},
  {id: 'payments', label: 'Payments', icon: 'payments', hash: '#/payments'},
  {id: 'borrowing', label: 'Borrowing', icon: 'borrowing', hash: '#/borrowing'},
  {id: 'account', label: 'Account', icon: 'account', hash: '#/account'}
];

const BARE_ROUTES = new Set([
  'welcome', 'signup-email', 'signup-check', 'signup-phone', 'signup-pin',
  'signup-card', 'login', 'forgot-pin', 'forgot-sent', 'reset-pin'
]);

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
  welcome: () => welcomeScreen(),
  'signup-email': () => signupEmailScreen(),
  'signup-check': () => signupCheckScreen(),
  'signup-phone': () => signupPhoneScreen(),
  'signup-pin': () => signupPinScreen(),
  'signup-card': () => signupCardScreen(),
  login: () => loginScreen(),
  'forgot-pin': () => forgotPinScreen(),
  'forgot-sent': () => forgotSentScreen(),
  'reset-pin': () => resetPinScreen(),
  search: () => searchScreen(),
  tests: () => testsScreen(),
  help: () => helpScreen(),
  'help-topic': a => helpTopicScreen(a),
  'help-article': a => helpArticleScreen(a),
  categories: () => categoriesScreen(),
  'category-new': () => categoryFormScreen(null),
  'category-edit': a => categoryFormScreen(a),
  benefit: a => benefitScreen(a),
  pots: () => potsScreen(),
  'pot-card': a => potCardScreen(a),
  'virtual-card': a => virtualCardScreen(a),
  payees: () => payeesScreen(),
  'payee-new': () => payeeFormScreen(null),
  'payee-edit': a => payeeFormScreen(a),
  send: a => sendScreen(a),
  request: () => requestScreen(),
  bank: () => bankScreen(),
  scheduled: () => scheduledScreen(),
  flex: () => flexScreen(),
  'flex-plan': a => flexPlanScreen(a),
  loan: () => loanScreen(),
  overdraft: () => overdraftScreen(),
  credit: () => creditScreen(),
  'credit-report': () => creditReportScreen(),
  mortgage: () => mortgageScreen(),
  dip: a => dipScreen(a),
  connected: () => connectedScreen(),
  'connected-account': a => connectedAccountScreen(a),
  settings: () => settingsScreen(),
  'settings-personal': () => settingsPersonalScreen(),
  'settings-security': () => settingsSecurityScreen(),
  'settings-preferences': () => settingsPreferencesScreen(),
  'settings-documents': () => settingsDocumentsScreen(),
  'settings-about': () => settingsAboutScreen(),
  invest: () => investScreen(),
  ledger: () => ledgerScreen(),
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
  split: a => a ? splitScreen(a) : splitsScreen(),
  splits: () => splitsScreen(),
  'split-detail': a => splitDetailScreen(a),
  receipt: a => receiptScreen(a)
};

const TAB_ROUTES = new Set(['home', 'trends', 'payments', 'borrowing', 'account']);

export function render() {
  try {
    const {route, arg} = parse();
    const fn = SCREENS[route] || SCREENS.home;
    const v = view();
    v.innerHTML = '';
    v.appendChild(fn(arg));
    if (BARE_ROUTES.has(route)) tabbar().innerHTML = '';
    else renderTabs(TAB_ROUTES.has(route) ? route : '');
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

function boot() {
  try {
    load();
    applyTheme();
    runScheduled();
  } catch (err) {
    showError(err);
    return;
  }

  const problems = verify(SCREENS);
  if (problems.length) {
    showError(new Error('Build ' + BUILD + ' failed its checks:\n\n' + problems.join('\n')));
    return;
  }

  window.addEventListener('hashchange', render);
  document.addEventListener('render', render);

  if (!onboarded()) location.hash = '#/welcome';
  else if (!sessionStorage.getItem('monzo_auth')) location.hash = '#/login';
  else if (!location.hash) location.hash = '#/home';

  render();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();
