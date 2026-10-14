# Offline failure replay: FailureReplayProtocol-v1

A maintainer reviewing an accountant agent needs its failed checks to remain visible until observed evidence supports clearing them. The archived example gives the right reconciliation total but omits the arithmetic and cites generic articles. Printing repair instructions cannot establish that those failures were fixed.

This bounded caller joins the existing trace, repair, regression, failure-memory and bank-oracle helpers. It preserves the captured baseline and removes only a task whose frozen observed outcome passes (source-bound failure replay). **A protocol pass means the bookkeeping behaved correctly; it is not evidence of real-agent repair or quality improvement.**

```sh
node experiments/harness-replay/replay.ts --cases experiments/harness-replay/cases.json
node --test test/harnessReplay.test.ts
npm test
```

Native Node 22 TypeScript stripping runs the CLI and focused tests without installation. The original full suite needs the existing locked dependencies. For at most one test-file worker and four replay CLI workers during the burst scenario, run the exact full-suite coverage with options before positional paths:

```sh
node --test --test-concurrency=1 "test/*.test.ts" "packages/*/test/*.test.ts"
```

The CLI writes one bounded JSON receipt to stdout. Redirect it to a file when needed. Malformed input, source drift, unexpected outcomes or invalid CLI arguments exit nonzero and emit an error to stderr. A frozen negative control that fails its oracle for the expected reason is successful *protocol* behavior; its task stays unresolved. Neither suggested commands nor candidate instruction text are executed.

## Frozen experiment

Candidate 2 preserves the nine frozen cases and corrects only their provenance/hash bindings. Portable manifest SHA-256 (`utf8-crlf-to-lf-v1`):

`86c11751430ceb375ab7b74aacb7d0c210b9c80115b43e7f60bc5209f5365512`

Source commit: `008a83c5504369cb04988a35c8fab0419b109d78`. Each row binds its source, parent hash, transformation, MIT licence, split and expected outcome. All eight source-file hashes are checked locally on every run and exported in the receipt. Sources and manifest use one convention: decode UTF-8 strictly (reject invalid bytes, preserve BOM), replace only CRLF pairs with LF, then hash the UTF-8 text. Bare CR, BOM, other whitespace, Unicode normalization and substantive content remain significant. LF and CRLF checkouts therefore share an identity; edits beyond that narrow convention reject. Corrections require an explicit new attempt record. No silent rewrites; at most three candidate attempts.

| Source lineage / split | Frozen cases | Expected observation |
| --- | --- | --- |
| FR-A1 / development | `fr-a1-original`, `fr-a1-noop`, `fr-a1-forged-pass` | Two failed assertions and an unsourced claim persist; forged status is rejected. |
| Accounting-merged-fixture / validation | `accounting-original`, `accounting-degraded`, `accounting-synthetic-repaired` | Original discrepancy persists; missing export receipt/reopen remains degraded; authored passing snapshot clears only its own entry. |
| Bank-oracle-fixture / holdout | `bank-good`, `bank-delta`, `bank-unbalanced-je` | Existing oracle passes good input, rejects +1 bank delta at `ending_cash_tie`, rejects second unbalanced entry at `je_1_balanced`. |

FR-A1 is **repository-described captured data reconstructed as literals**, not newly verified telemetry. Its no-op and forged-pass variants are authored protocol controls over those literals. Accounting and bank cases are authored synthetic fixtures. The positive control authors a passing arithmetic/citation/export snapshot; no real agent generated it, and its referenced attachment is not a real new receipt. No fixture generation or random split was needed. Every descendant remains in its source lineage; renaming a row cannot move it across splits.

## Caller and receipt boundary

`replay(bytes, { repair_instructions: "..." })` calls the same evaluator as the CLI. The only candidate field is bounded inert text. Status, pass flags, oracle labels, costs and observations cannot be supplied by a candidate. The frozen manifest and fixed source hashes bind the observed evidence; candidate text has no authority to clear memory. The CLI accepts only its fixed manifest path, and real paths for every read must remain inside this checkout.

Records contain immutable baseline values and hashes, current merged trajectories, repair prompts, regression cases, explicitly attributed rewards, observed outcomes and protocol checks. Initial memory holds eight failed tasks; final memory holds seven. Updating a still-failed task replaces its current summary while retaining its original evidence in the record. The existing classifier supplies summary categories; this slice adds no classifier or score formula.

`records`, `initialMemory`, `failureMemory`, `repairTargets` and oracle results are **evaluator-only audit data**, including holdout failures. Only `reflectiveRecords` may be given to a future proposer: it contains the three development records under `repair_instructions`, with no validation or holdout traces or labels. There is no proposal-memory export. Do not give the complete evaluator receipt to an optimizer or use holdout results to tune a candidate; doing so retires that holdout lineage.

Actual exported records suffice, so no speculative GEPA adapter, score array, optimizer or execution framework was added. Existing supplied/derived trace rewards keep their unscored labels and historical costs, separate from this zero-spend replay. They are not optimizer-ready agent-quality scores. `promotionEligible=false`, `agentQualityDelta=null`, `agentExecuted=false`, `optimizerInvoked=false`, and `billedTokens=0` are explicit in the receipt. No genuine quality uplift has been measured.

The semantic SHA-256 uses recursively sorted object keys, ordered cases and deterministic memory. CLI timing/RSS/heap observations live outside that semantic hash. There is no persistence between calls or automatic promotion. NodeRoom regression command strings are originating-repository hints only; the referenced scripts are absent here.

## Eight reliability checks

| Check | Enforcement / applicability |
| --- | --- |
| BOUND | At most 32 cases, 64 KiB per case, 4 KiB candidate text, 2 MiB file/output. The overall byte cap precedes strict decoding and portable hash authentication, which precedes native JSON.parse. Only the fixed nine-case fixture is accepted; scenario/freeze checks verify its per-case byte, count, depth and lineage bounds. There is no custom JSON scanner or generic schema validation. Per-run maps/arrays derive from the bounded manifest; one current memory summary per task. State is released after the call, not retained in a global cache. |
| HONEST_STATUS | CLI errors exit 1; unexpected outcomes throw. Expected negative oracle outcomes remain failures. No HTTP routes, so 2xx status is N/A. |
| HONEST_SCORES | Original reward helpers only; supplied/derived origins and unscored labels preserved. Protocol success never becomes an agent-quality delta or promotion permission. |
| TIMEOUT | AbortSignal timeout propagates to local streams, with gates before each case and after evaluation; CLI watchdog limits each process to 60 seconds. Synchronous work is byte/count/depth bounded. Verification has a five-minute aggregate execution budget and four replay workers. No network operation needs an AbortController. |
| SSRF | N/A: no fetch/network API. URLs in archived evidence are inert strings. Fixed allowlisted local sources and canonical checkout containment constrain reads. |
| BOUND_READ | Stat rejects oversized/nonregular files before reading; streams cap chunks and cumulative bytes even if a file grows. No external HTTP bodies. |
| ERROR_BOUNDARY | Awaited read/replay failures reject; CLI catches and emits nonzero failure. Output overflow rejects before stdout emission. |
| DETERMINISTIC | Sorted-key SHA-256, frozen portable content hashes, deterministic ordering, no shared run state. No persistent compare-and-swap store, so CAS is N/A. |

## Proof and limits

The focused suite exercises the maintainer's job, degraded input, forged status, cost/label/source edits, missing outcomes, duplicates, split leakage, invalid/oversized UTF-8 input, candidate/output bounds, CLI errors, four concurrent nine-case CLI batches and 100 sequential nine-case batches. Each batch verifies the same semantic hash and seven unresolved memory entries. Tests import `replay.ts`, bringing it into the existing TypeScript graph without configuration changes. Existing tests and assertions are untouched.

The bank oracle validates only supplied arithmetic and journal balance. Its partition check treats the supplied buckets as the universe; it cannot prove source completeness, derivation or citation support. Nine cases demonstrate transition and isolation mechanics, not statistical generalization. Referenced screenshots, exported workbooks and archived provider activity are not replayed or fetched. The 100-batch run measures bounded logical state, not an indefinite-duration RSS guarantee.

## Append-only decisions and changes

- **2026-10-14 / before / attempt 1:** Inspected the actual helpers and callers. The demo merges archived literals and prints repair/regression text; no runtime caller joins that result to failure memory. `mergeFailureMemory` accepts caller-supplied passed task IDs, so the caller must own proof binding. Its rerun commands target absent NodeRoom tools. Decision: add one fixed-manifest evaluator and CLI, reuse helpers, leave command strings inert, export actual records without a GEPA adapter. Captured demo exit 0, froze nine cases and verified all eight hashes before implementation. Parent's initial baseline had two missing-dependency failures; parent subsequently installed the existing lockfile and recorded 16/16 passing. This implementer performed no installs.
- **2026-10-14 / after / attempt 1:** Added the caller and scenario tests within the four allowed paths. FailureReplayProtocol-v1 passed: no-op/forged pass preserve captured failures; the authored positive clears only itself; bank negatives fail for their exact named reason. Focused suite 8/8; full npm suite 24/24; available locked TypeScript check passed. Preserved a failed Windows verification wrapper (it failed before npm started), then reran via installed npm CLI. The npm-appended concurrency option did not reliably bound workers; a direct full-suite rerun places it before positional paths. Parent owns independent final review and any merge/publication. Self-review is not independent review.

Freeze, raw logs, exact exits/counts, resources, source/file hashes, actual CLI output and the final machine-readable handoff are in the parent campaign's `evidence/noderl-replay` directory. `freeze.json`, `attempt-1-*.json`/logs, `after-cli.json`, and `implementation-receipt.json` preserve the experiment history. The campaign ledger is untouched.

- **2026-10-14 / correction and before / attempt 2:** Independent review blocked candidate 1 because eight source pins required Windows CRLF while the manifest required LF. Preserved candidate 1 source bytes, original freeze, raw outputs, review binding and staged diff before editing. Rebound only `caseSha256`, `provenance.sourceSha256` and `provenance.parentSha256`; semantic case content excluding those fields is identical. The new freeze records old/raw/portable identities and all eight Git blob comparisons. After the overall byte cap, authenticate the portable manifest before native parsing; removed the custom scanner and redundant pre-hash checks. The preliminary holdout allegation was not established: evaluator-only audit memory remains intact and reflectiveRecords remains development-only. No optimizer or proposal consumer was added.

Candidate 2 evidence uses distinct names under this worktree's `evidence/noderl-replay` because the parent campaign directory is read-only in this session. `attempt2-start.json`, `candidate2-freeze.json` and `candidate1-preserved/` retain the correction boundary and history. Candidate 1 historical notes above remain unchanged. Parent owns final diff binding, independent review and Linux CI; the registration hold remains.

- **2026-10-14 / after / attempt 2:** Focused proof passed 10/10 and the bounded full suite passed 26/26 (16 original wrappers plus 10 replay scenarios), with zero failures/skips. Ordinary CLI exited 0; its observations and repair records equal candidate 1. All eight LF/CRLF source representations and both manifest representations yield identical semantic receipts under read-stream substitution; substantive edits to each source, BOM/bare-CR changes and invalid UTF-8 reject. Four concurrent CLI batches and 100 sequential batches retain seven unresolved entries. An initial typecheck failure for two mock callback parameter annotations is preserved; the annotation-only correction passes installed locked tsc. No runtime changes followed the focused proof. These local checks do not replace native Linux CI or independent review. The source index/staged candidate 1 was not changed.
