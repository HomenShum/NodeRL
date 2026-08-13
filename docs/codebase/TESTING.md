# Testing

```bash
npm test        # 15 files, ~2s, no network, no keys
```

Node's built-in runner (`node --test`). No Jest, no Vitest, no Mocha, no config file.

## How a test file is written

Each file is a **plain script**. It declares a small local helper, asserts with `node:assert/strict`,
prints one line per scenario, and exits non-zero if anything failed. The runner treats a non-zero
exit as a failed file.

```ts
let pass = 0, fail = 0;
function scenario(name: string, fn: () => void) {
  try { fn(); console.log(`  PASS  ${name}`); pass++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${(e as Error).message}`); fail++; }
}

scenario("(c) NO-LEAK — screenshots are paths; inlined bytes are rejected", () => {
  assert.throws(() => mergeTrajectory(/* ... a Uint8Array path ... */), /NO-LEAK/);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
```

Scenario names are lettered `(a)`, `(b)`, `(c)` and lead with the **invariant being defended** in
capitals — `NO-LEAK`, `HONEST_SCORES`, `DETERMINISM` — so the same name can be grepped in the test,
in the code enforcing it, and in the file's header comment.

Tests may import deep module paths (`../src/merged.ts`); they are testing the module, not the public
API. Production consumers import from the package root instead.

## The two-direction rule

**A verifier that always returns "pass" satisfies any test that only checks good input.** So every
oracle test asserts *both* directions:

1. it **accepts** a correct answer, and
2. it **rejects** a wrong one **by the right named check**.

`debits_equal_credits` (`packages/nodeeval/test/accounting_trialBalance.test.ts:98`) is the pattern: it does not merely assert
the bad input failed, it asserts `debits_equal_credits` specifically was the check that failed, and
that the *other* invariants still passed — proving the failure is attributable rather than blanket.

Each oracle test ends by printing its own summary, e.g.
`RESULT: PASS (accepts GOOD, rejects BAD by named check, deterministic)`.

Determinism gets its own scenario nearly everywhere: run the function twice, assert byte-identical
output. That is the assertion that fails the moment someone introduces a clock or a random id.

## What is covered, and what is not

| Area | Modules | Tests | State |
|---|---|---|---|
| nodetrace — the loop | `merged`, `mergedReward`, `repair`, `storybook`, `trajectory` | 5 files | **covered, thoroughly** |
| nodeeval — accounting oracles | 5 oracles + `oracleTypes` | 6 files | **covered, two-direction** |
| Repo-level wiring | package entry points, CodeTour steps | 2 files | **covered** |
| nodetrace — URL guard + limits | `guards` | 1 file | **covered** |
| nodetrace — live capture | `pipeline`, `reasoning`, `substrate/*` | none | **not covered** |
| nodeeval — proof gates | `bankerToolBench{EvalLedger,FullSuiteGate,LiveSuiteGate}` | none | **not covered** |
| nodemem — everything | `classifier`, `memoryCompiler`, `retrievalPlanner`, `failureMemory`, `core/types` | none | **not covered** |

Reproduce that table: `grep -rhoE '\.\./src/[a-zA-Z/]+\.ts' --include=*.test.ts test packages | sort -u`

See [CONCERNS.md](CONCERNS.md) for what each gap risks and which to close first.

## The two repo-level tests

These live in `test/` rather than in a package, because they are about the repository, not about one
library.

**`test/entrypoints.test.ts`** — proves each package can be imported *by its own name* and exposes
the symbols its documentation names. It exists because a real defect shipped: two packages declared
`"main": "src/index.ts"` while no such file existed, and nothing caught it, because no test had ever
imported through a package name. The `const PACKAGES` (`test/entrypoints.test.ts:31`) list is a contract — add to
it when you add a headline capability.

**`test/citations.test.ts`** — proves every line number the walkthroughs quote points at the thing
they say it points at. Each `.tours/` step carries a `pattern` (CodeTour's own re-anchoring regex)
and each citation in `docs/START_HERE.md` and `docs/codebase/` names its symbol; the test asserts the
cited line matches. A line reference written in neither form fails as unguarded, because an escape
hatch would make the test decorative.

It replaced a version that checked only that the number was inside the file and the line was not
blank — which proves an anchor is *stable* and says nothing about whether it is *correct*. That
version passed while `INTEGRATIONS.md` pointed at the OpenAI branch to explain the Anthropic default.
When this fails, a file usually grew above the referenced line: open the citation, find the symbol,
update the number.

## Adding a test

1. Put it at `packages/<pkg>/test/<module>.test.ts`, or `test/` if it is repository-wide.
2. Copy the `scenario` helper from a neighbouring file. Do not add a framework.
3. Name the scenario after the invariant it defends.
4. If it is a verifier, assert both directions.
5. If it involves time or ids, assert determinism.
6. Shared fixture data goes in a `*.fixture.ts` file — not `*.test.ts`, or the runner will treat it
   as a test.

`npm test` will pick it up with no registration step.

## Typechecking

```bash
npm run typecheck
```

`tsc --noEmit` over **every** `.ts` file — sources *and* tests. Tests were outside this net until
recently, which hid two real type errors in `accounting_arApAging.test.ts`; they are now inside it.
Typecheck is not a build: nothing consumes its output.
