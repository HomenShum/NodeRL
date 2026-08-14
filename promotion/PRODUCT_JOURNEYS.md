# Canonical journeys — NodeRL

Three to five real workflows. Not feature tours: a journey is one person, one
goal, and the artifact they hold when it worked. These are the promotion loop's
work queue, exercised in order of importance.

**A journey with no browser evidence is unfinished**, regardless of test status.

NodeRL has no browser surface (zero UI files in `git ls-files`, no server entry
point), so under the `reduced` variant the surface a stranger actually meets is
the README quickstart and the runnable scripts in the tree. Every journey below
names the file it drives. Evidence here is captured terminal output plus an exit
code; a screenshot is impossible where nothing renders, and that impossibility is
itself measured and scored — see conditions 3–10 in PRODUCT_GOAL.md, and
`promotion/evidence/rendered-surface-probe.mjs` for the measurement that decides
them.

## Journey shape

Each journey states, in this order:

- **Persona and situation** — who arrived, and why today.
- **Goal** — what they want to be true when they leave.
- **Steps** — what they actually do, in the UI, in order.
- **Done when** — the observable artifact or state that proves completion.
- **Evidence** — path to the capture that shows it working. Empty until proven.

---

## J1 — "I cloned it. What do I type?"

- **Persona and situation:** Priya leads a small team whose coding assistant keeps
  making the same mistake twice. A colleague sent her this repo. She has ten
  minutes before a meeting and wants to see the thing work once before she
  commits an afternoon to it.
- **Goal:** Clone, run one command the README told her to run, and see a real
  result on screen.
- **Steps:**
  1. `git clone https://github.com/HomenShum/NodeRL.git && cd NodeRL`
  2. Read `README.md` looking for an install or usage section.
  3. Run whatever command it names.
- **Done when:** A command copied from `README.md` produces a working result and
  exits 0.
- **Status:** **FAIL.** `README.md` has no install, quickstart or usage section —
  its headings run Status → What's real today → What's coming → The proof story →
  Packages → Spec → Related → License. The only runnable command it states is
  `node scripts/extract-from-noderoom.mjs --dry-run` (README:73, annotated
  "Verified 2026-06-28: 18/18 files resolve"), which exits **1** with
  `0 file(s) resolved, 18 missing` in a standalone clone. Defects D1, D2.
- **Evidence:** `promotion/PROMOTION_LOG.md` — Baseline run attempts, rows 3 and 6.

## J2 — "Prove the scorer would reject a wrong answer"

- **Persona and situation:** Marcus is an accountant asked to trust an automated
  check that says a reconciliation "passed". He has been burned by a verifier that
  approved everything, so before he believes a pass he wants to watch it fail on
  a deliberately broken input.
- **Goal:** See the deterministic accounting oracles accept a good trial balance
  and reject a bad one *by named invariant*, with the same input twice giving the
  same answer.
- **Steps:**
  1. `npm install`
  2. `npx tsx packages/nodeeval/test/accounting_trialBalance.test.ts`
  3. Repeat for `accounting_bankReconciliation`, `accounting_journalEntry`,
     `accounting_arApAging`, `accounting_cashFlowIndirect`.
- **Done when:** Each run prints `RESULT: PASS (accepts GOOD, rejects BAD by named
  check, deterministic)` and exits 0.
- **Status:** **Drivable.** All five plus
  `packages/nodeeval/src/accounting/oracleTypes.test.ts` exit 0. Reached only by
  guessing `tsx` — the repo never names a runner (D3).
- **Evidence:** `promotion/PROMOTION_LOG.md` — Baseline run attempts, row 5.

## J3 — "Turn yesterday's failed run into tomorrow's fix"

- **Persona and situation:** Priya, back after the meeting. Her assistant answered
  a bank-reconciliation question with the right final number but showed no
  arithmetic and cited five generic how-to articles instead of her figures. She
  wants that failure written down as an instruction, not as a note-to-self.
- **Goal:** Take one recorded run and get back a repair prompt that names the
  assertions that failed, plus a regression case so the same failure cannot come
  back quietly.
- **Steps:**
  1. `npx tsx experiments/fr-a1-runs/fr-a1-live-run-001-build.mjs`
  2. Read the printed repair prompt and the regression JSON.
- **Done when:** stdout contains `verdict: **FAIL**` with a computed total reward,
  each failed assertion listed as expected-vs-observed, and a
  `regression_<trajectoryId>` JSON block.
- **Status:** **Drivable under `tsx` only.** Prints verdict FAIL, total reward
  0.238, failure categories `ui_assertion_failed, evidence_needs_review`, both
  failed assertions with observed text, and the regression case. Under plain
  `node` — which is what a `.mjs` extension advertises — it exits **1** with
  `ERR_MODULE_NOT_FOUND` on `packages/nodetrace/src/trajectory` (D4).
- **Evidence:** `promotion/PROMOTION_LOG.md` — Baseline run attempts, rows 7 and 8.

## J4 — "Give me the run as training data"

- **Persona and situation:** Dan trains models. He does not care about anyone's
  dashboard; he wants one line per step in a file, no embedded image bytes, and
  the same bytes if he exports the same run twice — otherwise it is not a dataset,
  it is a log.
- **Goal:** Export a recorded capture as `(state, action, observation, reward)`
  JSONL and confirm it is deterministic and leak-free.
- **Steps:**
  1. `npx tsx packages/nodetrace/test/trajectory.test.ts`
  2. Read `packages/nodetrace/src/trajectory.ts` for the exported entry points
     (`toTrajectory`, `toJSONL`, `summarizeReward`).
- **Done when:** All five scenarios print PASS — including
  `(c) DETERMINISM: same input twice -> byte-identical JSONL`,
  `(d) NO-LEAK: ... bytes absent from JSONL, path present`, and
  `(e) HONEST_SCORES: omit taskSuccess -> 0 + 'unscored:taskSuccess' label, not a floor`.
- **Status:** **Drivable, but only through the test file.** There is no example
  script or documented snippet that exports a trajectory; the test is the sole
  executable demonstration. `examples/btb-one-task-proven/` — the repo's only
  example directory — holds a README promising a receipt, a `trajectory.json` and
  a judge summary, and contains none of them (D5).
- **Evidence:** `promotion/PROMOTION_LOG.md` — Baseline run attempts, row 4.

## J5 — "Refresh the vendored packages from the source of truth"

- **Persona and situation:** Homen maintains this repo. `EXTRACTION.md` says the
  package sources are generated from NodeRoom and must never be hand-edited, so
  before touching anything he re-runs the generator to confirm the map still
  resolves.
- **Persona note:** this is the maintainer journey, and it is the one the README
  puts a verification date on, so a stranger reads it as the repo's health check.
- **Goal:** Confirm `MANIFEST.json` still resolves 18/18 against the source, then
  regenerate.
- **Steps:**
  1. `npm run extract:check`
  2. On green, `npm run extract`
- **Done when:** Step 1 prints `18 file(s) resolved, 0 missing` and exits 0.
- **Status:** **FAIL.** Exits **1**: all 18 files report `MISSING`, ending
  `[dry-run] 0 file(s) resolved, 18 missing.` The generator resolves against a
  NodeRoom checkout that a standalone clone does not contain, and nothing in the
  repo says so — the README instead states the opposite as verified (D1).
- **Evidence:** `promotion/PROMOTION_LOG.md` — Baseline run attempts, row 6.

---

## Journeys every agent surface owes

If this product runs an agent on the user's behalf, at least one journey must
exercise each of these, because they are where agent products fail a stranger:

- **Recovery** — something goes wrong mid-run (network, model, bad input) and the
  user gets back to a good state without reloading or losing work.
- **Steering** — the user corrects the agent partway through and the correction
  visibly takes effect.
- **Receipt** — after a consequential action, the user can see what changed and
  where it came from.

Absence must be a decision, not an omission: if one does not apply, say so and
say why.

**Decision for NodeRL.** NodeRL does not run an agent for the user. It sits
beside whatever agent host the user already runs (Codex, Claude Code, their own
loop) and records, scores and remembers what that agent did. There is no
NodeRL-owned run in flight for a person to rescue or redirect, which is why the
first two do not apply here:

- **Recovery — does not apply.** Nothing of the user's is in flight inside
  NodeRL; a failed run is an *input* to it. The nearest thing is honest failure
  handling in the recorder, exercised as scenario (b) of J4
  (`ok:false` + error preserved, reward not positive-coerced), not as a user
  rescuing their own session.
- **Steering — does not apply.** The correction NodeRL offers is not mid-run
  steering; it is the between-runs repair prompt, which is J3.
- **Receipt — applies, and is J3.** The repair prompt plus regression case is the
  receipt: it names each failed assertion with expected-vs-observed text and the
  trajectory it came from, so the user can see what was judged and on what basis.
  The written contract for this is `spec/proof-receipt-contract.md`. The gap is
  that no *populated* receipt ships — `examples/btb-one-task-proven/` is an empty
  promise (D5), so the receipt is provable only by running J3 yourself.
