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
