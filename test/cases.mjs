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
    eq(s.acctName, 'Personal current account');
    ok(Array.isArray(s.extraAccounts));
  });
  test('fresh state carries the scheduler fields', () => {
    withState();
    eq(core.getState().lastRun, core.TODAY);
    eq(core.getState().roundupPotId, '');
  });

  /* ---------------- scheduled money ---------------- */
  test('payday credits the salary on the 28th', () => {
    withState(s => { s.tx = big(); s.lastRun = '2026-02-27'; s.gpeMonth = ''; });
    const res = core.runScheduled('2026-02-28');
    ok(res.some(a => a.kind === 'salary'), 'no salary credited');
    eq(core.getState().gpeMonth, '2026-02');
    ok(core.balNow() > 20000, `balance ${core.balNow()}`);
  });
  test('a month is not paid twice after an early claim', () => {
    withState(s => { s.tx = big(); s.lastRun = '2026-02-27'; s.gpeMonth = '2026-02'; });
    const res = core.runScheduled('2026-02-28');
    eq(res.filter(a => a.kind === 'salary').length, 0);
    eq(core.balNow(), 20000);
  });
  test('the sorter funds pots from the salary', () => {
    withState(s => {
      s.tx = big(); s.lastRun = '2026-02-27'; s.gpeMonth = '';
      s.sorter = { on: true, splits: { [s.pots[0].id]: 200 } };
    });
    const pot = core.getState().pots[0], before = pot.bal;
    core.runScheduled('2026-02-28');
    near(core.getState().pots[0].bal, before + 200, 0.01);
  });
  test('a sorter that is switched off does not run', () => {
    withState(s => {
      s.tx = big(); s.lastRun = '2026-02-27'; s.gpeMonth = '';
      s.sorter = { on: false, splits: { [s.pots[0].id]: 200 } };
    });
    const before = core.getState().pots[0].bal;
    core.runScheduled('2026-02-28');
    eq(core.getState().pots[0].bal, before);
  });
  test('a standing order debits on its day', () => {
    withState(s => {
      s.tx = big(); s.lastRun = '2026-03-09';
      s.sos = [{ id: 'so', name: 'OpenRent', amt: 799, day: 10, active: true }];
    });
    const res = core.runScheduled('2026-03-10');
    ok(res.some(a => a.kind === 'standing-order'), 'standing order skipped');
    eq(core.round2(core.balNow()), 19201);
  });
  test('an inactive standing order is skipped', () => {
    withState(s => {
      s.tx = big(); s.lastRun = '2026-03-09';
      s.sos = [{ id: 'so', name: 'OpenRent', amt: 799, day: 10, active: false }];
    });
    eq(core.runScheduled('2026-03-10').length, 0);
    eq(core.balNow(), 20000);
  });
  test('pot auto-save moves on the first', () => {
    withState(s => { s.tx = big(); s.lastRun = '2026-03-31'; s.pots[0].autoSave = 50; });
    const before = core.getState().pots[0].bal;
    core.runScheduled('2026-04-01');
    near(core.getState().pots[0].bal, before + 50, 0.01);
  });
  test('a run is idempotent for the same day', () => {
    withState(s => {
      s.tx = big(); s.lastRun = '2026-03-09';
      s.sos = [{ id: 'so', name: 'X', amt: 10, day: 10, active: true }];
    });
    core.runScheduled('2026-03-10');
    const n = core.getState().tx.length;
    core.runScheduled('2026-03-10');
    eq(core.getState().tx.length, n);
  });
  test('an unaffordable standing order does not overdraw', () => {
    withState(s => {
      s.tx = [{ id: 'a', date: core.TODAY, time: '09:00', name: 'X', cat: 'Income', amt: 20, bal: 20, note: '' }];
      s.lastRun = '2026-03-09';
      s.sos = [{ id: 'so', name: 'Rent', amt: 799, day: 10, active: true }];
    });
    core.runScheduled('2026-03-10');
    ok(core.balNow() >= 0, `balance ${core.balNow()}`);
  });

  /* ---------------- round-ups ---------------- */
  test('round-ups move the remainder to the pot', () => {
    withState(s => {
      s.tx = [{ id: 'a', date: core.TODAY, time: '08:00', name: 'X', cat: 'Income', amt: 100, bal: 100, note: '' }];
      s.roundups = true; s.roundupPotId = s.pots[0].id;
    });
    const before = core.getState().pots[0].bal;
    core.addTx('Costa', 'Eating out', -3.40);
    near(core.getState().pots[0].bal, before + 0.6, 0.01);
  });
  test('round-ups stay off when the switch is off', () => {
    withState(s => {
      s.tx = [{ id: 'a', date: core.TODAY, time: '08:00', name: 'X', cat: 'Income', amt: 100, bal: 100, note: '' }];
      s.roundups = false; s.roundupPotId = s.pots[0].id;
    });
    const before = core.getState().pots[0].bal;
    core.addTx('Costa', 'Eating out', -3.40);
    eq(core.getState().pots[0].bal, before);
  });
  test('a whole-pound spend rounds to nothing', () => {
    withState(s => {
      s.tx = [{ id: 'a', date: core.TODAY, time: '08:00', name: 'X', cat: 'Income', amt: 100, bal: 100, note: '' }];
      s.roundups = true; s.roundupPotId = s.pots[0].id;
    });
    const before = core.getState().pots[0].bal, n = core.getState().tx.length;
    core.addTx('Tesco', 'Groceries', -10);
    eq(core.getState().pots[0].bal, before);
    eq(core.getState().tx.length, n + 1);
  });
  test('the round-up target falls back to the first pot', () => {
    withState(s => {
      s.tx = [{ id: 'a', date: core.TODAY, time: '08:00', name: 'X', cat: 'Income', amt: 100, bal: 100, note: '' }];
      s.roundups = true; s.roundupPotId = '';
    });
    eq(core.roundupPotName(), core.getState().pots[0].name);
  });
  test('closing the round-up pot clears the target', () => {
    withState(s => { s.roundupPotId = s.pots[0].id; });
    core.deletePot(core.getState().pots[0].id);
    eq(core.getState().roundupPotId, '');
  });

  /* ---------------- investment income ---------------- */
  test('the seed pays a dividend on the last day of every month', () => {
    const { tx } = buildSeed(new Date());
    const divs = tx.filter(t => t.cat === 'Investments' && /dividend/i.test(t.note));
    ok(divs.length > 300, `only ${divs.length} dividends`);
    ok(divs.every(t => {
      const d = new Date(t.date + 'T12:00:00');
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate();
    }), 'a dividend is not on a month end');
  });
  test('dividends are credits, never debits', () => {
    const { tx } = buildSeed(new Date());
    const divs = tx.filter(t => t.cat === 'Investments');
    ok(divs.length > 0);
    ok(divs.every(t => t.amt > 0));
  });
  test('the seed pays savings interest monthly', () => {
    const { tx } = buildSeed(new Date());
    const ints = tx.filter(t => t.name === 'Savings interest');
    ok(ints.length > 300, `only ${ints.length} interest rows`);
    ok(ints.every(t => t.amt > 0));
  });
  test('interest is on the last day, not mid-month', () => {
    const { tx } = buildSeed(new Date());
    const ints = tx.filter(t => t.name === 'Savings interest');
    ok(ints.every(t => {
      const d = new Date(t.date + 'T12:00:00');
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate();
    }));
  });
  test('the ledger runs back to October 1992', () => {
    const { tx } = buildSeed(new Date());
    eq(tx[tx.length - 1].date.slice(0, 7), '1992-10');
  });
  test('the opening balance is modest, not inherited', () => {
    const { tx } = buildSeed(new Date());
    ok(tx[tx.length - 1].bal < 400, `opening ${tx[tx.length - 1].bal}`);
  });

  /* ---------------- raised balances ---------------- */
  test('pot balances are in a realistic range', () => {
    withState();
    const total = core.getState().pots.reduce((a, p) => a + p.bal, 0);
    ok(total > 100000, `pots only total ${total}`);
  });
  test('pension and property are realistic', () => {
    withState();
    ok(core.getState().pension > 80000);
    ok(core.getState().homeValue > 200000);
    ok(core.homeEquity() > 150000);
  });

  /* ---------------- month-end at runtime ---------------- */
  test('the scheduler credits interest on a month end', () => {
    withState(s => { s.tx = big(); s.lastRun = '2026-03-30'; s.sos = []; s.pots.forEach(p => { p.autoSave = 0; }); });
    const res = core.runScheduled('2026-03-31');
    ok(res.some(a => a.kind === 'interest'), 'no interest credited');
    ok(core.balNow() > 20000);
  });
  test('the scheduler credits a dividend on a month end', () => {
    withState(s => { s.tx = big(); s.lastRun = '2026-03-30'; s.sos = []; s.pots.forEach(p => { p.autoSave = 0; }); });
    const res = core.runScheduled('2026-03-31');
    ok(res.some(a => a.kind === 'dividend'), 'no dividend credited');
  });
  test('a mid-month day pays neither', () => {
    withState(s => { s.tx = big(); s.lastRun = '2026-03-14'; s.sos = []; s.pots.forEach(p => { p.autoSave = 0; }); });
    const res = core.runScheduled('2026-03-15');
    ok(!res.some(a => a.kind === 'interest' || a.kind === 'dividend'));
  });

  /* ---------------- backup ---------------- */
  test('export carries the ledger and stamps the date', () => {
    withState(s => { s.tx = big(); });
    const json = JSON.parse(core.exportState());
    eq(json.tx.length, 1);
    eq(core.getState().lastBackup, core.TODAY);
  });
  test('import replaces the ledger', () => {
    withState(s => { s.tx = big(); });
    const json = core.exportState();
    withState();
    const r = core.importState(json);
    eq(r.ok, true);
    eq(core.getState().tx.length, 1);
  });
  test('import rejects junk', () => { withState(); eq(core.importState('nope').ok, false); });
  test('import rejects an array', () => { withState(); eq(core.importState('[]').ok, false); });
  test('import rejects a file with no ledger', () => {
    withState();
    eq(core.importState(JSON.stringify({ v: 16 })).ok, false);
  });
  test('import rejects a newer version', () => {
    withState();
    eq(core.importState(JSON.stringify({ v: 99, tx: [] })).ok, false);
  });
  test('import migrates an old blob', () => {
    withState();
    const r = core.importState(JSON.stringify({ v: 11, tx: [], pots: [], targets: {} }));
    eq(r.ok, true);
    eq(core.getState().v, core.VERSION);
  });
  test('a thin import keeps the fields the screens need', () => {
    withState();
    core.importState(JSON.stringify({ v: 11, tx: [], pots: [], targets: {} }));
    const s = core.getState();
    ok(s.profile && typeof s.profile.name === 'string');
    ok(Array.isArray(s.policies));
    eq(s.atmLimit, 400);
  });

  /* ---------------- dead fields ---------------- */
  test('revealed is gone from state and export', () => {
    withState();
    ok(!('revealed' in core.getState()));
    ok(!('revealed' in JSON.parse(core.exportState())));
  });
  test('potSort is gone', () => { withState(); eq(core.getState().potSort, undefined); });
  test('budgetTotal is gone', () => { eq(core.budgetTotal, undefined); });

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
  test('a v15 blob gains the scheduler fields', () => {
    localStorage.setItem(KEY, JSON.stringify({
      v: 15, tx: [], isa: [], pots: [], targets: {}, payees: [], sos: [], tabs: [], vcards: [],
      sorter: { on: false, splits: {} }, requests: [], profile: { name: 'Jason Armstrong' }, plan: 'max'
    }));
    core.load();
    const s = core.getState();
    eq(s.v, core.VERSION);
    eq(typeof s.lastRun, 'string');
    eq(s.roundupPotId, '');
    ok(Array.isArray(s.policies));
    ok(s.policies.length > 0);
  });
  test('a v18 blob has its headline figures lifted', () => {
    localStorage.setItem(KEY, JSON.stringify({
      v: 18, tx: [], isa: [], pots: [{ id: 'p', name: 'Emergency', type: 'savings', goal: 8000, bal: 1000 }],
      targets: {}, profile: { name: 'Jason Armstrong' }, plan: 'max',
      pension: 41250.18, pensionMonthly: 180, homeValue: 168000, mortgage: 100000, jointBal: 0
    }));
    core.load();
    const s = core.getState();
    eq(s.v, core.VERSION);
    eq(s.pension, 96400.18);
    eq(s.homeValue, 265000);
    eq(s.mortgage, 78500);
    eq(s.jointBal, 4180);
    ok(s.pots[0].bal >= 61240.30, `pot only ${s.pots[0].bal}`);
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
