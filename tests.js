import {
  state, VERSION, KEY, fmt, round2, clamp, uid, normalise, migrate,
  snapshot, restore, acc, bal, addTx, takeFunds, potMove, totalPots,
  createSplit, splitOutstanding, flexPurchase, flexSettle, flexUsed,
  loanQuote, mipQuote, takeLoan, creditBand, byCategory, spentThisMonth,
  searchTx, pushSearch, recentSearches, addCategory, removeCategory,
  categories, catById, isCustomCategory, statementTotals, planChangeQuote,
  changePlan, virtualCardCreate, virtualCardSpend, virtualCardFreeze,
  canUseVirtualCards, notifyPermission, connectedExpired
} from './core.js?v=45';
import { el, screen, row, list, section, empty, toast, pill } from './ui.js?v=45';

const results = [];

function t(name, fn) {
  try {
    const detail = fn();
    results.push({name, pass: true, detail: detail === undefined ? '' : String(detail)});
  } catch (err) {
    results.push({name, pass: false, detail: String(err && (err.message || err))});
  }
}

function eq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error((label || 'value') + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
  return label ? label + ' = ' + JSON.stringify(actual) : '';
}

function ok(cond, label) {
  if (!cond) throw new Error(label || 'expected true');
  return label || '';
}

function near(actual, expected, tolerance, label) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error((label || 'value') + ': expected about ' + expected + ', got ' + actual);
  }
  return (label || 'value') + ' ≈ ' + actual;
}

function fresh() {
  restore({});
}

export function runTests() {
  const backup = snapshot();
  results.length = 0;

  t('round2 rounds to two places', () => eq(round2(1.005), 1.01));
  t('round2 handles junk input', () => eq(round2('nope'), 0));
  t('clamp bounds both ends', () => eq(clamp(9, 0, 5), 5) + ' / ' + eq(clamp(-3, 0, 5), 0));
  t('fmt formats negatives with a minus', () => eq(fmt(-1234.5), '-£1,234.50'));
  t('fmt with zero decimals', () => eq(fmt(12.6, {dp: 0}), '£13'));
  t('uid prefixes and varies', () => {
    const a = uid('x'), b = uid('x');
    ok(a.startsWith('x_'), 'prefix');
    ok(a !== b, 'unique');
    return a;
  });

  t('credit band lower bound', () => eq(creditBand(0).id, 'poor'));
  t('credit band boundary 438', () => eq(creditBand(438).id, 'poor'));
  t('credit band boundary 439', () => eq(creditBand(439).id, 'fair'));
  t('credit band top end', () => eq(creditBand(999).id, 'excellent'));
  t('credit band clamps overflow', () => eq(creditBand(4000).id, 'excellent'));

  t('mip caps borrowing at 4.5x income', () => {
    const q = mipQuote({value: 600000, deposit: 120000, income: 40000, term: 30});
    eq(q.maxLoan, 180000, 'maxLoan');
    ok(q.capped, 'capped flag');
    return fmt(q.maxLoan);
  });
  t('mip rejects a deposit under 10%', () => {
    const q = mipQuote({value: 200000, deposit: 15000, income: 60000, term: 30});
    eq(q.enough, false, 'enough');
    return 'deposit ' + Math.round(q.depositPct) + '%';
  });
  t('mip rates rise as loan to value rises', () => {
    const low = mipQuote({value: 200000, deposit: 100000, income: 80000, term: 30});
    const high = mipQuote({value: 200000, deposit: 20000, income: 80000, term: 30});
    ok(high.rate > low.rate, 'higher LTV rate');
    return (low.rate * 100).toFixed(2) + '% vs ' + (high.rate * 100).toFixed(2) + '%';
  });

  t('loan quote total covers the instalments', () => {
    const q = loanQuote(6000, 24);
    ok(q.per * 24 >= q.total - 0.24, 'per * months >= total');
    return fmt(q.total);
  });
  t('loan quote uses a higher APR for small amounts', () => {
    ok(loanQuote(1500, 12).apr > loanQuote(20000, 12).apr, 'small loan costs more');
    return 'ok';
  });

  t('split divides to the exact penny', () => {
    fresh();
    const tx = addTx({name: 'Meal', amount: -10, category: 'eating'});
    const people = [{id: 'a', name: 'A'}, {id: 'b', name: 'B'}, {id: 'c', name: 'C'}];
    const split = createSplit(tx.id, people);
    const sum = round2(split.people.reduce((s, p) => s + p.amount, 0));
    eq(sum, 10, 'shares sum to the bill');
    return split.people.map(p => p.amount).join(' + ');
  });
  t('split shares differ by at most a penny', () => {
    fresh();
    const tx = addTx({name: 'Meal', amount: -10, category: 'eating'});
    const people = [{id: 'a', name: 'A'}, {id: 'b', name: 'B'}, {id: 'c', name: 'C'}];
    const split = createSplit(tx.id, people);
    const amounts = split.people.map(p => p.amount);
    ok(Math.max(...amounts) - Math.min(...amounts) <= 0.01, 'spread');
    return amounts.join(' / ');
  });
  t('split outstanding drops when someone pays', () => {
    fresh();
    const tx = addTx({name: 'Meal', amount: -9, category: 'eating'});
    const split = createSplit(tx.id, [{id: 'a', name: 'A'}]);
    eq(splitOutstanding(split), 9);
    split.people[0].paid = true;
    eq(splitOutstanding(split), 0);
    return 'ok';
  });

  t('flex purchase schedules one row per month', () => {
    fresh();
    acc().balance = 5000;
    const before = state.scheduled.length;
    const r = flexPurchase(300, 3, 'Test');
    ok(r.ok, 'created');
    eq(state.scheduled.length, before + 3, 'scheduled rows');
    return '3 rows';
  });
  t('flex purchase rejects under the minimum', () => {
    fresh();
    eq(flexPurchase(50, 3, 'Test').reason, 'minimum');
    return 'blocked';
  });
  t('flex settle clears the future instalments', () => {
    fresh();
    acc().balance = 5000;
    const r = flexPurchase(300, 3, 'Settle me');
    const planId = state.flex.plans[state.flex.plans.length - 1].id;
    ok(state.scheduled.some(s => s.name === 'Flex · Settle me'), 'rows exist');
    flexSettle(planId);
    eq(state.scheduled.filter(s => s.name === 'Flex · Settle me').length, 0, 'rows left');
    eq(flexUsed(), 0, 'nothing owed');
    return 'cleared';
  });

  t('virtual card needs a qualifying plan', () => {
    fresh();
    state.plan = 'free';
    eq(canUseVirtualCards(), false);
    eq(virtualCardCreate('pot_holiday').reason, 'plan');
    state.plan = 'plus';
    eq(canUseVirtualCards(), true);
    return 'gated';
  });
  t('virtual card spends from its pot', () => {
    fresh();
    const pot = state.pots[0];
    const start = pot.saved;
    const r = virtualCardCreate(pot.id);
    ok(r.ok, 'card made');
    const spent = virtualCardSpend(r.card.id, 50);
    ok(spent.ok, 'spend ok');
    eq(pot.saved, round2(start - 50), 'pot balance');
    return fmt(pot.saved);
  });
  t('single-use card is destroyed after paying', () => {
    fresh();
    const pot = state.pots[0];
    const r = virtualCardCreate(pot.id);
    r.card.singleUse = true;
    const out = virtualCardSpend(r.card.id, 10);
    eq(out.single, true, 'single flag');
    eq(state.cards.some(c => c.id === r.card.id), false, 'card gone');
    return 'destroyed';
  });
  t('frozen card refuses payment', () => {
    fresh();
    const r = virtualCardCreate(state.pots[0].id);
    virtualCardFreeze(r.card.id);
    eq(virtualCardSpend(r.card.id, 10).reason, 'frozen');
    return 'blocked';
  });
  t('virtual card cannot overspend the pot', () => {
    fresh();
    const pot = state.pots[0];
    pot.saved = 20;
    const r = virtualCardCreate(pot.id);
    eq(virtualCardSpend(r.card.id, 50).reason, 'funds');
    eq(pot.saved, 20, 'pot untouched');
    return 'blocked';
  });

  t('pot move fails when the balance is short', () => {
    fresh();
    acc().balance = 10;
    eq(potMove(state.pots[0].id, 50, 'in'), false);
    eq(totalPots(), round2(state.pots.reduce((s, p) => s + p.saved, 0)));
    return 'blocked';
  });
  t('takeFunds never overdraws', () => {
    fresh();
    acc().balance = 30;
    eq(takeFunds(31), false);
    eq(bal(), 30);
    eq(takeFunds(30), true);
    eq(bal(), 0);
    return 'exact';
  });

  t('custom category can be created and found', () => {
    fresh();
    const c = addCategory({name: 'Football', icon: 'dumbbell', colour: '#12a150'});
    ok(isCustomCategory(c.id), 'marked custom');
    eq(catById(c.id).name, 'Football');
    ok(categories().some(x => x.id === c.id), 'listed');
    return c.id;
  });
  t('deleting a category moves its transactions to General', () => {
    fresh();
    const c = addCategory({name: 'Football', icon: 'box', colour: '#6b6b76'});
    const tx = addTx({name: 'Season ticket', amount: -120, category: c.id});
    removeCategory(c.id);
    eq(tx.category, 'general');
    eq(isCustomCategory(c.id), false);
    return 'moved';
  });
  t('built-in categories survive a delete attempt', () => {
    fresh();
    eq(removeCategory('groceries'), false);
    ok(categories().some(c => c.id === 'groceries'), 'still there');
    return 'protected';
  });

  t('search matches a note', () => {
    fresh();
    addTx({name: 'Tesco', amount: -20, category: 'groceries', note: 'weekly shop'});
    addTx({name: 'Shell', amount: -40, category: 'transport'});
    const hits = searchTx('weekly');
    eq(hits.length, 1);
    eq(hits[0].name, 'Tesco');
    return '1 hit';
  });
  t('search direction filter excludes money in', () => {
    fresh();
    addTx({name: 'Salary', amount: 2000, category: 'income'});
    addTx({name: 'Tesco', amount: -20, category: 'groceries'});
    eq(searchTx('', {dir: 'in'}).length, 1);
    eq(searchTx('', {dir: 'out'}).length, 1);
    return 'filtered';
  });
  t('recent searches dedupe and cap at eight', () => {
    fresh();
    for (let i = 0; i < 12; i++) pushSearch('term' + i);
    pushSearch('term11');
    eq(recentSearches().length, 8);
    eq(recentSearches()[0], 'term11');
    eq(recentSearches().filter(x => x === 'term11').length, 1);
    return 'capped';
  });

  t('transfers stay out of category totals', () => {
    fresh();
    addTx({name: 'Tesco', amount: -20, category: 'groceries'});
    addTx({name: 'Holiday pot', amount: -100, category: 'transfers'});
    const map = byCategory();
    eq(map.transfers, undefined);
    eq(map.groceries, 20);
    return 'excluded';
  });
  t('spent this month ignores money in', () => {
    fresh();
    const before = spentThisMonth();
    addTx({name: 'Refund', amount: 25, category: 'shopping'});
    eq(spentThisMonth(), before);
    return fmt(before);
  });

  t('statement totals reconcile', () => {
    fresh();
    const now = Date.now();
    addTx({name: 'A', amount: -30, category: 'general', ts: now - 2000});
    addTx({name: 'B', amount: -20, category: 'general', ts: now - 1000});
    const rows = state.tx.filter(t => t.ts >= now - 5000 && t.ts < now + 5000);
    const totals = statementTotals(now - 5000, now + 5000, rows);
    eq(round2(totals.opening + rows.reduce((s, t) => s + t.amount, 0)), totals.closing, 'opening + rows = closing');
    return fmt(totals.closing);
  });

  t('plan downgrade quotes a credit', () => {
    fresh();
    state.plan = 'max';
    state.plus.renews = Date.now() + 15 * 86400000;
    const q = planChangeQuote('plus');
    ok(q.downgrade, 'downgrade flag');
    ok(q.credit > 0, 'credit offered');
    eq(q.due, 0);
    return fmt(q.credit);
  });
  t('plan change moves the renewal date', () => {
    fresh();
    state.plan = 'free';
    const before = state.plus.renews;
    changePlan('plus');
    eq(state.plan, 'plus');
    ok(state.plus.renews > before, 'renewal moved');
    return 'ok';
  });

  t('snapshot and restore round-trip', () => {
    fresh();
    acc().balance = 777;
    const snap = snapshot();
    acc().balance = 1;
    restore(snap);
    eq(bal(), 777);
    return 'restored';
  });

  t('normalise rebuilds missing containers', () => {
    const n = normalise({});
    ok(Array.isArray(n.tx), 'tx');
    ok(Array.isArray(n.pots), 'pots');
    ok(Array.isArray(n.cards) && n.cards.length, 'cards');
    ok(typeof n.settings === 'object', 'settings');
    ok(typeof n.credit.score === 'number', 'credit');
    ok(n.v === VERSION, 'version stamped');
    return 'v' + n.v;
  });
  t('migrate brings an old version up to date', () => {
    const m = migrate({v: 11});
    eq(m.v, VERSION);
    return 'v11 -> v' + m.v;
  });
  t('state key follows the version', () => eq(KEY, 'monzo_v' + VERSION));
  t('connected consent expiry is detected', () => {
    fresh();
    const a = state.connected[0];
    a.consentExpires = Date.now() - 1000;
    eq(connectedExpired(a), true);
    a.consentExpires = Date.now() + 100000;
    eq(connectedExpired(a), false);
    return 'ok';
  });
  t('notification permission is a known value', () => {
    const p = notifyPermission();
    ok(['granted', 'denied', 'default', 'unsupported'].includes(p), 'unexpected: ' + p);
    return p;
  });
  t('every category has an icon and a colour', () => {
    for (const c of categories()) {
      ok(!!c.icon, c.id + ' icon');
      ok(!!c.colour, c.id + ' colour');
    }
    return categories().length + ' categories';
  });

  restore(backup);
  return results;
}

export function testsScreen() {
  const body = el('div');
  const run = runTests();
  const passed = run.filter(r => r.pass).length;
  const failed = run.length - passed;

  const head = el('div', 'card');
  head.appendChild(pill(failed ? 'FAILING' : 'ALL PASSING', failed ? 'coral' : 'green'));
  head.appendChild(el('div', 'row__t', passed + ' of ' + run.length + ' passing'));
  head.appendChild(el('div', 'hint', failed
    ? failed + ' assertion' + (failed === 1 ? '' : 's') + ' failed. The detail is under each one.'
    : 'Every assertion passed. Your data was restored afterwards.'));
  body.appendChild(head);

  const again = el('button', 'btn btn--primary btn--block', 'Run again');
  again.onclick = () => document.dispatchEvent(new CustomEvent('render'));
  body.appendChild(again);

  const fails = run.filter(r => !r.pass);
  if (fails.length) {
    body.appendChild(section('Failures'));
    const fl = el('div', 'list list--boxed');
    for (const r of fails) {
      const rowEl = el('div', 'tres tres--fail');
      rowEl.appendChild(el('span', 'tres__mark', '✕'));
      const main = el('div', 'tres__name');
      main.appendChild(el('div', '', r.name));
      main.appendChild(el('div', 'tres__detail', r.detail));
      rowEl.appendChild(main);
      fl.appendChild(rowEl);
    }
    body.appendChild(fl);
  }

  body.appendChild(section('All assertions'));
  const l = el('div', 'list list--boxed');
  for (const r of run) {
    const rowEl = el('div', 'tres ' + (r.pass ? 'tres--pass' : 'tres--fail'));
    rowEl.appendChild(el('span', 'tres__mark', r.pass ? '✓' : '✕'));
    const main = el('div', 'tres__name');
    main.appendChild(el('div', '', r.name));
    if (r.detail) main.appendChild(el('div', 'tres__detail', r.detail));
    rowEl.appendChild(main);
    l.appendChild(rowEl);
  }
  body.appendChild(l);

  body.appendChild(el('p', 'hint', 'Tests run against a throwaway copy of the state, so nothing you have done is lost.'));

  return screen('tests', {title: 'Tests', back: '#/settings-about', body});
}
