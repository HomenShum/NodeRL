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
