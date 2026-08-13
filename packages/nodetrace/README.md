# @noderl/nodetrace

Record what an agent run did, score it honestly, and turn a failure into the next attempt.

Import everything from the package root:

```ts
import { mergeTrajectory, computeMergedReward, generateRepairPrompt } from "@noderl/nodetrace";
```

## Two halves

The package contains two things that are useful separately. Know which one you are in.

### 1. The loop — pure, no dependencies, no network

This is what the tests cover and what `npm run demo` runs.

| Module | What it does |
|---|---|
| `src/merged.ts` | `mergeTrajectory(...)` joins one run's four slices — browser proof, agent reasoning steps, artifacts produced, evidence grounded — into one `NodeMergedTrajectory`. Never invents a score. |
| `src/mergedReward.ts` | `computeMergedReward(t)` derives the reward components readable off the trace, and labels the rest `unscored:<name>` rather than guessing. |
| `src/repair.ts` | `generateRepairPrompt(t)` and `toRegressionCase(t)` turn a failed run into a coding-agent prompt and a promotable regression case. |
| `src/storybook.ts` | `renderStorybook(t)` renders one trajectory as a single self-contained HTML page — no server, no build, no network. |
| `src/trajectory.ts` | `toTrajectory(capture, meta)` and `toJSONL(...)` export `(state, action, observation, reward)` rows for SFT / DPO / RLVR pipelines. |

Every function is deterministic: no `Date.now`, no `Math.random`, no `new Date`. The same input
produces a byte-identical output, which is what makes a trajectory replayable.

### 2. Live capture — needs an LLM key and a remote browser

`runCapture` drives a real page in an observe -> act -> extract loop and records every step with a
screenshot and the bounding box of the element it acted on.

| Module | What it does |
|---|---|
| `src/pipeline.ts` | `runCapture(opts)` — the loop. Bounded on steps and on one wall-clock budget. |
| `src/reasoning.ts` | `aiSdkReasoner(modelId)` — the default model seam, provider-agnostic via the Vercel AI SDK. |
| `src/substrate/` | `pickSubstrate(env)` — Browserbase when its keys are set, else Firecrawl, else `null`. |
| `src/guards.ts` | URL validation (rejects private and internal addresses) and input clipping. |
| `src/types.ts` | The shared contracts both seams are written against. |

```ts
import { runCapture, aiSdkReasoner, pickSubstrate } from "@noderl/nodetrace";

const substrate = pickSubstrate();          // null when no substrate keys are set
if (!substrate) throw new Error("set BROWSERBASE_* or FIRECRAWL_API_KEY");

const result = await runCapture({
  goal: "extract the revenue table",
  url: "https://example.com/annual-report",
  reasoner: aiSdkReasoner("claude-haiku-4-5"),  // model id, not an object
  substrate,
});
// result.ok === false carries the error and the steps captured so far — never a fake success.
```

Failure is a first-class result, not an exception: `runCapture` returns `{ ok: false, error, steps }`
so a failed run is still a recorded run.

## Dependencies

The loop **modules** import nothing external — `merged.ts`, `mergedReward.ts`, `repair.ts`,
`storybook.ts` and `trajectory.ts` import only each other. Importing them directly gives you the
loop with zero dependencies loaded, which is exactly what `npm run demo` does.

Be aware of the trade-off in `src/index.ts`: it re-exports **both** halves from one entry point, so
`import { mergeTrajectory } from "@noderl/nodetrace"` also loads the capture half and therefore
needs `zod` and the AI SDK present. Verified: with `zod` removed, `npm run demo` still exits 0 while
`test/entrypoints.test.ts` fails on `Cannot find package 'zod'`.

The live-capture half needs `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai` and
`zod`, plus `playwright-core` (optional) for the Browserbase substrate. Bring your own API keys —
this package bundles no secrets. See [`../../SECURITY.md`](../../SECURITY.md).

## Provenance

These sources began life inside the NodeRoom application and were vendored here when NodeRL was
split out. This repository is now the canonical copy: edit it directly.
