import * as core from './core.js?v=45';
import * as data from './data.js?v=45';
import * as ui from './ui.js?v=45';

const REQUIRED_CORE = [
  'state', 'VERSION', 'KEY', 'fmt', 'round2', 'clamp', 'uid', 'normalise', 'migrate',
  'save', 'load', 'reset', 'acc', 'bal', 'setActive',
  'onboardSet', 'onboarded', 'finishOnboard', 'setPin', 'checkPin',
  'maskEmail', 'maskPhone',
  'categories', 'catById', 'addCategory', 'updateCategory', 'removeCategory',
  'searchTx', 'pushSearch', 'clearSearches', 'recentSearches',
  'planInfo', 'PLANS', 'planHasBenefit', 'planChangeQuote', 'changePlan',
  'creditScore', 'creditBand', 'creditRefresh', 'mipQuote', 'takeDip',
  'connectedAdd', 'connectedReauth', 'connectedRemove', 'connectedTotal',
  'connectedExpired', 'flexPurchase', 'flexSettle', 'takeLoan', 'loanQuote',
  'overdraftDaily', 'addTx', 'takeFunds', 'potMove', 'budgetFor', 'setBudget',
  'totalBudget', 'addPayee', 'updatePayee', 'removePayee', 'createSplit',
  'markSplitPaid', 'investBuy', 'investSell', 'investDeposit', 'runScheduled',
  'leftToSpend', 'spentThisMonth', 'byCategory',
  'virtualCardCreate', 'virtualCardRemove', 'virtualCardFreeze',
  'virtualCardSingleUse', 'virtualCardSpend', 'canUseVirtualCards',
  'snapshot', 'restore', 'notify', 'requestNotify', 'notifyPermission',
  'statementMonths', 'statementRows', 'statementTotals', 'rand4'
];

const REQUIRED_DATA = ['CATEGORIES', 'CATEGORY_ICONS', 'CATEGORY_COLOURS', 'POT_ICONS', 'BENEFITS', 'RISK_FUNDS', 'CONNECTED_BANKS', 'CREDIT_BANDS', 'POT_EMOJI', 'NOTIFY_TYPES', 'ONBOARD_SLIDES', 'CARD_COLOURS', 'PIN_KEYS'];

const REQUIRED_UI = ['el', 'screen', 'row', 'list', 'section', 'tile', 'icon', 'catIcon', 'cardArt', 'spendBar', 'empty', 'toast', 'sheet', 'confirmSheet', 'field', 'input', 'seg', 'switchEl', 'pill', 'avatar', 'haptic', 'motionOK'];

function missing(mod, names, label) {
  return names.filter(n => !(n in mod)).map(n => label + ' is missing export: ' + n);
}

export function verify(routes) {
  const problems = [];
  problems.push(...missing(core, REQUIRED_CORE, 'core.js'));
  problems.push(...missing(data, REQUIRED_DATA, 'data.js'));
  problems.push(...missing(ui, REQUIRED_UI, 'ui.js'));

  for (const [route, fn] of Object.entries(routes)) {
    if (typeof fn !== 'function') problems.push('route "' + route + '" is not a function');
  }

  for (const c of data.CATEGORIES) {
    if (!c.icon) problems.push('category ' + c.id + ' has no icon');
    if (!c.colour) problems.push('category ' + c.id + ' has no colour');
  }
  for (const b of data.BENEFITS) {
    if (!Array.isArray(b.plans) || !b.plans.length) problems.push('benefit ' + b.id + ' has no plans');
  }
  for (const s of data.ONBOARD_SLIDES) {
    if (!s.title || !s.body || !s.art) problems.push('slide ' + s.id + ' is incomplete');
  }

  return problems;
}
