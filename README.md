**README.md**

```markdown
# Monzo

A Monzo-style banking PWA. Single origin, no backend, no build step — state lives in
`localStorage` and the app runs from static files on GitHub Pages.

Live: <https://jasonarm92.github.io/>

Everything in it is fictional: the account holder, the balances, the transactions going
back to October 1992, the credit file, the connected banks. It is a UI clone for
practising front-end work, not a bank.

Current build **43**, state schema **v32**. Build list Phases A–I plus C.5 are complete.

---

## What this is

A pixel-chasing reproduction of the Monzo 8.10.0 iOS app, built to be indistinguishable
at a glance: the same information architecture, the same five-tab frame, the same
component vocabulary, the same words on the buttons. Everything is client-side, so it
will happily "move" money it does not have, "connect" to banks that do not exist, and
issue a mortgage agreement in principle that no lender has ever seen.

The target is fidelity of behaviour, not a demo. Where the real app has a flow — splitting
a bill with per-person shares, settling a Flex plan early, reconnecting an expired
open-banking consent — this one has the same flow with the same arithmetic.

## Ground rules

- **No backend, no build step.** Static files only. Nothing compiles, nothing bundles.
- **One storage key.** All state sits in a single `localStorage` entry and is rewritten
  through one debounced `save()`.
- **Everything is derived.** Balances, budgets, totals and credit figures are computed
  from state, never stored twice.
- **Migrations are mandatory.** Any change to the state shape ships with a version bump,
  a migration, and defensive handling in `normalise()`.

## Architecture

```
index.html
  └── boot.js            (module, tries the graph, shows a panel on failure)
        └── main.js      (router, tab bar, PIN gate, calls verify() before first paint)
              ├── core.js      state, persistence, migrations, all money maths
              │     └── data.js    static tables (merchants, brands, categories, funds)
              ├── ui.js        DOM builders, sheets, toasts, haptics
              ├── verify.js    boot-time export and route checks
              ├── statement.js PDF writer
              ├── tests.js     assertion runner and test screen
              └── screens-a..d.js  one module per area of the app
```

`boot.js` imports `main.js` dynamically so a link error surfaces as a readable panel
instead of a white screen. `main.js` then calls `verify(SCREENS)` before the first
render; if any required export or route is missing it fails loudly with the name.
`sw.js` serves same-origin requests network-first with `cache: 'no-store'`, so a paste
takes effect on the next load.

### Module rules

- `core.js` imports only from `data.js`. It never touches the DOM.
- `ui.js` imports from `core.js` and `data.js`. It builds elements, never reads routes.
- `screens-*.js` import from `core.js`, `data.js`, `ui.js` and, where unavoidable, each
  other. No screen imports `main.js`.
- Cross-module calls to another screen go through `import('./screens-x.js?v=BUILD')` or a
  route change, never a direct top-level import, to keep the graph acyclic.

### Why every import carries `?v=43`

GitHub Pages caches aggressively and the service worker caches on top of it. A version
stamp on every internal specifier means a build either loads entirely or not at all,
and the browser can never mix a new `main.js` with a stale `core.js`. When you bump
`BUILD`, bump every stamp with it — they must all agree.

## Files

| File | Role |
| --- | --- |
| `index.html` | Shell: view container, tab bar, sheet and toast hosts, font and manifest links |
| `styles.css` | Design tokens, dark theme, every component. No other stylesheet |
| `boot.js` | Entry point, `BUILD` constant, error panel with Clear cache and reload |
| `main.js` | Route table, tab bar, PIN gate, `verify()` call, boot sequence |
| `core.js` | State, `save`/`load`/`reset`, migrations 21→32, all financial logic |
| `data.js` | Merchant domains and brand colours, categories, funds, benefits, banks |
| `ui.js` | `el`, `screen`, `row`, `list`, `sheet`, `confirmSheet`, `toast`, `haptic`, icons |
| `verify.js` | Checks required exports and that every route resolves to a function |
| `statement.js` | Builds a real PDF (objects, xref table) and downloads the blob |
| `tests.js` | 25 assertions over the money model, plus the `#/tests` screen |
| `screens-a.js` | Home, Trends, categories, Payments, Borrowing, Settings, Pots |
| `screens-b.js` | Transactions, Investments, Cards and virtual cards, statements, layout |
| `screens-c.js` | Credit score, credit report, mortgage in principle, connected accounts |
| `screens-d.js` | Search, benefit detail, plan change |
| `sw.js` | Precache list, cache version, network-first fetch strategy |
| `manifest.webmanifest` | PWA manifest |

## State

One object under `monzo_v32`. Containers:

`user` · `accounts` · `pots` · `tx` · `scheduled` · `cards` · `payees` · `splits` ·
`budgets` · `customCats` · `catOverrides` · `searches` · `flex` · `loans` · `overdraft` ·
`credit` · `connected` · `mip` · `plan` · `plus` · `invest` · `pension` · `isa` ·
`layout` · `settings`

`load()` walks `LEGACY_KEYS` (`monzo_v31` down to `monzo_v11`) if the current key is
empty, runs every migration whose version exceeds the stored one, then passes the result
through `normalise()`. `normalise()` rebuilds anything missing and coerces anything
malformed, so a half-written or truncated blob still boots.

### Changing the state shape

1. Bump `VERSION`, `KEY` and prepend the old key to `LEGACY_KEYS`.
2. Add a migration at the new version that fills the new field for old data.
3. Add the field to `defaultState()` and to the guards in `normalise()`.
4. Bump `BUILD`, every `?v=`, and the `CACHE` name in `sw.js`.

Skipping any of those leaves existing installs either stuck or blank.

## Money model

- **Ledger.** A deterministic walk from 7 October 1992 built by `makeRng(19921007)`:
  monthly buys, quarterly dividends, occasional lump sums and sales, all routed through
  three risk funds. Regenerated only if the stored ledger is empty.
- **History.** Two prior months of Teesside family transactions, seeded per account, so
  Trends deltas and budget comparisons have something to compare against.
- **Splits.** Penny-accurate: the remainder is distributed a penny at a time, so shares
  always sum to the bill exactly.
- **Budgets.** Per account, per category, seeded from prior-month actuals. `budgetLeft()`
  drives the left-to-spend bar on Home and Trends.
- **Flex.** Limit, plans, per-month instalments written into `scheduled`. Early settlement
  takes a 2% discount and removes the outstanding instalments.
- **Loans and overdraft.** APR bands, scheduled repayments, daily overdraft cost at 39% EAR.
- **Credit.** TransUnion-style score on 0–999 with five bands, twelve months of history,
  a report of accounts, searches and public information.
- **Mortgage in principle.** Borrowing capped at 4.5× income and 90% LTV, with a 10%
  minimum deposit, rate bands by LTV, and a 90-day certificate.
- **Virtual cards.** Bound to a pot, spend from the pot only, freezable, optionally
  single-use (destroyed on first payment), Plus and above.
- **Statements.** Twelve months, each rendered as a genuine PDF with opening balance,
  running balance and closing balance.

## Design system

Tokens in `:root` cover spacing, type scale, radii, z-index, surfaces and ink. Tint tokens
(`--tint-coral`, `--tint-blue`, …) exist so pastel fills have a dark counterpart rather
than glowing in dark mode.

`html[data-theme="dark"]` swaps surfaces, ink and tints together. `html[data-motion="reduced"]`
flattens every animation and transition, and `haptic()` fires `navigator.vibrate` only when
haptics are on. Both are set from Settings → Appearance and read by `ui.js` at build time,
so sheets, toasts and bars all respect them.

Icons are inline SVG: nine navigation glyphs and fourteen category glyphs, drawn on a 24
grid at 1.7 stroke. There are no icon fonts and no emoji in the chrome.

## Routes

`#/home` `#/trends` `#/payments` `#/borrowing` `#/account` `#/search` `#/tests`
`#/categories` `#/category-new` `#/category-edit/:id` `#/benefit/:id` `#/pots`
`#/pot/:id` `#/pot-card/:potId` `#/virtual-card/:id` `#/payees` `#/payee-new`
`#/payee-edit/:id` `#/payee/:id` `#/send/:id` `#/request` `#/bank` `#/scheduled`
`#/flex` `#/flex-plan/:id` `#/loan` `#/overdraft` `#/credit` `#/credit-report`
`#/mortgage` `#/dip/:id` `#/connected` `#/connected-account/:id` `#/settings`
`#/settings-personal` `#/settings-security` `#/settings-preferences`
`#/settings-documents` `#/settings-about` `#/invest` `#/ledger` `#/fund/:id`
`#/pension` `#/isa` `#/plus` `#/profile` `#/security` `#/notifications`
`#/statements` `#/appearance` `#/about` `#/cards` `#/tx/:id` `#/trend/:id`
`#/splits` `#/split/:txId` `#/split-detail/:id` `#/receipt/:txId` `#/login`

Unknown routes fall back to Home. Every route must be a function in `SCREENS` or `verify()`
fails the boot.

## Tests

`#/tests`, or About → Run tests. 25 assertions covering rounding, credit band boundaries,
the 4.5× mortgage cap, penny-exact splitting, Flex settlement clearing instalments,
virtual-card gating, pot and balance overdraft guards, category deletion reassigning
transactions, search filtering, statement reconciliation, pro-rata plan changes,
snapshot round-tripping, `normalise()` repair and the migration chain.

They run against a throwaway state and restore your real one afterwards, so running them
never costs you data. The results list every assertion with a tick or a cross and the
failure detail.

## Running locally

Any static server from the repository root will do, because there is no build step:

```
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. `file://` mostly works but the service worker will not
register.

## Deploying

Push to the `gh-pages` branch. Nothing to compile. Bump `BUILD`, every `?v=` stamp, the
`CACHE` name in `sw.js` and, if the state shape moved, `VERSION`, `KEY` and `LEGACY_KEYS`.

## Deliberate limits

- No backend, so no real payments, no push, no server-side validation.
- Connected accounts are seeded, not fetched. Re-auth is simulated on a 90-day clock.
- Statements cap at 44 rows on a single page and never paginate.
- The icon set is fourteen glyphs, not a full library.
- Notifications only fire while a tab is open; there is no push service worker.
- No i18n, no tablet layout, no reduced-data mode.
- Credit, mortgage and loan figures are invented and not advice.

## Disclaimer

Not affiliated with Monzo. Fictional account holder, fictional money, fictional credit
file. PIN 2580 is not a secret.
```
