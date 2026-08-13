# Conventions

These are the patterns actually used in this repository. Follow them and your code will look like
the code around it.

## 1. Every relative import carries a `.ts` extension

```ts
import { deterministicId } from "./trajectory.ts";   // yes
import { deterministicId } from "./trajectory";      // no — Node cannot resolve this
```

Node runs the TypeScript directly and does not guess extensions. Directory imports do not work
either: write `./substrate/index.ts`, not `./substrate`.

## 2. Pure functions by default; the clock is a parameter

No function in `packages/` calls `Date.now()`, `new Date()`, or `Math.random()` — except the
live-capture loop, which uses `Date.now` solely to enforce its time budget and accepts a `now`
override for tests.

When a function needs the current time, it takes it as an argument:

```ts
export function buildFailurePatterns(failures: TaskFailure[], now: number): NodeMemFailurePattern[]
```

That is what makes the output testable: same input plus same `now` gives a byte-identical result.
Where an id must be derived, use `deterministicId` (`trajectory.ts:125`) — a sorted-key FNV-1a hash
of stable fields — never a counter or a random value.

## 3. Never fabricate a number

A value you did not measure is `0` **and** carries a label saying so:

```ts
resolved[key] = 0;
labels.push(`unscored:${key}`);
```

Do not add a default score, a minimum, or a "reasonable" fallback. If you find yourself picking a
number so the output looks complete, that is the exact failure this repository is built to prevent.

## 4. Failures are return values, not exceptions

```ts
return { ok: false, url: opts.url, steps, error: message };   // pipeline.ts:123
```

An operation that can fail for ordinary reasons returns a result carrying the failure, with whatever
was collected before it. Reserve `throw` for a **violated invariant** — something that means the
caller has a bug, not that the world was uncooperative. There are two: a screenshot passed as bytes
(`merged.ts:182`), and an unsafe capture URL (`guards.ts:71`).

## 5. A file's header comment says *why*, not *what*

Every non-trivial module opens with a block comment naming the problem it solves and the invariants
it holds. This is the repository's main documentation surface — richer than these docs, and it does
not go stale, because it sits next to the code.

When you change behaviour, change the header. When a header contradicts the code, the header is the
bug: it is what the next reader will believe.

## 6. Invariants are named in SCREAMING_CASE and referenced from tests

`HONEST_SCORES`, `HONEST_STATUS`, `NO-LEAK`, `DETERMINISTIC`, `SEQUENTIAL`, `BOUND`, `TIMEOUT`.

The name appears in the header comment, at the line enforcing it, and in the test asserting it, so
all three can be found with one grep. Reuse an existing name rather than inventing a synonym.

## 7. Consumers import from `src/index.ts`, never from a deep path

```ts
import { mergeTrajectory } from "@noderl/nodetrace";                     // yes
import { mergeTrajectory } from "@noderl/nodetrace/src/merged.ts";       // no
```

Each package has exactly one entry point, declared as both `main` and `exports["."]`. Adding a
public capability means exporting it from that file — `test/entrypoints.test.ts` fails if a
documented symbol is missing. Tests may import deep paths; they are testing the module, not the API.

## 8. Tests are plain scripts, not a framework

No `describe`, no `it` from a library, no config file. Each test file declares a small local helper,
uses `node:assert/strict`, prints one line per scenario, and exits non-zero on failure. See
[TESTING.md](TESTING.md) for the shape and the two-direction rule.

## 9. Naming

- Verbs for functions that produce something: `mergeTrajectory`, `buildFailurePatterns`,
  `generateRepairPrompt`, `renderStorybook`.
- `verify*` for a checker returning `VerifierResult`; `evaluate*` for a suite-level gate;
  `assert*` for a guard that throws.
- Types are domain nouns: `NodeMergedTrajectory`, `MergedEvidence`, `NodeMemFailurePattern`. No `I`
  prefix, no `Type` suffix.
- Named checks inside an oracle are `snake_case` strings — `debits_equal_credits`,
  `bucket_partition` — because they are read by humans in output, not called in code.

## 10. What not to add

- **No new dependency** for something Node already does. This repo has no test framework, no
  bundler, no assertion library and no date library, on purpose. Check the standard library first.
- **No config knob for a value that never changes.**
- **No abstraction with one implementation.** `pickSubstrate` has two substrates and is two `if`
  statements; that is the ceiling of indirection here.
- **No documentation website.** Markdown plus the CodeTours in `.tours/`.
