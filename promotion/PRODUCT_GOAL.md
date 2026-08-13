# Product goal — NodeRL

## Who opens this, and what they are trying to finish

Someone spent the afternoon watching an automated assistant do a job for them —
pull the reconciled figure out of a bank statement, read a filing, write a patch
— and it got most of it right and one part wrong. They fixed that part by hand.
Tomorrow it will get the same part wrong again, because nothing wrote down what
happened: what the assistant looked at, what it chose to do, which step went bad,
and what "correct" would have been. They arrive here wanting a record of that run
detailed enough to argue with — every step, every screenshot, a score a second
person could recompute from the same inputs, and a written instruction for the
next attempt that names the check that failed instead of guessing at it. When it
has worked, they walk away holding three things: a step-by-step transcript of the
run, a verdict with its arithmetic shown, and a repair prompt they can hand
straight back to the assistant. That same transcript, written out one line per
step, is also the training data a reinforcement-learning team needs (a
*trajectory* in `(state, action, observation, reward)` form). NodeRL is the
recording, scoring and remembering layer wrapped around whatever assistant they
already run — Codex, Claude Code, their own — not another assistant.

## The gate

This repo is judged by the twelve-condition PROMOTION gate, which lives in one
place and is not restated here:

**https://github.com/HomenShum/NodeKit/blob/main/templates/promotion/GATE.md**

Gate variant: `reduced` <!-- reduced = library/CLI judged on its demo
surface and quickstart; see the GATE's reduced-gate section -->

Scoring vocabulary is PASS / FAIL / **UNVERIFIED**, and UNVERIFIED is never PASS.

## Canonical journeys

The work queue lives in [PRODUCT_JOURNEYS.md](PRODUCT_JOURNEYS.md). A journey
without browser evidence is unfinished, however green the tests are.

## Loop state

Every iteration is recorded in [PROMOTION_LOG.md](PROMOTION_LOG.md) — journey
exercised, defect fixed, evidence path, conditions newly passing. Loop state
lives in git, never in an agent's memory, so any agent can resume the loop cold.

## Current scorecard

Baseline measured 2026-08-13 against commit `dc4d668`, in a fresh
`git clone --depth 50` on Windows 11, Node v22.22.2 / npm 10.9.7. This repo was
flagged **DEFERRED** pending a merge-or-retire decision, so this baseline is
**provisional**: it describes the tree as it stands today and would have to be
re-measured after any merge or retirement.

Under the reduced variant the gate waives nothing — it points conditions 1–2 at
the quickstart as a journey and conditions 3–6 at the demo surface. NodeRL ships
**no demo surface at all**: `git ls-files` matches zero `.html`, `.tsx`, `.jsx`,
`.css`, `.vue` or `.svelte` files, and nothing in the tree starts a server. So
3–6 have no artifact to point at and stay UNVERIFIED, rather than being scored
against a terminal that has no viewport.

| # | Condition | Status | Evidence / reason |
|---|-----------|--------|-------------------|
| 1 | Journeys succeed end-to-end in a real browser | FAIL | J1 (quickstart) fails: README.md has no install/usage section (headings are Status → What's real → What's coming → proof story → Packages → Spec → Related → License), so a stranger has no "one command" to run. The one verification command the README does state — `node scripts/extract-from-noderoom.mjs --dry-run`, README:73, claimed "Verified 2026-06-28: 18/18 files resolve" — exits **1** with `0 file(s) resolved, 18 missing` in a standalone clone. Defects D1, D2. 3 of 5 journeys (J2, J3, J4) are drivable, but only after guessing an undeclared runner. |
| 2 | No critical or major usability defect open | FAIL | Four major defects open with reproductions: D1 (`extract:check` exits 1), D2 (no quickstart), D3 (no `npm test`; tests run only under undeclared `tsx`), D4 (`fr-a1-live-run-001-build.mjs` exits 1 under plain `node`). See the PROMOTION_LOG.md ledger. |
| 3 | Mobile and desktop both intentional | UNVERIFIED | No rendered surface exists to be intentional about — zero UI files in `git ls-files`, no server entry point. Nothing was observed at any width. |
| 4 | No horizontal overflow at supported widths | UNVERIFIED | Same reason as 3: there is no viewport. Not observed. |
| 5 | Loading/empty/success/error/agent-running designed | UNVERIFIED | No app to hold those states. The nearest observed analogue is terminal output — `extract:check` prints named `MISSING` lines plus a remediation sentence, and the FR-A1 script prints a designed FAIL verdict — but stdout is not the rendered surface this condition scores. Not observed. |
| 6 | Keyboard and basic accessibility pass | UNVERIFIED | No interface to navigate. Not observed. |
| 7 | Web Interface Guidelines: no major unresolved | UNVERIFIED | Review not run; there is no interface to review it against. |
| 8 | Web-quality audit: no major unresolved | UNVERIFIED | Audit (accessibility / performance / Core Web Vitals) not run; nothing to load. |
| 9 | No unexplained console errors or failed requests | UNVERIFIED | No browser journey was driven, so no console or network log was captured. |
| 10 | Performance does not obstruct interaction | UNVERIFIED | No interactive surface to obstruct. Not observed. |
| 11 | Tests and build green | PASS | All 11 committed `*.test.ts` files run to exit **0** (`packages/nodeeval/src/accounting/oracleTypes.test.ts`, `packages/nodeeval/test/accounting_{arApAging,bankReconciliation,cashFlowIndirect,journalEntry,trialBalance}.test.ts`, `packages/nodetrace/test/{merged,mergedReward,repair,storybook,trajectory}.test.ts`), driven one file at a time under `npx tsx`. `npm run typecheck` (`tsc -p tsconfig.packages.json`, the repo's only build-shaped script) exits **0**. Caveat, logged as D3 rather than hidden here: there is no `npm test` entry point (`npm test` → exit 1, "Missing script"), and `tsx` appears nowhere in `package.json` or `package-lock.json`, so a stranger cannot reach this green without guessing the runner. |
| 12 | Verified in the rendered app, not inferred from code | UNVERIFIED | Wave 1 is a baseline and made no improvements to verify. There is also no rendered app in which a later improvement could be verified. |

**Status: NOT PROMOTED** — 1/12 PASS (2 FAIL, 9 UNVERIFIED).
