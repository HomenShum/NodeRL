# START HERE

This walks one real command through the code **in the order it executes**, not in the order an
architecture diagram would draw it. Follow it top to bottom and you will have traced the whole
product.

## The situation this code is for

An accountant asks an AI assistant to reconcile a bank statement against the general ledger. The
assistant answers `$12,128.25` — which is *correct* — but shows none of the arithmetic, and backs it
with five citations that are generic "how to reconcile" articles rather than anything about this
accountant's actual numbers.

A human reviewer would call that a bad answer with a right number. Most agent systems would score it
as a pass, because the number matches. **NodeRL's whole job is to be the thing that does not.** It
records the run, scores it from signals it can actually see, and writes the prompt that asks a
coding agent to fix the cause.

Run it:

```bash
npm install
npm run demo
```

That run is the one traced below. Every step names a real file and symbol you can open.

---

## Step 1 — The entry point

**File:** `experiments/fr-a1-runs/fr-a1-live-run-001-build.mjs`
**Symbol:** the module body (top-level, no wrapping function)
**Called by:** `npm run demo` → `node experiments/fr-a1-runs/fr-a1-live-run-001-build.mjs`
**Calls next:** `mergeTrajectory`

**Why this exists**
There is no server and no web page in this repository, so "the entry point" is a script. This one
holds a real captured agent run — the bank-reconciliation failure described above — as plain data.
It is the smallest complete example of the loop, which is why it is wired to `npm run demo`.

**Core code**
```js
import { mergeTrajectory } from "../../packages/nodetrace/src/merged.ts";
import { generateRepairPrompt, toRegressionCase } from "../../packages/nodetrace/src/repair.ts";
```

Note the `.ts` extension on an import inside a `.mjs` file. That is deliberate and it is the reason
this repo needs no build step: Node 22 strips the types and runs the TypeScript directly.

**Input** — none; the run data is literal in the file.
**Output** — two blocks on stdout: a repair prompt, then a regression case as JSON.
**Failure behavior** — on Node older than 22.18 the process exits with a syntax or resolution error,
because type stripping is not available. `package.json` declares `"engines": { "node": ">=22.18" }`.
**Next** — the script assembles its four slices, Step 2.

---

## Step 2 — The primary user action: describe what the run did

**File:** `experiments/fr-a1-runs/fr-a1-live-run-001-build.mjs`
**Symbol:** the `outer`, `inner`, `meta` objects (lines 4, 14, 23)
**Called by:** the module body
**Calls next:** `mergeTrajectory`

**Why this exists**
A single agent run is observed from several places at once, and no one of them is the whole truth.
The browser-side check saw what appeared on screen. The agent's own log saw what it was thinking and
what each step cost. Neither knows about the other. This step is where a caller hands NodeRL all the
slices it has.

- **outer** — what a browser-side check observed: the URL, screenshots, console errors, and the
  pass/fail *assertions* it made against the page.
- **inner** — the agent's own reasoning steps, each with a phase (`plan` / `tool` / `verify` /
  `final`), what it did, what it observed, and what it cost.
- **meta** — identity for the run, plus any reward components the product side already knows.

**Core code**
```js
uiAssertions: [
  { id: "assert-correct-tie-out", /* ... */ passed: true },
  { id: "assert-shows-math",      /* ... */ passed: false },
  { id: "assert-evidence-grounded-in-users-numbers", /* ... */ passed: false },
],
```

Two of three assertions failed. That is the ground truth everything downstream is derived from — and
nothing later in the pipeline is allowed to soften it.

**Input** — a human or a capture harness writes these three objects.
**Output** — three plain objects, no classes, no framework types.
**Failure behavior** — none yet; nothing has been validated.
**Next** — `mergeTrajectory` in Step 3.

---

## Step 3 — Validation and the domain types

**File:** `packages/nodetrace/src/merged.ts`
**Symbol:** `mergeTrajectory` (line 273)
**Called by:** the demo script, and any capture harness
**Calls next:** `deterministicId` (in `trajectory.ts`), and `buildReward` when a reward was supplied

**Why this exists**
This is the boundary where loose caller data becomes a trusted `NodeMergedTrajectory`. Below this
line, the rest of the system may assume the shape is correct. Three rules are enforced here rather
than merely documented, because each one had a way of going quietly wrong:

- **NO-LEAK** — screenshots must be stored paths. If a caller passes raw bytes or a `data:` URI,
  `assertNotInlinedBytes` (line 182) *throws*. Silently embedding a screenshot would put page
  contents into every copy of the trace.
- **SEQUENTIAL** — `stepIndex` is re-stamped `0..n`, so a gap in what the caller supplied cannot
  become a gap in the training data.
- **HONEST_SCORES** — a reward is attached **only** if the caller supplied one (line 321). A missing
  score stays missing rather than becoming a zero that looks like a measurement.

**Core code**
```ts
export function mergeTrajectory(inner, outer, artifacts, evidence, meta): NodeMergedTrajectory {
  outer.screenshots.forEach((s, i) =>
    assertNotInlinedBytes(s.path, `outerTrace.screenshots[${i}].path`));
  const steps = inner.steps.map((s, i) => ({ ...s, stepIndex: i }));
  // ...
  if (meta.reward !== undefined) merged.reward = buildReward(/* ... */);
  return merged;
}
```

**Input** — the four loose slices plus `meta`.
**Output** — one `NodeMergedTrajectory` (type at line 108). Pure: the caller's arrays are copied, never
mutated.
**Failure behavior** — throws on a NO-LEAK violation. Everything else is total: absent optional
fields become empty arrays, never `undefined` holes.
**Next** — scoring, Step 5. (Step 4, agent orchestration, is where this data *came from*.)

---

## Step 4 — Agent orchestration

**File:** `packages/nodetrace/src/pipeline.ts`
**Symbol:** `runCapture` (line 56)
**Called by:** your own harness — **not** by the demo
**Calls next:** `reasoner.decide(...)` and `substrate.open/act/locate`

**Why this exists**
The demo replays a run that already happened. This is the code that *produces* one: an observe →
act → extract loop that drives a real web page with a model in the driver's seat.

Read it as a division of labour. **The loop owns reliability** — step budget, wall-clock budget, and
the guarantee that a failure is still recorded. **The model owns judgement** — it looks at the page
and says what to do next. **The substrate owns the browser.** Swapping the model or the browser
provider touches neither of the others.

**Core code**
```ts
const decision = await opts.reasoner.decide({
  system: ACT_SYSTEM, instruction: opts.goal,
  context: { url: rep.url, title: rep.title, a11y: clipRepresentation(rep.a11y), screenshot: shot },
  schema: DecisionSchema, signal: ctl.signal,
});
if (decision.done || !decision.action) { /* stop acting, go extract */ }
```

`DecisionSchema` is a Zod schema, so a model reply that is not a valid action is rejected at the
seam rather than halfway down the loop.

**Input** — a URL, a goal, a `ReasoningModel`, a `BrowserSubstrate` (contracts at `types.ts:74` and
`types.ts:86`).
**Output** — a `CaptureResult` (`types.ts:55`): every step with its screenshot and the bounding box
of the element acted on.
**Failure behavior** — **returns**, never throws: `{ ok: false, error, steps }` at line 123, keeping
the steps captured so far. A failed run is still a recorded run. This is the same honesty rule as
Step 3, applied to control flow.
**Next** — `toTrajectory` converts a `CaptureResult` into an exportable trajectory
(`trajectory.ts:233`).

---

## Step 5 — Tool registration and invocation

**File:** `packages/nodetrace/src/substrate/index.ts`
**Symbol:** `pickSubstrate` (line 10)
**Called by:** your harness, to build the `substrate` argument for `runCapture`
**Calls next:** `browserbaseSubstrate()` or `firecrawlSubstrate()`

**Why this exists**
"Tools" in this system means the ways an agent can touch the outside world, and there is exactly one
registry for them — this function. It is deliberately not a plugin framework. It reads the
environment and picks the most capable browser that is actually configured.

**Core code**
```ts
export function pickSubstrate(env = process.env): BrowserSubstrate | null {
  if (env.BROWSERBASE_API_KEY && env.BROWSERBASE_PROJECT_ID) return browserbaseSubstrate();
  if (env.FIRECRAWL_API_KEY) return firecrawlSubstrate();
  return null;
}
```

Browserbase is preferred because it can click and can report exact element boxes; Firecrawl is
screenshot-and-extract only. With neither configured it returns `null` — it does not fabricate a
fake browser, so the caller must handle "no substrate" explicitly.

Every outbound URL first passes `assertCapturableUrl` (`guards.ts:71`), which rejects `localhost`,
`.local`, `.internal` and private IP literals, and applies an optional host allowlist. Hard ceilings
live in `CAPTURE_LIMITS` (`guards.ts:12`): 12 steps, a 60-second budget, 24k characters of page text,
64 extracted fields.

**Input** — the process environment.
**Output** — a `BrowserSubstrate`, or `null`.
**Failure behavior** — `null` rather than a throw; `runCapture` then fails honestly at the first use.
**Next** — persistence, Step 6.

---

## Step 6 — Persistence and artifact mutation

**This stage does not exist in this repository, and that is a design decision, not a gap.**

Every function in all three packages is pure. Nothing opens a database, writes a file, or mutates
global state. The closest things to persistence, and what they actually do:

| What you might expect | What actually happens | Where |
|---|---|---|
| Save the trajectory | `toJSONL(trajectories)` returns a **string**, one trajectory per line, in sorted key order. The caller writes it. | `packages/nodetrace/src/trajectory.ts:464` |
| Update the failure store | `mergeFailureMemory(existing, incoming, passed)` returns a **new array** — resolved patterns dropped, incoming upserted. | `packages/nodemem/src/failureMemory.ts:81` |
| Record time | Nothing reads the clock. `buildFailurePatterns(failures, now)` takes `now` as an argument. | `packages/nodemem/src/failureMemory.ts:59` |

The reason is testability, and it is the property the whole repo is built on: with no clock, no
randomness and no IO, the same input always produces a byte-identical output. That is what makes a
trajectory *replayable* and a reward *auditable*. Adopters choose their own storage.

**Next** — rendering, Step 7.

---

## Step 7 — Streaming and rendering

**File:** `packages/nodetrace/src/storybook.ts`
**Symbol:** `renderStorybook` (line 300)
**Called by:** any reviewer tooling; covered by `test/storybook.test.ts`
**Calls next:** the per-card atom functions in the same file

**Why this exists**
There is no streaming here — nothing is incremental, because the trace is complete before anyone
looks at it. What exists instead is a way to *hand a run to a person*: one merged trajectory becomes
one self-contained HTML file that opens with no server, no build and no network. A reviewer or a
judge can be sent the file itself.

It is assembled from small pure "atom" functions — one per visual card (`ChatMessageAtom`,
`EvidenceCardAtom`, `VerdictBadgeAtom`, `CostBadgeAtom`) — so each can be tested alone.

**Core code**
```ts
export function esc(value: unknown): string { /* line 42 — escapes < > & " ' */ }
```

`esc` matters more than it looks: evidence claims and observed text come from web pages and from
model output. Rendering them unescaped would let a captured page inject live markup into the report
about it. `packages/nodetrace/test/storybook.test.ts:165` asserts a claim containing HTML is escaped, not injected.

**Input** — one `NodeMergedTrajectory`.
**Output** — an HTML string. Deterministic: no timestamp, no nonce, array order preserved.
**Failure behavior** — throws if a screenshot carries inlined bytes, the same NO-LEAK rule as Step 3
so the report cannot leak what the trace refused to.
**Next** — failure and recovery, Step 8.

---

## Step 8 — Failure and recovery

**File:** `packages/nodetrace/src/repair.ts`
**Symbol:** `generateRepairPrompt` (line 45) and `toRegressionCase` (line 23)
**Called by:** the demo script, lines 36 and 38
**Calls next:** `computeMergedReward` (`mergedReward.ts:138`)

**Why this exists**
This is the payoff, and the reason to keep a failed run at all. A failure is turned into two
artifacts: instructions precise enough for a coding agent to act on, and a test case so the same
failure cannot come back unnoticed.

The prompt is built **only** from what is in the trace. It never proposes a fix. It states which
assertion failed and what was observed instead, then asks the coding agent to find the root cause
itself — because a repair prompt that guesses at the fix teaches the agent to guess too.

**Core code**
```ts
const verdict = failed.length === 0 && errorSteps.length === 0 ? "PARTIAL/REVIEW" : "FAIL";
// ...
L.push(`## What failed (ground truth — do NOT guess)`);
for (const a of failed) L.push(`- **${a.id}** — expected: ${a.expected} · observed: ${a.observed}`);
```

Scoring sits just upstream, in `computeMergedReward`. Its rule is a three-way ladder: a **supplied**
component is carried verbatim; an unsupplied one that can be **derived** from the trace is derived; a
component with neither is `0` **and** labelled `unscored:<name>`. There is no floor and no default
credit — an unmeasured thing is visibly unmeasured rather than quietly zero.

**Input** — one `NodeMergedTrajectory`.
**Output** — a markdown prompt, and a `RegressionCase` carrying the failed assertions, the failure
categories, and the unsourced claims that must be resolved or dropped.
**Failure behavior** — total. A run with nothing wrong yields `PARTIAL/REVIEW` and an expectation
that the passing assertions keep passing.
**Next** — the tests, Step 9.

---

## Step 9 — The tests that prove this flow

`npm test` runs 12 files through Node's built-in test runner. There is no test framework installed.
Each file is a plain script using `node:assert/strict`; a non-zero exit is a failure.

| The claim | The test that would catch it breaking |
|---|---|
| Each package can be imported by its own name | `test/entrypoints.test.ts:63` |
| Step indexes are contiguous after a merge | `packages/nodetrace/test/merged.test.ts:59` |
| Screenshot bytes are rejected, not inlined | `packages/nodetrace/test/merged.test.ts:90` |
| A failed assertion survives the merge unflipped | `packages/nodetrace/test/merged.test.ts:161` |
| An unsupplied score is labelled, never floored | `packages/nodetrace/test/mergedReward.test.ts:131` |
| The repair prompt quotes the real observed text | `packages/nodetrace/test/repair.test.ts:25` |
| The same trace gives a byte-identical prompt | `packages/nodetrace/test/repair.test.ts:57` |
| Report HTML escapes hostile claim text | `packages/nodetrace/test/storybook.test.ts:165` |
| Each accounting oracle rejects a bad answer **by the right named check** | `packages/nodeeval/test/accounting_trialBalance.test.ts:98` |

That last row is the anti-rubber-stamp rule, and it is the bar every oracle test is written to: a
verifier that always returns "pass" would satisfy a test that only checks good input. So every
oracle test asserts **both** directions — accept a correct answer, and reject a wrong one *naming the
specific invariant that broke*.

## Where you would add one thing

**A new reward component:** add it to `MERGED_REWARD_COMPONENTS` (`merged.ts:132`), derive it in
`computeMergedReward` if the trace carries a signal for it, and if it does not — leave it unscored.
Then add a case to `mergedReward.test.ts` proving an unsupplied value is labelled rather than
floored.

**A new accounting oracle:** copy the shape of `packages/nodeeval/src/accounting/trialBalance.ts`,
return `summarize(name, checks)` with named checks, export it from
`packages/nodeeval/src/index.ts`, and write the two-direction test before the implementation.
