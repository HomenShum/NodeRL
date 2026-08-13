# @noderl/nodemem

What an agent should remember between runs, and what it should be handed at the start of the next
one. Pure functions — storage is deliberately the caller's problem, so nothing here reaches for a
database.

```ts
import { classifyNoteworthy, compileEpisode, planRetrieval, rankFacts } from "@noderl/nodemem";
```

## Three jobs, plus a failure store

| Module | Function | What it decides |
|---|---|---|
| `src/core/classifier.ts` | `classifyNoteworthy(text)` | Is this text worth remembering at all, what entity is it about, and what should happen next (research job / coach cue / index only / ignore)? |
| `src/core/memoryCompiler.ts` | `compileEpisode(episode, now)` | One finished episode -> the durable entities, facts and decisions it should leave behind. `mergeEntities` folds them into what is already known. |
| `src/core/retrievalPlanner.ts` | `planRetrieval(request)`, `rankFacts(facts, plan, now)` | Given the next goal, which memory shelves to read, through which lanes, and how to rank what comes back. |
| `src/failureMemory.ts` | `buildFailurePatterns`, `mergeFailureMemory`, `repairTargets` | Turn per-task failures into deduped patterns, drop the ones that now pass, and return exactly which tasks a re-run should target. |

`src/core/types.ts` holds the record shapes everything else is written in terms of —
`NodeMemEpisode`, `NodeMemEntity`, `NodeMemFact`, `NodeMemDecision`, `NodeMemFailurePattern`,
`NodeMemContextPack`, and the shelves they live on.

## How facts rank

Facts sort by **status order** first (`source_backed` < `manual` < `graph_inferred` <
`needs_review` < `superseded`), then by confidence. Anything older than 30 days is downgraded.
Retrieval lanes — exact, bm25, semantic, graph, recent, visibility-filter — are selected by task
kind, not fixed.

The ordering is the honesty mechanism: a claim nobody sourced can never outrank a sourced one just
because it is more recent or more confident.

## Determinism

`compileEpisode` and `buildFailurePatterns` take `now` as an argument rather than reading the clock.
That is what makes their output testable: same episode plus same `now` gives the same records.

## Known gaps

- **No tests.** This package has none, which is the largest test gap in the repo. See
  [`../../docs/codebase/CONCERNS.md`](../../docs/codebase/CONCERNS.md).
- **No recall-lift number is published.** The A/B in the source repo ran only the "bare" variant and
  had a variant-isolation bug, so no benchmark claim is made here.

## Privacy

Episode `rawText` and context-pack JSON can carry personal data. Ship synthetic seeds only, and
redact before persisting real runs. See [`../../SECURITY.md`](../../SECURITY.md).

## Provenance

These sources began life inside the NodeRoom application and were vendored here when NodeRL was
split out. This repository is now the canonical copy: edit it directly.
