# Concerns

What is actually wrong or unproven here. Read this before planning work.

Nothing in this file is speculative — each item names how to reproduce it. Ordered by how much
damage it could do.

## 1. `packages/nodemem` has no tests at all

**The gap:** five modules, roughly 990 lines — `classifier`, `memoryCompiler`, `retrievalPlanner`,
`failureMemory`, `core/types` — and not a single assertion anywhere in the repository.

**Why it matters more than a normal coverage gap.** `rankFacts` decides which remembered facts an
agent sees at the start of its next run. Its ordering is a correctness property, not a preference:
status order first (`source_backed` before `manual` before `graph_inferred` before `needs_review`),
then confidence, with anything older than 30 days downgraded. That ordering is what stops an
unsourced claim from outranking a sourced one merely because it is newer or more confident. If it
silently inverted, an agent would be fed its own unverified guesses as if they were evidence — and
every downstream reward would still look fine.

**Reproduce:** `ls packages/nodemem/test` → no such directory.

**Close it with:** a two-direction test on `rankFacts` (a `needs_review` fact must never outrank a
`source_backed` one), and a determinism test on `compileEpisode(episode, now)`. Both are pure
functions taking `now` as a parameter, so they are straightforward to pin.

## 2. The three proof gates have no tests

**The gap:** `bankerToolBenchEvalLedger.ts`, `bankerToolBenchFullSuiteGate.ts`,
`bankerToolBenchLiveSuiteGate.ts` — 566 lines, zero assertions.

**Why it matters.** These are the modules the README cites by name as the reason its headline claim
is "gate-driven, not hand-asserted". A gate is a promise that a claim cannot flip from blocked to
passed unless the receipts earn it. An untested gate is exactly the thing the repository's own
anti-cheat doctrine warns about: a mechanism trusted because it exists rather than because it was
observed working.

They are pure and deterministic, so this is easy to fix — which makes leaving it undone harder to
justify than gap 1.

**Reproduce:** `grep -rl bankerToolBench packages/*/test/` → no matches.

**Close it with:** a test asserting the gate stays `blocked` when one task is missing a score, and
flips to `passed` only when every expected task is both clean and scored. Assert completion, mean
reward and pass-rate are reported as three separate numbers.

## 3. The live-capture half of `nodetrace` is untested

**The gap:** `pipeline.ts`, `reasoning.ts`, `substrate/browserbase.ts`, `substrate/firecrawl.ts`.

**Why it is ranked below gaps 1 and 2:** it needs a real model and a real remote browser to exercise
end to end, so the cost of covering it is genuinely higher.

**`guards.ts` was the exception and is now covered.** `assertCapturableUrl` is a security control and
is pure, so it needed no network: `packages/nodetrace/test/guards.test.ts` asserts that 23 internal
address forms are rejected — including `::ffff:169.254.169.254`, the IPv4-mapped form of the cloud
metadata endpoint — while ordinary public URLs are still accepted. That second half matters: a guard
that rejects everything is as broken as one that accepts everything.

Still open and cheap:

- **`pickSubstrate` (`substrate/index.ts:10`)** takes `env` as a parameter precisely so it can be
  tested with a fake environment. Three cases, no mocking required.
- **`runCapture`** can be tested against a fake `ReasoningModel` and a fake `BrowserSubstrate` —
  both are interfaces, and `now` is injectable — but that is a larger piece of work.

## 4. The BankerToolBench numbers cannot be reproduced from this repository

The README states all 100 tasks were executed and officially scored at mean reward 0.2519, and that
all 100 are proven through the live product UI.

**Those runs happened in the NodeRoom application, not here.** This repository ships the gate logic
and the contracts; it does not ship the receipt files, the sweep summaries, or the task set. A
reader cannot re-derive the number from what is in this tree.

The claim is scoped honestly in the README — it says completion and scoring, not a 100% pass rate,
and the proof registry deliberately keeps "100% rubric pass rate" under `doesNotProve`. But a cold
reader should know the evidence lives elsewhere. **Do not cite 0.2519 as reproducible from this
repo.**

## 5. `examples/btb-one-task-proven/` is an empty promise

The directory contains one README describing what it "will contain": a redacted proof receipt, a
`trajectory.json`, package-manifest and boundary-box receipts, a visual-judge summary. None of them
exist.

**Reproduce:** `ls -R examples` → one README, nothing else.

This is carried over from the Wave 1 defect ledger (D5) and is left open deliberately: filling it
means publishing real receipt files, which is a content decision, not a refactor. Either populate it
or delete the directory — an example that is a promise is worse than no examples directory, because
it is the one the README calls the honest hero.

## 6. `docs/exists-vs-net-new.md` is a planning document, not a description

It is written in the future tense of a split that has already happened ("% exists today", "net-new to
add", "extracted from `src/nodeagent/capture/...`"). Those NodeRoom paths do not exist in this
repository. Two references to now-deleted files were corrected; the framing was not.

It is kept because the reuse-versus-build reasoning is genuinely useful history. Read it as an
archive, not as a map of the current tree.

## 7. Provenance is now documentation, not machinery

Until recently, `packages/*/src` was generated from the NodeRoom repository by
`scripts/extract-from-noderoom.mjs` driven by `MANIFEST.json`. That mechanism was removed: it could
not run in a standalone clone (it resolved paths against a NodeRoom checkout that is not here), it
exited 1 on a fresh clone, and its existence was the reason two packages had no `index.ts` at all —
the extractor would have overwritten a hand-written one.

**The sources are now hand-maintained here, and this repository is the canonical copy.** If you need
to re-sync from NodeRoom, the generator is recoverable from git history (`git log --diff-filter=D --
scripts/`). See [`../SIMPLIFICATION_REPORT.md`](../SIMPLIFICATION_REPORT.md).

## Not concerns

Two things look like problems and are not:

- **No persistence layer.** Deliberate. Every function is pure so that the same input gives a
  byte-identical output, which is what makes a trajectory replayable and a reward auditable. Storage
  is the adopter's choice. See [ARCHITECTURE.md](ARCHITECTURE.md).
- **No test framework, linter, or bundler.** Deliberate. Node's built-in runner and type stripping
  cover it, and every dependency not added is a dependency that cannot break a clean checkout.
