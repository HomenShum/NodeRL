# Structure

## The tree

```
package.json              3 scripts: test, typecheck, demo
tsconfig.packages.json    typecheck config (noEmit — a checker, not a build)

packages/                 three libraries, an npm workspace each
├── nodetrace/            record a run, score it, repair it, export it
│   ├── src/index.ts      THE public surface — start reading here
│   ├── src/merged.ts     mergeTrajectory: join a run's four slices, validate them
│   ├── src/mergedReward.ts   computeMergedReward: score without inventing numbers
│   ├── src/repair.ts     failure -> repair prompt + regression case
│   ├── src/storybook.ts  one trajectory -> one self-contained HTML page
│   ├── src/trajectory.ts capture -> (s,a,o,r) rows -> JSONL
│   ├── src/pipeline.ts   runCapture: the observe/act/extract loop  [live capture]
│   ├── src/reasoning.ts  aiSdkReasoner: the model seam             [live capture]
│   ├── src/guards.ts     URL validation + hard ceilings            [live capture]
│   ├── src/substrate/    Browserbase / Firecrawl selection         [live capture]
│   ├── src/types.ts      shared contracts for the capture half
│   └── test/             6 files
├── nodeeval/             did this run earn the claim it is making?
│   ├── src/index.ts      THE public surface
│   ├── src/accounting/   5 deterministic oracles + the shared VerifierResult contract
│   ├── src/bankerToolBench*.ts   3 suite-level proof gates
│   └── test/             6 files, all covering the accounting oracles
└── nodemem/              what to remember, and what to hand the next run
    ├── src/index.ts      THE public surface
    ├── src/core/         classifier, memoryCompiler, retrievalPlanner, types
    ├── src/failureMemory.ts   failures -> patterns -> re-run targets
    └── (no test/ — see CONCERNS.md)

test/                     repo-level tests that belong to no single package
├── entrypoints.test.ts   every package imports by its own name
└── citations.test.ts     every cited line contains the symbol the citation names

experiments/fr-a1-runs/   one real captured run; `npm run demo` runs the .mjs
.tours/                   3 CodeTour walkthroughs
docs/                     this documentation, plus the thesis and literature review
spec/                     the written contracts (trajectory schema, reward design,
                          proof receipts, anti-cheat doctrine, prove-before-claim)
promotion/                product-readiness scorecard, journeys, and defect ledger
```

## Where to look first

| If you want to… | Open |
|---|---|
| See the whole product work in 10 seconds | `npm run demo` |
| Follow that demo through the code | [`../START_HERE.md`](../START_HERE.md) |
| Know what a package can do | that package's `src/index.ts` |
| Know why a rule exists | the header comment of the file enforcing it |
| Know what is broken | [`CONCERNS.md`](CONCERNS.md) |

## The one boundary that matters

**Pure loop vs. live capture.** It runs through the middle of `packages/nodetrace` and it is the
first thing to understand about this repo.

|  | The loop | Live capture |
|---|---|---|
| Files | `merged`, `mergedReward`, `repair`, `storybook`, `trajectory` | `pipeline`, `reasoning`, `guards`, `substrate/`, `types` |
| Dependencies imported by the modules | none | `ai`, `@ai-sdk/*`, `zod`, `playwright-core` |
| Needs network / keys | no | yes |
| Reads the clock or random | no | `Date.now` for the step budget only |
| Test coverage | thorough | `guards` only |
| Exercised by `npm run demo` | yes | no |

Both halves are exported from the same `src/index.ts`, in two clearly labelled sections. The loop
half is what the README is about and what the tests protect. If you are new, stay in the loop half.

## Naming conventions in paths

- `packages/*/src/index.ts` — the only file a consumer should need to import from.
- `packages/*/test/*.test.ts` — tests. One file per source module it covers.
- `packages/nodetrace/test/merged.fixture.ts` — shared test data. Named `.fixture.ts`, not
  `.test.ts`, so the test runner's glob does not treat it as a test.
- `packages/nodeeval/test/accounting_*.test.ts` — prefixed by the area they cover, because that
  directory will grow beyond accounting.
