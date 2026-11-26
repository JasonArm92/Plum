/* test/run.mjs — Node runner. Stubs the browser globals core.js needs. */

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
  key: i => [...store.keys()][i] ?? null,
  get length(){ return store.size; }
};
globalThis.location = { search: '', hostname: 'localhost', origin: 'http://localhost' };

const { run } = await import('./cases.mjs');
const core = await import('../core.js');

const results = [];
const eq = (a, b, msg) => { if (a !== b) throw new Error(msg || `expected ${b}, got ${a}`); };
const near = (a, b, tol, msg) => { if (Math.abs(a - b) > tol) throw new Error(msg || `expected ~${b}, got ${a}`); };
const ok = (v, msg) => { if (!v) throw new Error(msg || 'expected truthy'); };

function withState(mutate){
  const s = core.freshState();
  if (mutate) mutate(s);
  localStorage.clear();
  localStorage.setItem(core.KEY, JSON.stringify({ ...s, revealed: [] }));
  core.load();
}

run({
  test(name, fn){
    try { fn(); results.push({ name, ok: true }); }
    catch (e){ results.push({ name, ok: false, err: e.message }); }
  },
  eq, near, ok, withState
});

let failed = 0;
for (const r of results){
  if (r.ok) console.log(`  ✓ ${r.name}`);
  else { failed++; console.error(`  ✗ ${r.name}\n      ${r.err}`); }
}
console.log(failed ? `\n${failed} of ${results.length} failed` : `\nAll ${results.length} passed`);
process.exit(failed ? 1 : 0);
