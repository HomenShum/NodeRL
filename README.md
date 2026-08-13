# NodeRL

**Turn failed agent runs into the next better attempt — and into training data.**

When you run an AI agent on a real task, it often half-succeeds: it gets the number right but shows
no working, or cites five sources that do not actually support the claim. That run is normally
thrown away. NodeRL keeps it: it records what the agent did, scores it against honest signals,
remembers the failure, and writes the prompt that asks a coding agent to fix the cause.

```
Goal → Act → Observe → Evaluate → Reward → Remember → Repair → Export
        │        │          │          │         │         │        │
     NodeTrace  NodeTrace  NodeEval   NodeEval  NodeMem  loop     JSONL
                                                                  (SFT/DPO/RLVR)
```

NodeRL is the **environment + reward + memory + dataset-exporter** layer, not a model. It works
around whatever agent host you already use — Codex, Claude Code, Windsurf, Devin, or your own.

## Quickstart

Needs **Node 22.18 or newer** and nothing else. No API key, no database, no build step.

```bash
git clone https://github.com/HomenShum/NodeRL.git
cd NodeRL
npm install     # 19 packages, none of which the demo actually loads
npm test        # 14 test files, 14 pass
npm run demo    # one real failed run, end to end
```

`npm run demo` replays a captured agent run that got a bank reconciliation *numerically right and
methodologically wrong*, and prints the two things NodeRL produces from it:

1. a **repair prompt** naming each failed assertion with its observed text — ground truth, not a guess,
2. a **regression case** as JSON, so that failure cannot silently come back.

Node runs the TypeScript directly (type stripping), so there is no compile step. `npm run typecheck`
runs `tsc` as a checker only.

**New here? Read [`docs/START_HERE.md`](docs/START_HERE.md)** — it walks the demo through the code in
the order it actually executes.

## The three packages

| Package | What it is | Depends on |
|---|---|---|
| [`packages/nodetrace`](packages/nodetrace) | Record a run, join its slices, score it, repair it, export it | the loop modules import nothing; live capture needs an LLM key + a remote browser |
| [`packages/nodeeval`](packages/nodeeval) | Deterministic accounting oracles + suite-level proof gates | nothing |
| [`packages/nodemem`](packages/nodemem) | Classify / compile / retrieve memory + a failure store | nothing |

Import each from its package root: `import { mergeTrajectory } from "@noderl/nodetrace";`

## The one rule everything here follows

**Never report a score you did not earn.** It shows up as three concrete behaviours, each enforced
in code rather than asked for in a comment:

- A reward component with no signal in the trace is `0` **and** labelled `unscored:<name>` — never a
  hardcoded floor.
- A failed UI assertion or a `needs_review` citation is carried through verbatim. Nothing promotes
  it. The failure is the signal.
- Screenshots are stored as paths. Passing raw bytes throws rather than silently inlining them.

Read [`spec/anti-cheat-doctrine.md`](spec/anti-cheat-doctrine.md) and
[`spec/prove-before-claim.md`](spec/prove-before-claim.md) for why each exists.

## The proof story (honest scope)

All 100 BankerToolBench tasks were executed and officially scored (Gandalf), clean generic-only with
no answer-key writers, at **mean reward 0.2519**. That is full-suite *completion and scoring*, not a
100% pass rate, and the proof registry deliberately keeps "100% rubric pass rate" under
`doesNotProve`. All 100 are also proven through the live product UI (fresh room → upload → public
agent → export → reopen → package verifier → visual judge), with file-backed per-task receipts.

Both flips are gate-driven rather than hand-asserted — the gates are
[`packages/nodeeval/src/bankerToolBenchFullSuiteGate.ts`](packages/nodeeval/src/bankerToolBenchFullSuiteGate.ts)
and
[`packages/nodeeval/src/bankerToolBenchLiveSuiteGate.ts`](packages/nodeeval/src/bankerToolBenchLiveSuiteGate.ts).
The runs those gates scored happened in the NodeRoom application; this repository ships the gate
logic and the contracts, not the receipt files.

## Documentation

- [`docs/START_HERE.md`](docs/START_HERE.md) — the demo, traced through the code in runtime order
- [`docs/codebase/`](docs/codebase) — stack, structure, architecture, conventions, integrations, testing, concerns
- [`docs/SIMPLIFICATION_REPORT.md`](docs/SIMPLIFICATION_REPORT.md) — what was removed and the commands that prove it
- [`.tours/`](.tours) — CodeTour walkthroughs (VS Code extension `vsls-contrib.codetour`)

## Spec

- [`spec/trajectory-schema.md`](spec/trajectory-schema.md) · [`spec/reward-design.md`](spec/reward-design.md)
- [`spec/proof-receipt-contract.md`](spec/proof-receipt-contract.md) · [`spec/anti-cheat-doctrine.md`](spec/anti-cheat-doctrine.md)
- [`spec/prove-before-claim.md`](spec/prove-before-claim.md) — the agent-side honesty gate
- [`spec/node-loops.md`](spec/node-loops.md) + [`NODE-LOOPS.md`](NODE-LOOPS.md) — this repo's self-improving loop manifest
- [`spec/manifest-lint.md`](spec/manifest-lint.md) — author-time lint for `NODE-LOOPS.md`
- [`docs/thesis.md`](docs/thesis.md) · [`docs/literature-review.md`](docs/literature-review.md) · [`docs/exists-vs-net-new.md`](docs/exists-vs-net-new.md) · [`docs/looper-foraging.md`](docs/looper-foraging.md)
- Experiments: [`experiments/NodeRL-BTB-ToolPolicy-v0.md`](experiments/NodeRL-BTB-ToolPolicy-v0.md) · [`experiments/Substrate-Ablation-v0.md`](experiments/Substrate-Ablation-v0.md)

## Related

- **Solo Founder Agent Builder** (`github.com/HomenShum/solo-founder-nodes`) — the curriculum + repair
  loop that *generates* the trajectories NodeRL records, scores, and trains on.
- **looper** (`github.com/ksimback/looper`, MIT, Kevin Simback) — a complementary loop-*design* coach.
  looper designs the loop; `NODE-LOOPS.md` declares it; NodeRL runs, records and rewards it. Patterns
  foraged into this stack are catalogued with attribution in
  [`docs/looper-foraging.md`](docs/looper-foraging.md).

## License

MIT © 2026 Homen Shum. **Bring your own API keys** — this library bundles no secrets. See
[`SECURITY.md`](SECURITY.md).
