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

One fourth value is used below, sparingly and with its evidence: **N/A**, for a
condition whose subject provably does not exist in this repo. N/A is **not** a
pass and never counts toward promotion — the status line at the bottom of the
scorecard counts it separately. It exists because "UNVERIFIED — audit not run"
and "there is nothing to audit, and here is the measurement proving it" are
different statements, and only the second one is actionable: it tells the next
reader that installing a tool will not help, and it expires automatically the
day the subject appears (see `promotion/evidence/rendered-surface-probe.mjs`,
which exits 1 the moment it does).

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
**no demo surface at all**, and that is now a measurement rather than a sentence:
`promotion/evidence/rendered-surface-probe.mjs` asks five independent questions
of the committed tree — markup files, stylesheets, server entry points, UI
framework dependencies or `bin` fields, deployed page URLs — and all five return
zero. So the eight conditions that score a rendered surface have no artifact to
point at and are **N/A**, rather than being scored against a terminal that has
no viewport.

**This scorecard is measured at two different commits. Read the rows accordingly.**

| Rows | Measured at | When |
|------|-------------|------|
| 3, 4, 5, 6, 7, 8, 9, 10, 11 | `b748ae8` | 2026-08-14 |
| 1, 2, 12 | `dc4d668` (original baseline) | 2026-08-13 |

Rows 1, 2 and 12 have **not** been re-driven since the baseline, and
`PROMOTION_LOG.md` Iteration 1 records defects D1, D2, D3, D4, D6 and D7 as
closed after it. Their stated reasons therefore cite files that no longer exist.
They are left FAIL/UNVERIFIED rather than re-scored, because moving a condition
requires driving it, not inferring it from someone else's log entry — but do not
read their reason text as current. Re-measure before trusting rows 1, 2 or 12.

| # | Condition | Status | Evidence / reason |
|---|-----------|--------|-------------------|
| 1 | Journeys succeed end-to-end in a real browser | FAIL | J1 (quickstart) fails: README.md has no install/usage section (headings are Status → What's real → What's coming → proof story → Packages → Spec → Related → License), so a stranger has no "one command" to run. The one verification command the README does state — `node scripts/extract-from-noderoom.mjs --dry-run`, README:73, claimed "Verified 2026-06-28: 18/18 files resolve" — exits **1** with `0 file(s) resolved, 18 missing` in a standalone clone. Defects D1, D2. 3 of 5 journeys (J2, J3, J4) are drivable, but only after guessing an undeclared runner. |
| 2 | No critical or major usability defect open | FAIL | Four major defects open with reproductions: D1 (`extract:check` exits 1), D2 (no quickstart), D3 (no `npm test`; tests run only under undeclared `tsx`), D4 (`fr-a1-live-run-001-build.mjs` exits 1 under plain `node`). See the PROMOTION_LOG.md ledger. |
| 3 | Mobile and desktop both intentional | **N/A** | No rendered surface exists to be intentional about, measured: [`evidence/rendered-surface-probe.json`](evidence/rendered-surface-probe.json) — all five surface checks zero. There is no width at which anything renders. The JSON names the commit it was taken at; the claim stays current because `test/renderedSurfaceProbe.test.ts` re-runs the probe against HEAD on every `npm test`. |
| 4 | No horizontal overflow at supported widths | **N/A** | Same measurement as 3. No viewport exists, so no axis can overflow. [`evidence/rendered-surface-probe.json`](evidence/rendered-surface-probe.json) |
| 5 | Loading/empty/success/error/agent-running designed | **N/A** | Same measurement as 3. The nearest analogue is terminal output — `npm run demo` prints a designed FAIL verdict naming each failed assertion expected-vs-observed — but stdout is not the rendered surface this condition scores, and scoring it here would be the category error this scorecard elsewhere refuses. [`evidence/rendered-surface-probe.json`](evidence/rendered-surface-probe.json) |
| 6 | Keyboard and basic accessibility pass | **N/A** | Same measurement as 3. Nothing focusable exists in the tree: zero markup files, zero stylesheets, zero UI dependencies. [`evidence/rendered-surface-probe.json`](evidence/rendered-surface-probe.json) |
| 7 | Web Interface Guidelines: no major unresolved | **N/A** | Review performed 2026-08-14 against <https://vercel.com/design/guidelines> (reachable; category list reproduced in the record). All eight categories walked, each with its disposition: **no major findings, because no interface exists to hold one**. [`evidence/condition-07-wig-review.md`](evidence/condition-07-wig-review.md). No Lighthouse or axe output was used here or exists — 7 and 8 are filed separately because they measure different things. |
| 8 | Web-quality audit: no major unresolved | **N/A** | Both audit tools are now available and were measured saying so — `lighthouse@13.4.1` and `@axe-core/cli@4.13.0` each reported its own version ([`evidence/audit-toolchain-versions.json`](evidence/audit-toolchain-versions.json)) — so the tool is no longer the blocker. Neither was run, because there is no URL to point them at, and no page was fabricated to create one. LCP/CLS/INP are not measurable where no document loads. [`evidence/condition-08-web-quality-audit.md`](evidence/condition-08-web-quality-audit.md) |
| 9 | No unexplained console errors or failed requests | **N/A** | Same measurement as 3: no browser console and no page-issued request can exist. Producer: [`evidence/rendered-surface-probe.mjs`](evidence/rendered-surface-probe.mjs). (The CLI analogue is green but is not this condition: `npm test` 16/16, `npm run demo` exit 0 — see row 11.) |
| 10 | Performance does not obstruct interaction | **N/A** | Same measurement as 3. There is no interaction to obstruct; the demo's runtime is a Node process, not a page load. [`evidence/rendered-surface-probe.json`](evidence/rendered-surface-probe.json) |
| 11 | Tests and build green | PASS | Re-measured at `b748ae8` on 2026-08-14, fresh clone, Node v22.22.2 / npm 10.9.7, after `npm ci`. `npm test` → **16 tests, 16 pass, 0 fail**, exit 0, under plain `node --test` with no undeclared runner (the baseline's D3 caveat about guessing `tsx` no longer applies). `npm run typecheck` (`tsc -p tsconfig.packages.json`) → exit 0. `npm run demo` → exit 0 under plain `node`. The 16th test is `test/renderedSurfaceProbe.test.ts`, added with this iteration; it is the negative control for the rows-3–10 evidence and proves each of the five surface checks fires on its own. |
| 12 | Verified in the rendered app, not inferred from code | UNVERIFIED | Wave 1 is a baseline and made no improvements to verify. There is also no rendered app in which a later improvement could be verified. |

**Status: NOT PROMOTED** — 1/12 PASS (2 FAIL, 8 N/A, 1 UNVERIFIED).

N/A is counted separately and deliberately not folded into the pass count. The
change since baseline is not that NodeRL got closer to promotion — it did not.
It is that eight rows moved from *"we did not look"* to *"there is nothing to
look at, here is the measurement, and here is the test that turns this row red
the day that stops being true"*. The one remaining UNVERIFIED (12) and the two
FAILs (1, 2) are the honest work left, and none of them is unblocked by tooling.
