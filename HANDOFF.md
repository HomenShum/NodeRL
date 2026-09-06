# NodeRL developer and reviewer handoff

Start here to turn a recorded failed task into a reviewable report and a developer repair prompt. NodeRL is a private source workspace with three library packages. The keyless path below evaluates supplied records; it does not run an agent, verify the referenced workbook, or train a model.

## Set up and check

Use Node.js 22.18 or newer. From the repository root:

```sh
npm ci
npm test
npm run typecheck
npm run demo
```

The demo replays a historical failed accounting run. The renderer scenarios are in `packages/nodetrace/test/storybook.test.ts`; run them alone with `node --test packages/nodetrace/test/storybook.test.ts`. No API key, database, browser service or build step is needed for these commands. Live capture is a separate, unverified provider path.

## Produce a report you can reopen

Save this as a local `.mjs` file and run it with `node path/to/your-file.mjs` from the repository root. It resolves the public package entrypoint from this workspace and writes a new temporary directory without overwriting an earlier report.

```js
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, writeFile } from 'node:fs/promises';

const fromRepo = createRequire(join(process.cwd(), 'package.json'));
const { mergeTrajectory, computeMergedReward, renderStorybook,
  generateRepairPrompt, toRegressionCase } = await import(
  pathToFileURL(fromRepo.resolve('@noderl/nodetrace')).href
);
const trace = mergeTrajectory(
  { steps: [] },
  { url: 'https://example.invalid/synthetic-review', screenshots: [],
    uiAssertions: [{ id: 'cash-ties', expected: 'Reconciliation delta is zero',
      observed: 'Synthetic example: delta is 412.50', passed: false }] },
  [],
  [{ factId: 'source-gap', claim: 'An uncleared check explains the delta', status: 'needs_review' }],
  { runId: 'synthetic-handoff-example', userGoal: 'Review an unresolved reconciliation' }
);
// This is a derived reward, deliberately carried by every report surface.
trace.reward = computeMergedReward(trace);
const output = await mkdtemp(join(tmpdir(), 'noderl-review-'));
const files = {
  'trace.json': JSON.stringify(trace, null, 2),
  'report.html': renderStorybook(trace),
  'repair.md': generateRepairPrompt(trace),
  'regression.json': JSON.stringify(toRegressionCase(trace), null, 2),
};
for (const [name, bytes] of Object.entries(files)) {
  await writeFile(join(output, name), bytes, { flag: 'wx' });
}
console.log(output);
```

Open `report.html` in the printed directory, then compare `trace.json`, `repair.md` and `regression.json`. Expect **FAIL**, an unresolved `needs_review` claim and explicit unscored components. Screenshot and workbook paths in a caller record are references; the report does not verify those files. A carried reward uses the same rounded total in the report and repair prompt. When reward is absent, HTML shows no total; the repair API may separately derive one. A trajectory ID is not a full-content hash, so use file hashes when binding changed records.

Only absolute HTTP/HTTPS room addresses are active links. Other addresses remain visible text. Cost is “not recorded” when absent, a labelled known subtotal when partial, and a complete amount only when every step records a finite cost. Explicit zero is preserved. Failure-memory functions operate on caller-owned arrays; the caller must persist them. Suggested regression commands target NodeRoom and must not be executed as NodeRL setup commands.

## Current repair and limits

The report repair was evaluated against the source recorded in the [report evidence packet](evidence/report-handoff-20260905/README.md), based on commit `4b06939b8fd9121e2ba73887df2dd799eae2f1aa`. It addresses executable room addresses, missing/partial cost disclosure, long-content reflow, two filled status-label contrasts, and the empty Artifacts message. The independent reviewer approved the five-owner repair after 133 closing checks. The packet records that judgment and local test results against exact source hashes. Those records describe that reviewed local source; they do not establish the status of a later shared CI run, release or deployment.

Local verification passed nine renderer scenarios, all 16 normal test files and typecheck. The after proof passed 99 semantic checks plus the mixed-cost case, and all 230 browser assertions across 31 layout cells. The original 33 trace, repair and regression files stayed byte-identical; 94 current PNGs were retained by the operator. The portable packet includes the explicitly selected viewport/defect pictures and lists every omitted raw artifact; it does not contain all 94 current pictures. The example above ran from the repository root and produced four reopened output files.

The preserved before proof found actual script-URL execution, misleading costs, overflow and weak contrast. Generated JSON/Markdown/HTML files are real; its accounting data, model names and workbook/reopen claims are synthetic fixtures. Browser checks use desktop Chromium at seven viewport pairs, plus computed text at 200% and reduced motion. Computed text enlargement is not native zoom or a physical-device test. Full accessibility, physical devices, provider capture, durable concurrency, actual accounting outputs, remote benchmarks/training, npm tarball/installed CLI, shared CI and deployment remain unverified. No full product or UI grade is assigned.
