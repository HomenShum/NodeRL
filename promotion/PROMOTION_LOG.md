# Promotion log — NodeRL

Loop state lives here, in git, so any agent can resume cold. One entry per
iteration. Append; never rewrite history, because the list of things that turned
out to be wrong is more useful to the next reader than the current values alone.

Iteration cap: **10** (default). On reaching the cap without a gate pass, stop
and leave the remaining defect ledger below — a documented stop is a valid
outcome; a silent one is not.

## Entry shape

```
### Iteration N — YYYY-MM-DD
- Journey exercised: J<k> <name>
- Observed: <the defect, with its reproduction — inputs, width, state>
- Fixed: <the change, using existing components; file paths>
- Re-proved: <evidence path showing the defect gone in the rendered app>
- Tests: <command and result>
- Conditions newly PASS: <numbers, or "none">
```

---

## Baseline — 2026-08-13

**This baseline is PROVISIONAL.** NodeRL was flagged **DEFERRED** pending a
merge-or-retire decision. Everything below describes commit `dc4d668` as it
stands today; if the repo is merged into NodeRoom or retired, this baseline
describes a tree that no longer exists and must be re-measured, not carried
forward.

- **App started:** **No — there is no app.** NodeRL ships no runnable application
  and no browser surface. `git ls-files` matches zero `.html`, `.tsx`, `.jsx`,
  `.css`, `.vue` or `.svelte` files; nothing in the tree calls `listen(`,
  `createServer`, or declares a `bin`. Under the reduced gate the surface a
  stranger meets is the README quickstart, and `README.md` has no install,
  quickstart or usage section at all. So there was no server to start and no page
  to open — conditions 3–6, 9 and 10 could not be observed, and are UNVERIFIED
  for that reason rather than scored against a terminal.
- **Journeys drivable:** **3 of 5** (J2, J3, J4). J1 (quickstart) and J5
  (extraction refresh) fail. All three drivable journeys require `tsx`, which the
  repo never names; a stranger reaches them by guessing.
- **Scorecard at baseline:** see [PRODUCT_GOAL.md](PRODUCT_GOAL.md) —
  **1/12 PASS** (2 FAIL, 9 UNVERIFIED).
- **Environment:** fresh `git clone --depth 50`, Windows 11, Node v22.22.2,
  npm 10.9.7, no `.env`, no API keys supplied.

### Run attempts (every command, including the ones that failed)

| # | Command | Exit | Note |
|---|---------|------|------|
| 1 | `git clone --depth 50 https://github.com/HomenShum/NodeRL.git` | 0 | 80 tracked files at `dc4d668`. |
| 2 | `npm install` | 0 | 19 packages, 0 vulnerabilities, ~15s. `package-lock.json` unmodified afterwards. |
| 3 | `npm test` | 1 | `npm error Missing script: "test"`. Only three scripts exist: `extract`, `extract:check`, `typecheck`. |
| 4 | `npx tsx <each of 11 committed *.test.ts>` | 0 (11/11) | Every test file passes. Runner guessed — `tsx` is in neither `package.json` nor `package-lock.json` (`grep -c tsx package-lock.json` → 0). |
| 5 | `npx tsx packages/nodeeval/test/accounting_trialBalance.test.ts` | 0 | `RESULT: PASS (accepts GOOD, rejects BAD by named check, deterministic)`. Same shape for the other four accounting oracles. |
| 6 | `npm run extract:check` | **1** | 18 × `MISSING`, then `[dry-run] 0 file(s) resolved, 18 missing.` README:73 states the opposite as verified. |
| 7 | `node experiments/fr-a1-runs/fr-a1-live-run-001-build.mjs` | **1** | `ERR_MODULE_NOT_FOUND` on `packages/nodetrace/src/trajectory` — a `.mjs` file importing `.ts` sources. |
| 8 | `npx tsx experiments/fr-a1-runs/fr-a1-live-run-001-build.mjs` | 0 | Prints the repair prompt: `verdict: **FAIL**`, total reward 0.238, categories `ui_assertion_failed, evidence_needs_review`, both failed assertions with observed text, plus `regression_fr-a1-bank-reconciliation-live` JSON. |
| 9 | `npm run typecheck` (`tsc -p tsconfig.packages.json`) | 0 | Clean across all `packages/*/src/**/*.ts`. |
| 10 | *(browser)* not attempted | — | No URL to open. Not a time constraint: no server exists. |

### What was deliberately NOT done

Wave 1 measures; it does not fix. No source file, README, script or manifest in
this repo was edited. Nothing was deployed, published, or given a secret. The
only files added are the four under `promotion/`.

## Defect ledger

Open defects, most-impactful first. A defect is only listed once it has a
reproduction; a hunch is not a defect.

| # | Severity | Journey | Reproduction | Status |
|---|----------|---------|--------------|--------|
| D1 | major | J5, J1 | Fresh clone → `npm install` → `npm run extract:check`. Exit **1**; 18 `MISSING` lines; `[dry-run] 0 file(s) resolved, 18 missing.` The generator resolves `MANIFEST.json` paths (`src/nodeagent/capture/*`, `src/nodemem/*`, `src/eval/*`) against a NodeRoom checkout that a standalone clone does not contain. README:73 asserts "Verified 2026-06-28: `node scripts/extract-from-noderoom.mjs --dry-run` → 18/18 files resolve", so a stranger reads a red result as breakage rather than as expected-outside-NodeRoom. | open |
| D2 | major | J1 | Open `README.md` in a fresh clone. Headings are `# NodeRL`, `## What's real today (honest)`, `## What's coming`, `## The proof story (honest scope)`, `## Packages`, `## Spec`, `## Related`, `## License`. There is no install, quickstart, usage or "run this" section anywhere, so the reduced gate's "clone, run one command, reach a working result" has no command to run. | open |
| D3 | major | J2, J3, J4 | `npm test` → exit 1, `Missing script: "test"`. The 11 committed `*.test.ts` files each carry a header comment naming `tsx` (e.g. `packages/nodetrace/test/trajectory.test.ts:13` — "Run: npx tsx packages/nodetrace/test/trajectory.test.ts"), but `tsx` is absent from `package.json` devDependencies and from `package-lock.json`. Every green result in this baseline required an undeclared, network-fetched runner. | open |
| D4 | major | J3 | `node experiments/fr-a1-runs/fr-a1-live-run-001-build.mjs` → exit **1**, `ERR_MODULE_NOT_FOUND` for `.../packages/nodetrace/src/trajectory`. The `.mjs` extension advertises "plain node runs this"; its first two lines import `../../packages/nodetrace/src/merged.ts` and `.../repair.ts`. Works only under `tsx`, which the file does not mention. | open |
| D5 | minor | J4 | `ls -R examples` → `examples/btb-one-task-proven/README.md` and nothing else. That README lists what the directory "will contain (populated after Debt 1 is settled)": a redacted proof receipt, `trajectory.json`, package-manifest and boundary-box receipts, a visual-judge summary. None exist. The repo's only example is an empty promise, and it is the one README calls "the honest hero". | open |
| D6 | minor | J5 | `EXTRACTION.md:40-44` ("Status (2026-06-28)") says generation is "the remaining publish step — intentionally not committed here so the worktree carries no unverified, un-dep-wired generated source". But `git ls-files 'packages/*/src/**' \| grep '\.ts$'` returns 30 committed TypeScript files, and `npm run typecheck` compiles them cleanly. The doc contradicts the tree it describes. | open |
| D7 | minor | J1 | `README.md:20-23` says "This tree is staged inside the NodeRoom repo and will be split out to a standalone public repo once two honesty debts are settled (see `../docs/noderl/HONESTY_DEBTS_BEFORE_PUBLISH.md`)". This *is* the standalone public repo, and `ls docs/noderl` → "No such file or directory"; no file matching `honesty` is tracked. The first thing a stranger reads is a status paragraph about a state the repo has already left, pointing at a file they cannot open. | open |

## Iterations

_none yet — Wave 1 is baseline only. No defect above was fixed, by design._

### Iteration 1 — 2026-08-13 (Wave 3, human-readiness)

The Wave 1 baseline above was marked PROVISIONAL pending a merge-or-retire decision on
NodeRL. That flag is **lifted**: the repo is in scope and was worked as a standalone
public repository.

- **Journey exercised:** J1 (quickstart), J2/J3/J4 (the three drivable journeys), J5
  (extraction refresh — retired, see below).
- **Observed:** the root cause under D1/D3/D4/D6 was one thing, not four. `packages/*/src`
  was generated from the private NodeRoom repo by `scripts/extract-from-noderoom.mjs`, a
  generator that cannot run in a standalone clone. Its existence also forced
  `merged.ts` and `trajectory.ts` to stay *out* of `index.ts` ("would clobber any edit"),
  which is why `npx knip` reported **32 unused files** and `Package entry file not found`
  for two of three packages.
- **Fixed:**
  - deleted `scripts/extract-from-noderoom.mjs`, `MANIFEST.json`, `EXTRACTION.md`, and the
    `extract` / `extract:check` scripts (D1, D6; J5 retires with them);
  - wrote real entry points — `packages/{nodetrace,nodeeval,nodemem}/src/index.ts`;
  - replaced the undeclared `tsx` requirement with Node's built-in type stripping and
    `node --test`, adding explicit `.ts` extensions to relative imports (D3, D4);
  - rewrote `README.md` with a quickstart, and the three package READMEs, which described
    files and a CLI that are not in this tree (D2, D7);
  - deleted `packages/nodetrace/src/{pdfBox,secFacts}.ts` — zero importers, zero tests,
    NodeRoom-only.
- **Re-proved:** `npm test` → 14 files, 14 pass. `npm run typecheck` → clean, now covering
  tests as well as sources. `npm run demo` → exit 0 under plain `node`. `npx knip` → no
  output at all (32 unused files → 0; 16 unused exports → 0).
- **Tests:** `npm test` (14/14). Three added: `test/entrypoints.test.ts`,
  `test/tours.test.ts`, `packages/nodetrace/test/guards.test.ts`. No existing test was
  weakened, skipped or deleted.
- **Conditions newly PASS:** D1, D2, D3, D4, D6, D7 closed. **D5 remains open** —
  `examples/btb-one-task-proven/` still describes five artifacts that do not exist, and
  populating it is a content decision, not a refactor.
- **Full evidence:** [`../docs/SIMPLIFICATION_REPORT.md`](../docs/SIMPLIFICATION_REPORT.md).
  Remaining gaps, ranked: [`../docs/codebase/CONCERNS.md`](../docs/codebase/CONCERNS.md).

### Iteration 2 — 2026-08-14 (conditions 7 and 8: the audits that were unavailable)

Measured at commit `b748ae8`, fresh `git clone`, Windows 11, Node v22.22.2 /
npm 10.9.7, after `npm ci`.

- **Journey exercised:** none new. This iteration closes a *measurement* gap, not
  a product gap. Nothing a user does changed.
- **Observed:** conditions 7 and 8 were UNVERIFIED with the reason "audit not
  run". That reason conflates two states that need different responses — the
  audit *tool* was missing (installable) versus the thing to audit was missing
  (not installable). Nobody could tell from the scorecard which one NodeRL had,
  so the row read as a to-do that a tool install would clear. It is not.
- **Fixed:** measured both halves separately, each with a producer that can be
  re-run rather than a sentence that must be believed.
  - `promotion/evidence/audit-toolchain-check.mjs` → invokes `lighthouse@13.4.1`
    and `@axe-core/cli@4.13.0` and records the version each tool printed about
    itself. Both **available**. So the tooling is not the blocker.
    (It found a real trap on the way: `execFileSync('npx', …)` fails on Windows
    with ENOENT and then EINVAL — `.cmd` shim, plus Node's CVE-2024-27980 refusal
    to spawn one without a shell. A hardcoded `"13.4.1"` string in the artifact
    would have hidden that the check never actually ran.)
  - `promotion/evidence/rendered-surface-probe.mjs` → asks five independent
    questions of the committed tree: markup files, stylesheets, server entry
    points, UI framework dependencies or `bin` fields, deployed page URLs. **All
    five zero.** There is no rendered surface, so there is no target.
  - `promotion/evidence/condition-07-wig-review.md` → the actual Web Interface
    Guidelines review, performed against
    <https://vercel.com/design/guidelines> (fetched 2026-08-14, reachable, its
    category list reproduced in the record so the review can be re-read against
    the same material). All eight categories walked with a per-category
    disposition. **No Lighthouse number was used as a substitute** — there is no
    Lighthouse number, and the two conditions are filed in two documents
    precisely so that substitution cannot happen quietly.
  - `promotion/evidence/condition-08-web-quality-audit.md` → the audit record,
    stating what was not done and why: no page was fabricated on port 4915 to
    give the tools something to score. A green Lighthouse run against a scratch
    HTML file would be a real report about a file that is not this product.
- **Re-proved:** `node promotion/evidence/rendered-surface-probe.mjs` → exit 0,
  `surface_found: false`. `node promotion/evidence/audit-toolchain-check.mjs` →
  exit 0, both tools available. `npm test` → **16/16**. `npm run typecheck` →
  exit 0. `npm run demo` → exit 0 under plain `node`.
- **Tests:** one added, `test/renderedSurfaceProbe.test.ts`, and it is the point
  of the whole iteration. A probe that answered "no surface" on every input would
  produce this same green result on a repo full of HTML, and the N/A verdict
  resting on it would be a rubber stamp. So the test stands up throwaway git
  repositories and proves each of the five checks fires **on its own**: an
  `.html` file, a `react` dependency, a `.listen(` call, and a `*.vercel.app`
  URL each turn the probe red independently. No existing test was weakened,
  skipped or deleted; the suite went 15 → 16.
- **Conditions newly moved:** 3, 4, 5, 6, 7, 8, 9, 10 → **N/A** (from
  UNVERIFIED), each pointing at a committed artifact and a committed producer.
  11 stays PASS with its evidence re-measured at `b748ae8` (the baseline's D3
  caveat about an undeclared `tsx` runner no longer applies — `npm test` runs
  under plain `node`).
- **Deliberately NOT moved:** 1, 2 and 12. Their baseline reasons are stale —
  they cite `scripts/extract-from-noderoom.mjs` and a README with no quickstart,
  both of which Iteration 1 removed — but re-scoring them requires driving the
  journeys, and reading someone else's log entry is not driving them. They are
  flagged as stale in the scorecard preamble instead of being quietly upgraded.
  **The scorecard therefore still reads 1/12 PASS.** Nothing here made NodeRL
  more promotable; it made eight rows honest and one of them self-expiring.

### Iteration 2a — 2026-08-14 (the fresh clone refuted Iteration 2 within the hour)

Recorded rather than amended, because the list of things that turned out to be
wrong is the useful part.

- **Observed:** Iteration 2 was verified with `npm test` **before** its own commit
  existed. On the first fresh `git clone` of `26893f5`, `npm test` came back
  **15 pass, 1 fail** and the probe reported `surface_found: true`. The eight N/A
  rows had been committed against a measurement that stopped being true the
  moment it was committed.
- **Root cause:** the probe greps `HEAD`, so it could not see its own control
  until the control was committed — and a control test must contain the patterns
  it proves fire. Four matches, none of them a surface: the fixture strings
  `http.createServer(...).listen(4915)` and `https://noderl-demo.vercel.app` in
  `test/renderedSurfaceProbe.test.ts`, plus two lines of **prose** in
  `PROMOTION_LOG.md` and `condition-07-wig-review.md` that quote `.listen(` while
  explaining what the probe looks for. A file whose job is to describe a pattern
  is not an instance of it.
- **Fixed** in `rendered-surface-probe.mjs`, at the seam rather than the symptom:
  the server-entrypoint grep is scoped to source extensions (`*.ts`, `*.mjs`,
  `*.js`, …) because Markdown cannot bind a port, which drops both prose matches
  without weakening anything; and exactly two self-referential paths — the probe
  and its control — are excluded by name. The deployed-URL check deliberately
  keeps scanning Markdown, since a deployed page is normally announced in prose.
- **Guarded:** an exclusion is the classic hiding place for a weakened check, so
  it is now pinned from both sides. Scenario (d) proves a `.listen(` in an
  ordinary file still fires; new scenario (f) proves the same content at the
  excluded path does not, and that a third file gets no such immunity. The
  exclusion is asserted to be exactly two files wide.
- **Re-proved on a fresh clone, after the fix was pushed** — the check that
  should have been run the first time. See the row below.
- **Belief this killed:** "green `npm test` in the working tree means green on a
  fresh clone." For any check that reads `HEAD` rather than the working
  directory, those are different measurements, and only the second one is the one
  a stranger gets.

**The N/A verdict has an expiry date built in.** `rendered-surface-probe.mjs`
exits 1 the moment any surface appears, and it runs inside `npm test` via its
control. The day someone commits a demo page, the suite goes red and these eight
rows must be re-scored by opening the thing — they cannot inherit "nothing to
audit" from a tree that no longer exists.
