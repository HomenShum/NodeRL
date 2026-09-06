# NodeRL report handoff evidence

A developer investigating a failed task needs to distinguish what happened from what has merely been claimed. This packet lets that developer inspect the saved report, its trace and the tests behind five narrowly repaired report behaviors. Start with the repository's HANDOFF.md for the keyless setup and report-generation example.

The independent reviewer approved the five-owner repair after 133 closing checks. That approval binds local source based on `4b06939b8fd9121e2ba73887df2dd799eae2f1aa`; it does not certify a later commit, shared CI run, package release or deployment. The application and tests are outside this packet and retain their normal owners.

## Read the evidence

- [Independent verdict](raw/final-judge/E6k_NODERL_REPORT_REPAIR_FINAL_JUDGE.md.txt)
- [Structured verdict](raw/final-judge/E6k_NODERL_REPORT_REPAIR_FINAL_JUDGE.json)
- [Independent closing checks](raw/final-judge/close-verification.json)
- [Independent renderer replay](raw/final-judge/pure-renderer-replay.json)
- [Independent pixel/contrast review](raw/final-judge/viewed-pixels-and-contrast.json)
- [Original first-use result](raw/receipts/E6k_NODERL_FIRST_USE_RECEIPT.json)
- [Current worker result](raw/receipts/E6k_NODERL_REPORT_REPAIR_RECEIPT.json)
- [Current semantic assertions](raw/after/semantic/semantic-report.json)
- [Current browser assertions](raw/after/browser/report.json)
- [Current file reopening](raw/after/file-reopen/report.json)
- [Nine renderer scenarios](raw/repair/commands/targeted-after.stdout.txt)
- [Sixteen normal test files](raw/repair/commands/tests-after-anchor.stdout.txt)
- [Typecheck](raw/repair/commands/typecheck.stdout.txt)
- [Owned runtime closure](raw/repair/runtime-final-closure.json)

The original receipt retains 98/99 semantic checks and 129/145 browser assertions, including the real benign script-URL execution and misleading costs. Its collector exit code meant collection completed, not that every assertion passed. The repaired proof records 99/99 semantic checks plus the mixed-cost case and 230/230 browser assertions over 31 layout cells; its required assertion failures exit nonzero. Nine renderer scenarios and all 16 normal test files pass. The initial stale-tour test and external recorder path failure remain raw evidence. The final source judgment includes an independent byte-for-byte replay of 35 reports, three original-defect knockouts and zero fetches.

## Saved examples and pictures

All report HTML is deliberately stored as `.html.txt`, including the original unsafe address example. Read these files as text. Do not serve or activate the original unsafe reports. To open a report, prefer generating a fresh one with the HANDOFF example. A repaired `.html.txt` example may be copied deliberately to a new local `.html` file; its synthetic evidence still does not become an actual workbook or provider run.

| Saved bundle | Original report text | Repaired report text |
|---|---|---|
| accounting | [Before](examples/before/accounting/report.html.txt) | [After](examples/after/accounting/report.html.txt) |
| script-uri | [Before](examples/before/script-uri/report.html.txt) | [After](examples/after/script-uri/report.html.txt) |
| long-unicode | [Before](examples/before/long-unicode/report.html.txt) | [After](examples/after/long-unicode/report.html.txt) |
| empty | [Before](examples/before/empty/report.html.txt) | [After](examples/after/empty/report.html.txt) |
| absent-cost | [Before](examples/before/absent-cost/report.html.txt) | [After](examples/after/absent-cost/report.html.txt) |
| mixed-cost | [Before](examples/before/mixed-cost/report.html.txt) | [After](examples/after/mixed-cost/report.html.txt) |

The corresponding trace, repair and regression files are indexed in [copy-map.json](copy-map.json). Identical bytes share one physical copy, so an after record can correctly map to a before-named file. The map provides the authoritative physical path. Original raw JSON/Markdown retains operator paths and relative links as provenance; those paths are not instructions to access a recipient machine and are not rewritten into working navigation. Only the links in this README and current HANDOFF are navigation promises.

| Exact viewport | Original accounting pixels | Repaired accounting pixels |
|---|---|---|
| 320 × 800 | [Before](pixels/before/accounting-320x800-normal.png) | [After](pixels/after/accounting-320x800-normal.png) |
| 360 × 800 | [Before](pixels/before/accounting-360x800-normal.png) | [After](pixels/after/accounting-360x800-normal.png) |
| 390 × 844 | [Before](pixels/before/accounting-390x844-normal.png) | [After](pixels/after/accounting-390x844-normal.png) |
| 768 × 1024 | [Before](pixels/before/accounting-768x1024-normal.png) | [After](pixels/after/accounting-768x1024-normal.png) |
| 1024 × 768 | [Before](pixels/before/accounting-1024x768-normal.png) | [After](pixels/after/accounting-1024x768-normal.png) |
| 1440 × 960 | [Before](pixels/before/accounting-1440x960-normal.png) | [After](pixels/after/accounting-1440x960-normal.png) |
| 1920 × 1080 | [Before](pixels/before/accounting-1920x1080-normal.png) | [After](pixels/after/accounting-1920x1080-normal.png) |

The packet also includes the 390/1440 computed-text-200% and reduced-motion accounting/long-content captures, phone defect boundaries and native URL focus/activation pictures. They are explicitly mapped, not inferred from the table. There are 57 physical PNGs across before/after proof; full-page duplicates are omitted. All 94 current pictures remain operator-retained, while only selected pictures travel here. [excluded-artifacts.json](excluded-artifacts.json) names and hashes every omitted original input within the stated inventory scope. Omitted pictures, raw source copies and controller files are not portable coverage. Structured DOM and PNGs cannot reconstruct arbitrary hidden attributes/scripts, full DOM or the exact old browser session.

## Verify bytes

From the repository root after the packet is present, use Python 3.10 or newer:

```sh
python evidence/report-handoff-20260905/verify.py
python evidence/report-handoff-20260905/verify.py --source-root .
```

The first command checks every manifest-bound packet file and rejects extra, missing or changed files and linked/reparse paths. No network, browser or third-party Python library is used. The manifest excludes itself to avoid a circular self-hash; its external digest must come from the separate reviewed publication receipt. This verifies byte preservation, not authenticity, executed tests, visual quality or Git staging/filter behavior.

The optional source check reads all 102 files in [source-bindings.json](source-bindings.json): 101 unchanged reviewed files and the explicit proposed HANDOFF successor. The historical source set and old receipts remain exact. It does not compare the new HANDOFF to the old hash and silently waive failure, nor does it enumerate every additional source-checkout file. A checkout with newline-converted bytes may fail this raw-byte check; no Git equivalence is implied. Before publication transfer, the original HANDOFF remains in the repository and this optional check is expected to fail on that deliberate difference.

## What this does not establish

This is a source-workspace, synthetic-record report proof. The generated JSON/HTML/Markdown files are real; the accounting values, model names, screenshot references and workbook/reopen statements are fixture data. No generated NodeRoom repair command was executed. Failure-memory tests use caller-owned arrays, not a certified durable store. HTTP navigation used an owned loopback report; HTTPS used exact local route fulfillment, not a real TLS endpoint.

The observed FAIL and NEEDS REVIEW contrasts improve to 5.6414:1 and 7.4925:1. All 31 recorded layout cells show no horizontal overflow. These observations do not assign a full accessibility, visual, interaction or product grade. Computed font enlargement is not native zoom, and desktop Chromium viewports are not physical-device proof. Provider capture, real accounting output, durable concurrency, remote benchmarks/training, npm tarball/installed CLI, shared CI and deployment remain unverified. The inherited rendered-surface probe incorrectly says there is no UI; the generated report is an owned UI and its passing test does not remove these limits. Historical socket code 10035 is WSAEWOULDBLOCK; actual listener/PID closure is recorded separately.
