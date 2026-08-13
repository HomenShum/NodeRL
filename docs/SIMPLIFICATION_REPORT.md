# Simplification report

Baseline commit `5a1b3e8`. Every row below was produced by running the command in it, before the
changes and again after. Environment: Windows 11, Node v22.22.2, npm 10.9.7, fresh clone, no `.env`,
no API keys.

## The measurements

| Measure | Before | After | Change | Evidence command |
|---|---:|---:|---:|---|
| Production files | 29 | 29 | 0 | `git ls-files 'packages/*/src/*.ts' \| grep -v '\.test\.ts$' \| wc -l` |
| Production source lines | 4698 | 4699 | +1 | `git ls-files 'packages/*/src/*.ts' \| grep -v '\.test\.ts$' \| xargs cat \| wc -l` |
| Tracked files (whole repo) | 84 | 92 | +8 | `git ls-files \| wc -l` |
| Direct dependencies | 7 | 7 | 0 | `npm ls --depth=0` (2 root dev + 5 in `packages/nodetrace`) |
| npm scripts that succeed on a clean clone | 1 of 3 | 3 of 3 | +2 | `npm run <each>`; see "What was deleted" |
| Unused files | 32 | **0** | **−32** | `npx knip` |
| Unused exports | 16 | **0** | **−16** | `npx knip` (see note below) |
| Duplicate blocks | 13 | 14 | +1 | `npx jscpd packages` |
| Duplicate percentage | 2.86% | 2.83% | −0.03pp | `npx jscpd packages` |
| Circular dependencies | 0 | 0 | 0 | `npx dependency-cruiser --config <no-circular> --ts-config tsconfig.packages.json --output-type err packages/*/src packages/*/test test experiments` |
| Canonical workflow tests | **no test command existed** | 14 files, 14 pass | +14 | `npm test` |
| Test files | 11 | 14 | +3 | `git ls-files '*.test.ts' \| wc -l` |
| Typecheck | passes (sources only) | passes (sources **and** tests) | wider | `npm run typecheck` |
| Demo runs under plain `node` | **no — exit 1** | yes — exit 0 | fixed | `npm run demo` |
| Browser workflow passes | not applicable — no browser surface exists | not applicable | — | Playwright; `git ls-files` matches zero `.html`/`.tsx`/`.jsx`/`.css`/`.vue`/`.svelte`, nothing calls `listen(`/`createServer`, no `bin` declared |
| Production bundle size | not applicable — no build step or bundler | not applicable | — | no build analyzer exists; `tsc` runs with `noEmit` |
| Additions/deletions | — | — | 66 files, +2014 / −598 | `git diff --cached --shortstat` |

### Note on the two headline rows

**Unused files 32 → 0 is the real result, and it was not achieved by configuring the tool.** The
root cause was that `packages/nodeeval/package.json` and `packages/nodemem/package.json` both
declared `"main": "src/index.ts"` while no such file existed — knip reported it directly as
`Package entry file not found`. With no entry point, every file in those packages was unreachable by
definition. Writing the three real entry points made the graph resolvable.

**Unused exports 16 → 0 is measured across that change.** Before the entry points existed, knip could
not report at export level at all — whole files were unused, so it reported at file level and the
export count was vacuously 0. Once the entry points resolved, 16 genuine findings surfaced: 8
storybook "atom" functions exported for unit tests that were never written, 5 cent-tolerance
constants nothing imported, and 3 line/entry interfaces used only inside their own module. Fifteen
became module-private; one (`JournalLine`) was genuinely needed by a consumer building a
`JournalEntryInput`, so it was exported from the index instead. **Both directions are honest: 15
removed from the public surface, 1 added because it was actually required.**

**Production source lines are flat, on purpose.** Two orphan modules were deleted (−165 lines) and
three documented entry points were written (+169 lines). The gate's target is concepts removed, not
line count, and by that measure: one whole build subsystem gone, two broken package entry points
replaced by three working ones, 15 accidental public API symbols withdrawn, one undeclared external
tool requirement eliminated.

**Duplicate blocks went up by one, in markdown, not code.** TypeScript clones are unchanged at 13
(191 duplicated lines, identical before and after). The extra clone is a five-line "Provenance"
paragraph repeated across the three package READMEs. Left deliberately: each README should stand
alone.

## What was deleted

| Deleted | Lines | Why |
|---|---:|---|
| `scripts/extract-from-noderoom.mjs` | 71 | A code generator that copied `packages/*/src` out of the private NodeRoom repository. It resolves paths against a NodeRoom checkout that a standalone clone does not contain, so on a fresh clone it exited **1** with `0 file(s) resolved, 18 missing`. |
| `MANIFEST.json` | 51 | The source→destination map that generator read. Dead with it. |
| `EXTRACTION.md` | 44 | Documented that flow, and stated generation was "the remaining publish step — intentionally not committed", while 30 generated `.ts` files were in fact committed. The document contradicted the tree it described. |
| `packages/nodetrace/src/pdfBox.ts` | 78 | PDF citation box geometry. Zero importers, zero tests, not exported anywhere. Its header targets a `.r-tracevu-box` CSS class and a react-pdf `<Page>` — NodeRoom UI internals that do not exist in this repository. |
| `packages/nodetrace/src/secFacts.ts` | 87 | An SEC EDGAR fetch lane. Zero importers, zero tests, not exported. Its header says it "runs in-Convex"; there is no Convex here. |
| `packages/*/src/.gitkeep` ×3 | 3 | Placeholders in directories that now hold real files. |
| `npm run extract`, `npm run extract:check` | — | The two scripts that drove the generator. Two of the repo's three scripts failed on a clean clone; both are gone. |

**Reversal path:** the generator and its manifest are recoverable from git history —
`git log --diff-filter=D -- scripts/ MANIFEST.json EXTRACTION.md`. The provenance fact those files
carried (these sources originated in NodeRoom's `src/nodeagent/capture/**`, `src/nodemem/**`,
`src/eval/**`) is preserved as prose in each package README and in `docs/codebase/CONCERNS.md` §7.

### Why deleting the generator was the highest-value change

It was not merely dead — **its existence was deforming the code.** `merged.ts` and `trajectory.ts`
each carried a header saying they were excluded from `index.ts` because "both are regenerated by
`scripts/extract-from-noderoom.mjs` and would clobber any edit."

So the five modules that make up the loop — the part the README is about, the part every test covers,
the part `npm run demo` runs — were deliberately unreachable from the package's public surface, to
protect them from a generator that could not run here. Removing the generator is what made a single
honest entry point per package possible. Every other improvement in this report follows from it.

## Custom code replaced by an existing capability

| Custom thing | Replaced by | Effect |
|---|---|---|
| An undeclared dependency on `tsx` to run any test — named in 11 test file headers, present in neither `package.json` nor `package-lock.json` | **Node's built-in type stripping** (`node` runs `.ts` directly, ≥22.18) | Every green result at baseline required a runner the repo never declared and npm fetched from the network. Now `node` runs the files. Zero dependencies added. Required adding explicit `.ts` extensions to relative imports, since Node does not guess them. |
| No test runner at all — `npm test` exited 1 with `Missing script: "test"`; tests were run by hand, one file at a time | **Node's built-in test runner** (`node --test`) | One command runs all 14 files. Node expands the glob patterns itself, so it works identically on Windows and POSIX. No Jest, Vitest, or Mocha added. |
| `.mjs` demo importing `.ts` sources, which plain `node` could not resolve (`ERR_MODULE_NOT_FOUND`) | the same type stripping, plus explicit extensions | `npm run demo` now exits 0 under plain `node`. |

All three are rung (d) of the reuse ladder — the platform already did it. No dependency was added
anywhere in this change.

## Defects fixed from the Wave 1 ledger

| # | Was | Now |
|---|---|---|
| D1 | `npm run extract:check` exits 1 on a clean clone; README asserted the opposite as verified | Script and its README claim deleted |
| D2 | `README.md` had no install, quickstart or usage section at all | Quickstart with four commands, verified from a clean clone |
| D3 | No `npm test`; 11 tests runnable only under undeclared `tsx` | `npm test` → 14 files, 14 pass, no external runner |
| D4 | `node experiments/.../fr-a1-live-run-001-build.mjs` → `ERR_MODULE_NOT_FOUND` | `npm run demo` → exit 0 |
| D6 | `EXTRACTION.md` contradicted the committed tree | File deleted |
| D7 | README status paragraph described a pre-split state and linked a file that does not exist | Rewritten |

D5 (`examples/btb-one-task-proven/` is an empty promise) is **not fixed** — see below.

## Fixed in passing, with evidence

- **Two real type errors** in `packages/nodeeval/test/accounting_arApAging.test.ts` (lines 72 and 77):
  `.find(...)` results used without a null check (`TS2532: Object is possibly 'undefined'`). They were
  invisible because `tsconfig.packages.json` only included `packages/*/src/**`, so no test file was
  ever typechecked. The config now includes tests, and the two sites use the same
  `assert.ok(x, ...)`-then-use pattern the file already used ten lines earlier. This **strengthens**
  the assertions — it adds an existence check that was previously implicit — rather than weakening
  them.
- **`packages/nodeeval/src/accounting/oracleTypes.test.ts`** was the only test living under `src/`.
  Moved to `packages/nodeeval/test/accounting_oracleTypes.test.ts` so the convention has no
  exception.
- **`assertCapturableUrl` had no test**, and `docs/codebase/INTEGRATIONS.md` was about to claim it
  rejects specific address forms. Rather than assert unverified behaviour,
  `packages/nodetrace/test/guards.test.ts` now proves 23 internal address forms are rejected —
  including `::ffff:169.254.169.254`, the IPv4-mapped form of the cloud metadata endpoint — while
  ordinary public URLs are still accepted.

## Tests added

Three, each guarding something that had no protection:

- **`test/entrypoints.test.ts`** — every package imports by its own name and exposes the symbols its
  docs promise. Knockout-verified: breaking `packages/nodemem/package.json`'s `main` makes it fail;
  restoring it makes it pass.
- **`test/tours.test.ts`** — every `.tours/` step points at a file that exists, at a line in range,
  that is not blank. It caught a genuinely broken reference during authoring (a tour pointed at
  `docs/codebase/CONCERNS.md` before that file was written).
- **`packages/nodetrace/test/guards.test.ts`** — the URL guard, described above.

No existing test was weakened, skipped, deleted, or had an expected value edited. The only test-body
change is the two `assert.ok` additions described above, which tighten rather than loosen.

## Findings left unresolved

| Finding | Why it is left | Where it is recorded |
|---|---|---|
| `packages/nodemem` has zero tests (5 modules, ~990 lines) | Writing them is feature work, not structural reduction, and mixing the two is explicitly out of scope for this pass. `rankFacts`'s ordering is a correctness property and is the first thing to cover. | `docs/codebase/CONCERNS.md` §1 |
| The three `bankerToolBench*` proof gates have zero tests (566 lines) | Same reason. These are pure and deterministic, so they are cheap to cover — this is the most easily closed gap in the repo. | `docs/codebase/CONCERNS.md` §2 |
| `pipeline.ts`, `reasoning.ts`, `substrate/*` untested | Needs a real model and a real remote browser end to end. `pickSubstrate` takes `env` as a parameter and could be tested with no network. | `docs/codebase/CONCERNS.md` §3 |
| The BankerToolBench mean reward 0.2519 cannot be reproduced from this repository | Those runs happened in NodeRoom. This repo ships the gate logic, not the receipts. The claim is scoped honestly in the README but the evidence lives elsewhere. | `docs/codebase/CONCERNS.md` §4 |
| `examples/btb-one-task-proven/` describes five artifacts, none of which exist (Wave 1 D5) | Filling it means publishing real receipt files — a content decision, not a refactor. Either populate or delete. | `docs/codebase/CONCERNS.md` §5 |
| `docs/exists-vs-net-new.md` is written in the future tense of a split that already happened | Two references to deleted files were corrected; the framing was not. Kept as archived reasoning. | `docs/codebase/CONCERNS.md` §6 |
| 13 TypeScript duplicate blocks (2.86%) | Ten are test-fixture setup repeated across test files, where being explicit and self-contained is a feature. One is a 21-line similarity between `mergedReward.ts` and `trajectory.ts`, which operate on deliberately different reward types (`MergedReward` vs `NodeRewardSummary`); unifying them would introduce an abstraction over two things that are separate on purpose. | this file |

## Reproducing this report

```bash
git clone https://github.com/HomenShum/NodeRL.git && cd NodeRL
npm install
npm test          # 14 files, 14 pass
npm run typecheck # clean
npm run demo      # exit 0
npx knip          # no output — nothing unused
npx jscpd packages
```

`dependency-cruiser` needs the repo's own TypeScript on its module path to resolve `.ts` sources; run
it with `NODE_PATH="$PWD/node_modules"` and `--ts-config tsconfig.packages.json`, or it silently
cruises only 7 of 54 modules and reports a vacuous pass.
