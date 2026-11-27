/* ---------------- scheduler clipping ---------------- */
  test('a long absence replays only the window', () => {
    withState(s => { s.tx = big(); s.lastRun = '2026-01-01'; s.sos = []; });
    core.runScheduled('2026-04-11');
    ok(core.getState().notifs.some(n => /not replayed/i.test(n.body)), 'no skip notice');
    eq(core.getState().lastRun, '2026-04-11');
  });
  test('a short gap does not warn about skipping', () => {
    withState(s => { s.tx = big(); s.lastRun = '2026-03-01'; s.sos = []; });
    core.runScheduled('2026-03-11');
    ok(!core.getState().notifs.some(n => /not replayed/i.test(n.body)));
  });
  test('the replay still lands on the requested day', () => {
    withState(s => { s.tx = big(); s.lastRun = '2026-03-09'; s.sos = []; s.pots.forEach(p => { p.autoSave = 0; }); });
    core.runScheduled('2026-03-10');
    eq(core.getState().lastRun, '2026-03-10');
  });

  /* ---------------- salary source ---------------- */
  test('salary falls back to an estimate with no history', () => {
    withState(s => { s.tx = big(); });
    eq(core.salaryIsEstimate(), true);
    eq(core.salaryAmount(), core.FALLBACK_SALARY);
  });
  test('salary reads the real figure when history exists', () => {
    withState(s => {
      s.tx = [{ id: 'k', date: '2026-01-28', time: '06:00', name: 'Kingdom Services Group', cat: 'Income', amt: 2600, bal: 2600, note: '' }];
    });
    eq(core.salaryIsEstimate(), false);
    eq(core.salaryAmount(), 2600);
  });

  /* ---------------- joint figures ---------------- */
  test('joint bills come off the ledger', () => {
    withState(s => {
      s.tx = big();
      s.tx.push({ id: 'r', date: core.TODAY, time: '09:00', name: 'OpenRent', cat: 'Rent', amt: -800, bal: 19200, note: '' });
    });
    eq(core.jointBills(), 800);
  });
  test('joint contribution is a share of income', () => {
    withState(s => {
      s.tx = [{ id: 'i', date: core.TODAY, time: '09:00', name: 'Test', cat: 'Income', amt: 1000, bal: 1000, note: '' }];
    });
    near(core.jointContribution(), 1000 * core.JOINT_SHARE, 0.01);
  });

  /* ---------------- dead fields ---------------- */
  test('revealed is gone from state and export', () => {
    withState();
    ok(!('revealed' in core.getState()));
    ok(!('revealed' in JSON.parse(core.exportState())));
  });
  test('potSort is gone', () => { withState(); eq(core.getState().potSort, undefined); });
  test('budgetTotal is gone', () => { eq(core.budgetTotal, undefined); });
