/**
 * entrypoints.test.ts — proves each package can actually be imported by its own name.
 *
 * Why this test exists (it is guarding a defect that really shipped):
 * `@noderl/nodeeval` and `@noderl/nodemem` both declared `"main": "src/index.ts"` in
 * package.json while no `src/index.ts` existed. Nothing failed: no test imported through
 * the package name, so the broken door was never opened. A reader following the README
 * would hit "module not found" on their first line of code.
 *
 * So this asserts the three things that were silently untrue:
 *   1. the file each package.json points at exists on disk,
 *   2. importing the package BY NAME resolves and evaluates,
 *   3. the symbols the docs tell a reader to call are really there.
 *
 * Run: npm test   (or: node --test test/entrypoints.test.ts)
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

let pass = 0, fail = 0;
function scenario(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => { console.log(`  PASS  ${name}`); pass++; })
    .catch((e: unknown) => { console.error(`  FAIL  ${name}\n        ${(e as Error).message}`); fail++; });
}

/** The public API each package promises a reader. If you add a headline capability,
 *  name it here — that is what makes this test a contract and not a smoke test. */
const PACKAGES = [
  {
    dir: "packages/nodetrace",
    name: "@noderl/nodetrace",
    mustExport: ["mergeTrajectory", "computeMergedReward", "generateRepairPrompt", "toRegressionCase", "renderStorybook", "toTrajectory", "toJSONL", "runCapture", "pickSubstrate", "assertCapturableUrl"],
  },
  {
    dir: "packages/nodeeval",
    name: "@noderl/nodeeval",
    mustExport: ["summarize", "verifyTrialBalance", "verifyBankReconciliation", "verifyAging", "verifyJournalEntries", "verifyCashFlowIndirect", "evaluateFullSuiteGate", "evaluateLiveSuiteGate", "buildBtbLedgerImport"],
  },
  {
    dir: "packages/nodemem",
    name: "@noderl/nodemem",
    mustExport: ["classifyNoteworthy", "compileEpisode", "planRetrieval", "rankFacts", "classifyRootCause", "buildFailurePatterns", "repairTargets"],
  },
];

for (const pkg of PACKAGES) {
  const manifest = JSON.parse(readFileSync(join(pkg.dir, "package.json"), "utf8")) as {
    main?: string;
    exports?: Record<string, string>;
  };

  await scenario(`${pkg.name} — package.json points at a file that exists`, () => {
    assert.ok(manifest.main, "package.json declares main");
    assert.ok(existsSync(join(pkg.dir, manifest.main)), `main "${manifest.main}" exists on disk`);
    const dot = manifest.exports?.["."];
    assert.ok(dot, 'package.json declares an exports["."] entry');
    assert.ok(existsSync(join(pkg.dir, dot)), `exports["."] "${dot}" exists on disk`);
  });

  await scenario(`${pkg.name} — imports by package name and exposes its public API`, async () => {
    const mod = (await import(pkg.name)) as Record<string, unknown>;
    const missing = pkg.mustExport.filter((sym) => typeof mod[sym] !== "function");
    assert.deepEqual(missing, [], `every documented symbol is exported as a function (missing: ${missing.join(", ") || "none"})`);
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
