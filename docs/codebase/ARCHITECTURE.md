# Architecture

## The problem, before any code

A person asks an AI assistant to do real work — reconcile a bank statement, close a month, check a
filing. The assistant produces something that *looks* finished. Sometimes it is. Often it has the
right answer with no working shown, or five citations that do not actually support the claim.

Two things go wrong when you try to improve that system:

1. **You cannot tell a good run from a lucky one.** If the final number is the only thing scored,
   an agent that guesses correctly scores the same as one that reasons correctly — and you will
   train the guessing.
2. **You throw the failures away.** The failed run is the most informative artifact you have and it
   usually ends up in a scrollback buffer.

NodeRL exists for those two problems. It is not a model and not an agent. It is the layer that
*watches* an agent, scores it honestly, remembers the failure, and turns it into both a fix request
and a training row.

## The pipeline

```
Goal → Act → Observe → Evaluate → Reward → Remember → Repair → Export
        │        │          │          │         │         │        │
     NodeTrace  NodeTrace  NodeEval   NodeEval  NodeMem  loop     JSONL
```

Concretely, in this repository:

| Stage | Function | File |
|---|---|---|
| Act / Observe | `runCapture` | `packages/nodetrace/src/pipeline.ts` |
| Join the slices | `mergeTrajectory` | `packages/nodetrace/src/merged.ts` |
| Evaluate | `verifyTrialBalance` and its four siblings | `packages/nodeeval/src/accounting/` |
| Reward | `computeMergedReward` | `packages/nodetrace/src/mergedReward.ts` |
| Remember | `buildFailurePatterns`, `mergeFailureMemory` | `packages/nodemem/src/failureMemory.ts` |
| Repair | `generateRepairPrompt`, `toRegressionCase` | `packages/nodetrace/src/repair.ts` |
| Export | `toTrajectory`, `toJSONL` | `packages/nodetrace/src/trajectory.ts` |
| Show a human | `renderStorybook` | `packages/nodetrace/src/storybook.ts` |

## Why a run has four slices

The central data structure is `NodeMergedTrajectory` (`packages/nodetrace/src/merged.ts:108`). It
exists because **no single observer of an agent run sees the whole run.**

- The **outer** trace is what a browser-side check saw: the URL, screenshots, console errors, and the
  pass/fail assertions it made about the page. It knows what appeared. It has no idea why.
- The **inner** trace is the agent's own log: plan, tool call, verify, final — with cost and latency.
  It knows why. It cannot see whether the result was right.
- **Artifacts** are the deliverables produced, each with an export path and an honest "does it open
  again?" flag.
- **Evidence** is each grounded claim with its source and a status — including `needs_review`, which
  means *nobody has sourced this*.

Joining them is where the diagnosis appears. In the demo run, the outer trace shows the citations
were generic; the inner trace shows step one misrouted the query to `company_search` because no
accounting category existed. Neither slice contains the root cause. The join does.

## The invariant everything is built on

**Never report a score you did not earn.**

That is not a slogan; it is enforced in four named places, each of which is asserted by a test:

| Rule | What it forbids | Enforced at |
|---|---|---|
| `HONEST_SCORES` | a default or floor value standing in for a measurement | `labels.push` (`packages/nodetrace/src/merged.ts:233`), `computeMergedReward` (`packages/nodetrace/src/mergedReward.ts:138`) |
| `HONEST_STATUS` | promoting a failed assertion or a `needs_review` claim | `ui_assertion_failed` (`packages/nodetrace/src/merged.ts:240`), `return { ok: false` (`packages/nodetrace/src/pipeline.ts:133`) |
| `NO-LEAK` | inlining screenshot bytes instead of storing a path | `assertNotInlinedBytes` (`packages/nodetrace/src/merged.ts:182`) |
| `DETERMINISTIC` | any `Date.now`, `Math.random`, or `new Date` in a pure path | `deterministicId` (`packages/nodetrace/src/trajectory.ts:125`) |

The most consequential is the first, and its mechanism is worth stating exactly: **an unmeasured
reward component is `0` *and* carries a label `unscored:<name>`.** The zero alone would be
indistinguishable from a measured zero. The label is what preserves the difference between "we
measured nothing" and "we measured badly" — all the way through to the rendered HTML report, which
`(c) HONEST_SCORES` (`packages/nodetrace/test/storybook.test.ts:107`) asserts.

## Two seams, deliberately

The live-capture loop depends on two interfaces and no concrete implementations:

- **`ReasoningModel`** (`packages/nodetrace/src/types.ts:74`) — anything that returns a structured
  decision. Note it never receives a browser handle. The model cannot click. It describes what it
  wants done, and the loop `.parse`s that description before acting on it.
- **`BrowserSubstrate`** (`packages/nodetrace/src/types.ts:86`) — the thing that opens, observes and
  acts on a page.

The division of labour, from the header comment of `pipeline.ts`: **the loop owns reliability, the
model owns judgement, the substrate owns the browser.** Each responsibility sits with the part that
can discharge it. The model cannot be trusted to stop; the loop enforces a 12-step and 60-second
ceiling. The loop cannot read a page; the model can.

## What is deliberately absent

**Persistence.** Nothing anywhere in this repository opens a database or writes a file. `toJSONL`
returns a string; `mergeFailureMemory` returns a new array; `buildFailurePatterns` takes `now` as a
required argument rather than reading the clock.

This is the property the loop half rests on. With no clock, no randomness and no IO, the same input
produces a byte-identical output — which is what makes a trajectory *replayable* and a reward
*auditable* by someone who does not trust you. Adopters bring their own storage.

Be precise about which code that covers, because it is not all of it:

| | Reads the network | Reads the clock | Reads the environment |
|---|---|---|---|
| the loop — `merged`, `mergedReward`, `repair`, `storybook`, `trajectory`, the `nodeeval` accounting oracles | no | no | no |
| `nodemem` | no | `compileEpisode` and `rankFacts` default `now` to `Date.now()` — pass it for determinism | no |
| `bankerToolBenchEvalLedger` | no | `buildBtbLedgerImport` defaults `generatedAt` to `new Date()` — pass it for determinism | no |
| live capture — `pipeline`, `reasoning`, `substrate/*` | yes: `fetch` to Browserbase / Firecrawl, and the provider call the AI SDK makes | `Date.now` for the time budget, overridable via `now` | yes: the five API keys |

No row writes a file. The distinction that matters is that a claim of *replayable* belongs to the
top row: hand it the same trajectory and it returns the same bytes forever.

**A framework.** No dependency-injection container, no plugin registry, no event bus. `pickSubstrate`
(`packages/nodetrace/src/substrate/index.ts:10`) is the entire tool registry: one function, two `if`
statements, returning `null` when nothing is configured rather than fabricating a fake browser.

## Reading order

1. `npm run demo` — see it work.
2. [`../START_HERE.md`](../START_HERE.md) — the same run traced through the code, in execution order.
3. `.tours/01-primary-user-flow.tour` — the same path, in your editor, on the live source.
4. `packages/*/src/index.ts` — what each package offers.
