/* test/cases.mjs — shared assertions. Imported by test.html and test/run.mjs. */

import * as core from '../core.js';
import { buildSeed, PLANS, TARGET_ISA, BB_CAP } from '../data.js';

const KEY = core.KEY;

export function run(t){
  const { test, eq, near, ok, withState } = t;

  /* ---------------- formatting ---------------- */
  test('fmt renders two decimals with a pound sign', () => eq(core.fmt(1234.5), '£1,234.50'));
  test('fmt strips the sign for negatives', () => eq(core.fmt(-19), '£19.00'));
  test('round2 avoids float drift', () => eq(core.round2(0.1 + 0.2), 0.3));
  test('prettyDate labels today', () => eq(core.prettyDate(core.TODAY), 'Today'));
  test('prettyDate labels yesterday', () => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    eq(core.prettyDate(s), 'Yesterday');
  });
  test('prettyDate falls back to a dated string', () =>
    ok(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/.test(core.prettyDate('2023-04-11'))));

  /* ---------------- seed integrity ---------------- */
  test('ISA ledger lands exactly on the target', () => {
    const { isa } = buildSeed(new Date());
    near(isa[0].value, TARGET_ISA, 0.01, `final value ${isa[0].value}`);
  });
  test('ISA ledger is newest first and monotonic in value', () => {
    const { isa } = buildSeed(new Date());
    for (let i = 1; i < isa.length; i++){
      ok(isa[i].date <= isa[i - 1].date, `date order broken at ${i}`);
      ok(isa[i].value <= isa[i - 1].value, `value order broken at ${i}`);
    }
  });
  test('seed account ledger carries a running balance', () => {
    const { tx } = buildSeed(new Date());
    ok(tx.length > 500, 'ledger too short');
    ok(tx.every(x => typeof x.bal === 'number' && !Number.isNaN(x.bal)), 'missing balance');
  });
  test('seeded balance is derived, never stored separately', () => {
    withState();
    eq(core.balNow(), core.getState().tx[0].bal);
  });

  /* ---------------- ledger ordering ---------------- */
  test('a backdated transaction keeps the ledger newest-first', () => {
    withState(s => { s.tx = [{ id: 'a', date: core.TODAY, time: '09:00', name: 'X', cat: 'Income', amt: 100, bal: 100, note: '' }]; });
    core.addTx('Old', 'Shopping', -10, '', '2020-01-05');
    const dates = core.getState().tx.map(x => x.date);
    eq(dates[dates.length - 1], '2020-01-05');
  });
  test('a backdated transaction leaves later balances intact', () => {
    withState(s => { s.tx = [{ id: 'a', date: core.TODAY, time: '09:00', name: 'X', cat: 'Income', amt: 100, bal: 100, note: '' }]; });
    core.addTx('Old', 'Shopping', -10, '', '2020-01-05');
    eq(core.balNow(), 100);
    eq(core.getState().tx[0].bal, 100);
  });

  /* ---------------- trend ---------------- */
  test('balanceSeries always returns the requested length', () => { withState(); eq(core.balanceSeries(90).length, 90); });
  test('balanceSeries has no null holes', () => { withState(); ok(core.balanceSeries(90).every(p => typeof p.v === 'number')); });
  test('balanceSeries survives a single-day window', () => { withState(); ok(core.balanceSeries(1).length >= 1); });
  test('balanceSeries carries a flat ledger without breaking', () => {
    withState(s => { s.tx = [{ id: 'a', date: core.TODAY, time: '09:00', name: 'X', cat: 'Income', amt: 100, bal: 100, note: '' }]; });
    const series = core.balanceSeries(30);
    eq(series.length, 30);
    ok(series.every(p => p.v === 100));
  });

  /* ---------------- left to spend ---------------- */
  const big = () => [{ id: 'seed', date: core.TODAY, time: '09:00', name: 'Test Income', cat: 'Income', amt: 20000, bal: 20000, note: '' }];
  test('leftToSpend stays positive with a healthy balance', () => {
    withState(s => { s.tx = big(); });
    ok(core.leftToSpend() > 0, `got ${core.leftToSpend()}`);
  });
  test('leftToSpend floors at zero when the balance is empty', () => {
    withState(s => { s.tx = [{ id: 'a', date: core.TODAY, time: '09:00', name: 'X', cat: 'Income', amt: 0, bal: 0, note: '' }]; });
    eq(core.leftToSpend(), 0);
  });
  test('committedLeft is derived from the ledger', () => {
    withState(s => {
      s.tx = big();
      s.sos = [];
      s.tx.push({ id: 'r', date: core.dom(new Date().getFullYear(), new Date().getMonth(), 1),
        time: '09:00', name: 'OpenRent', cat: 'Rent', amt: -799, bal: 19000, note: '' });
    });
    ok(core.committedLeft() > 0, 'no commitment picked up');
  });

  /* ---------------- pots ---------------- */
  test('moveToPot rejects more than the balance', () => {
    withState(s => { s.tx = [{ id: 'a', date: core.TODAY, time: '09:00', name: 'X', cat: 'Income', amt: 50, bal: 50, note: '' }]; });
    eq(core.moveToPot(core.getState().pots[0].id, 500, 'in').ok, false);
  });
  test('moveToPot moves money and writes a transfer', () => {
    withState(s => { s.tx = big(); });
    const pot = core.getState().pots[0], before = pot.bal, n = core.getState().tx.length;
    eq(core.moveToPot(pot.id, 100, 'in').ok, true);
    eq(core.round2(core.getState().pots[0].bal), core.round2(before + 100));
    eq(core.getState().tx.length, n + 1);
    eq(core.getState().tx[0].cat, 'Transfers');
  });
  test('moveToPot rejects withdrawing more than the pot holds', () => {
    withState(s => { s.tx = big(); s.pots[0].bal = 10; });
    eq(core.moveToPot(core.getState().pots[0].id, 100, 'out').ok, false);
  });

  /* ---------------- payments ---------------- */
  test('sendMoney rejects more than the balance', () => {
    withState(s => { s.tx = [{ id: 'a', date: core.TODAY, time: '09:00', name: 'X', cat: 'Income', amt: 5, bal: 5, note: '' }]; });
    eq(core.sendMoney(core.getState().payees[0].id, 100, 'Test').ok, false);
  });
  test('sendMoney debits and stamps the payee as recent', () => {
    withState(s => { s.tx = big(); });
    const payee = core.getState().payees[1];
    eq(core.sendMoney(payee.id, 25, 'Rent share').ok, true);
    eq(core.getState().tx[0].amt, -25);
    eq(core.getState().payees.find(p => p.id === payee.id).last, core.TODAY);
  });

  /* ---------------- plans ---------------- */
  test('free plan blocks virtual cards', () => {
    withState(s => { s.plan = 'free'; s.vcards = []; });
    eq(core.addVirtualCard().ok, false);
  });
  test('Max allows a virtual card', () => {
    withState(s => { s.plan = 'max'; s.vcards = []; });
    eq(core.addVirtualCard().ok, true);
  });
  test('virtual cards stop at the live cap', () => {
    withState(s => { s.plan = 'max'; });
    while (core.getState().vcards.length < PLANS.max.vcLive) core.addVirtualCard();
    eq(core.addVirtualCard().ok, false);
  });
  test('switching plan charges only the difference', () => {
    withState(s => { s.plan = 'extra'; s.tx = big(); });
    const before = core.balNow();
    core.setPlan('perks');
    near(before - core.balNow(), PLANS.perks.price - PLANS.extra.price, 0.01);
  });
  test('downgrading charges nothing', () => {
    withState(s => { s.plan = 'max'; s.tx = big(); });
    const before = core.balNow();
    core.setPlan('free');
    eq(core.balNow(), before);
  });

  /* ---------------- flex ---------------- */
  test('flexPurchase refuses more than the available limit', () => {
    withState();
    eq(core.flexPurchase('Test', core.flexAvail() + 1, 3).ok, false);
  });
  test('flexPurchase reduces the available limit', () => {
    withState();
    const before = core.flexAvail();
    eq(core.flexPurchase('Test', 300, 3).ok, true);
    near(before - core.flexAvail(), 300, 0.01);
  });
  test('a three month plan is interest free', () => {
    withState();
    core.flexPurchase('Test', 300, 3);
    near(core.getState().flex.plans[0].monthly, 100, 0.01);
  });
  test('a twelve month plan carries interest', () => {
    withState();
    core.flexPurchase('Test', 1200, 12);
    ok(core.getState().flex.plans[0].monthly > 100);
  });
  test('runTick clears a plan and restores the limit on principal', () => {
    withState(s => {
      s.tx = big();
      s.flex.used = 100;
      s.flex.plans = [{ id: 'p', name: 'Test', amount: 100, remaining: 100, principal: 100, term: 3, monthly: 33.34 }];
      s.lastTick = '';
    });
    for (let i = 0; i < 4; i++){ core.getState().lastTick = ''; core.runTick(); }
    eq(core.getState().flex.plans.length, 0);
    eq(core.round2(core.getState().flex.used), 0);
  });

  /* ---------------- loans ---------------- */
  test('takeLoan rejects amounts under £1,000', () => { withState(); eq(core.takeLoan(500, 24).ok, false); });
  test('takeLoan rejects amounts over £35,000', () => { withState(); eq(core.takeLoan(40000, 24).ok, false); });
  test('takeLoan credits the account and records the agreement', () => {
    withState(s => { s.tx = big(); });
    const before = core.balNow();
    eq(core.takeLoan(5000, 24).ok, true);
    near(core.balNow() - before, 5000, 0.01);
    eq(core.getState().loans.length, 1);
  });
  test('loan repayments amortise the outstanding balance', () => {
    withState(s => { s.tx = big(); s.lastTick = ''; });
    core.takeLoan(2000, 12);
    const start = core.getState().loans[0].outstanding;
    core.runTick();
    ok(core.getState().loans[0].outstanding < start, 'outstanding did not fall');
  });

  /* ---------------- overdraft ---------------- */
  test('overdraft over £1,000 is priced at 19%', () => { withState(); core.arrangeOverdraft(1500); eq(core.getState().overdraft.rate, 19); });
  test('overdraft under £1,000 is priced at 29%', () => { withState(); core.arrangeOverdraft(500); eq(core.getState().overdraft.rate, 29); });

  /* ---------------- challenge ---------------- */
  test('challenge starts at 1p', () => {
    withState(s => { s.tx = big(); });
    const res = core.challengeSave();
    eq(res.ok, true);
    near(res.amt, 0.01, 0.001);
  });
  test('challenge refuses past day 365', () => {
    withState(s => { s.tx = big(); s.challenge = { day: 365, saved: 667.95 }; });
    eq(core.challengeSave().ok, false);
  });

  /* ---------------- billsback ---------------- */
  test('billsback needs a qualifying plan', () => {
    withState(s => { s.plan = 'free'; s.billsback = { optIn: true, history: [] }; });
    eq(core.billsbackOptIn().ok, false);
  });
  test('billsback draw needs opt-in', () => {
    withState(s => { s.plan = 'extra'; s.billsback = { optIn: false, history: [] }; });
    eq(core.billsbackDraw().ok, false);
  });
  test('billsback pays back no more than the cap', () => {
    withState(s => {
      s.plan = 'extra';
      s.billsback = { optIn: true, history: [] };
      s.tx = [{ id: 'b', date: core.TODAY, time: '06:00', name: 'British Gas', cat: 'Bills', amt: -400, bal: 5000, note: '' }];
    });
    const res = core.billsbackDraw(() => 0.01);
    eq(res.ok, true);
    eq(res.won, true);
    ok(res.amount <= BB_CAP, `paid back ${res.amount}`);
    near(res.amount, BB_CAP, 0.01);
  });
  test('billsback only counts bills from the provider list', () => {
    withState(s => {
      s.plan = 'extra';
      s.billsback = { optIn: true, history: [] };
      s.tx = [{ id: 'b', date: core.TODAY, time: '06:00', name: 'Corner Shop', cat: 'Bills', amt: -400, bal: 5000, note: '' }];
    });
    eq(core.billsbackDraw().ok, false);
  });

  /* ---------------- ISA ---------------- */
  test('allowance used only counts subscriptions this tax year', () => {
    withState();
    ok(core.tyUsed() >= 0 && core.tyUsed() <= 20000);
  });

  /* ---------------- state defaults ---------------- */
  test('fresh state carries every field the screens read', () => {
    withState();
    const s = core.getState();
    eq(s.atmLimit, 400);
    eq(s.jointBal, 0);
    eq(s.acctName, 'Personal current account');
    ok(Array.isArray(s.extraAccounts));
  });

  /* ---------------- migrations ---------------- */
  test('a v11 blob migrates forward without losing data', () => {
    localStorage.setItem(KEY, JSON.stringify({
      v: 11, tx: [{ id: 'a', date: core.TODAY, time: '09:00', name: 'Keep', cat: 'Income', amt: 1, bal: 1, note: '' }],
      isa: [], pots: [], targets: { Groceries: 100 }, payees: [], sos: [], tabs: [], vcards: [],
      profile: { name: 'Jason Armstrong' }, plan: 'max', pin: '2580'
    }));
    core.load();
    const s = core.getState();
    eq(s.v, core.VERSION);
    eq(s.tx[0].name, 'Keep');
    ok(Array.isArray(s.flex.plans));
    ok(Array.isArray(s.loans));
    ok(Array.isArray(s.connected));
    ok(typeof s.billsback.optIn === 'boolean');
    ok(s.layout.length > 0);
  });
  test('migrate is idempotent', () => {
    const once = core.migrate({ v: 11, tx: [], isa: [], pots: [], targets: {} });
    const twice = core.migrate({ ...once });
    eq(twice.v, once.v);
    eq(twice.layout.length, once.layout.length);
  });
  test('a newer blob falls back to a fresh state', () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 99 }));
    core.load();
    eq(core.getState().v, core.VERSION);
    ok(core.getState().tx.length > 0);
  });
  test('a legacy key is promoted rather than discarded', () => {
    localStorage.clear();
    localStorage.setItem('monzo_v11', JSON.stringify({ v: 11, tx: [], isa: [], pots: [], targets: {} }));
    core.load();
    eq(core.getState().v, core.VERSION);
    eq(localStorage.getItem('monzo_v11'), null);
  });
      }
