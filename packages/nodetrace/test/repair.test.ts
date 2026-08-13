/**
 * repair.test.ts — the REPAIR stage over the accounting fresh-room fixture (one failing assertion +
 * one needs_review evidence). Verifies the repair prompt grounds every claim in the trace, the
 * regression case captures the real failure, and both are deterministic. Run: tsx test/repair.test.ts
 */
import assert from "node:assert/strict";
import { mergeTrajectory } from "../src/merged.ts";
import { computeMergedReward } from "../src/mergedReward.ts";
import { generateRepairPrompt, toRegressionCase } from "../src/repair.ts";
import { renderStorybook } from "../src/storybook.ts";
import {
  accountingOuter,
  accountingInner,
  accountingArtifacts,
  accountingEvidence,
  accountingMeta,
} from "./merged.fixture.ts";

let pass = 0, fail = 0;
function scenario(name: string, fn: () => void) {
  try { fn(); console.log(`  PASS  ${name}`); pass++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${(e as Error).message}`); fail++; }
}

const t = mergeTrajectory(accountingInner, accountingOuter, accountingArtifacts, accountingEvidence, accountingMeta);

scenario("(a) GROUND-TRUTH — prompt names the failing assertion + observed delta, not a guess", () => {
  const p = generateRepairPrompt(t);
  assert.match(p, /Bank reconciliation for March/);
  assert.match(p, /assert-ending-cash-ties/);
  assert.match(p, /412\.50/); // the real observed delta from the trace
  assert.match(p, /verdict: \*\*FAIL\*\*/);
});

scenario("(b) EVIDENCE-GATE — needs_review claim surfaces as must-resolve, never silently accepted", () => {
  const p = generateRepairPrompt(t);
  assert.match(p, /needs_review/);
  assert.match(p, /Check #1042/); // the unsourced claim must be shown for resolution
});

scenario("(c) REGRESSION — a promotable regression case captures the real failure", () => {
  const rc = toRegressionCase(t);
  assert.ok(rc.failedAssertions.some((a) => a.id === "assert-ending-cash-ties"), "failed assertion captured");
  assert.ok(rc.failureCategories.includes("ui_assertion_failed"), "failure category present");
  assert.ok(rc.needsReviewClaims.some((c) => /1042/.test(c)), "needs_review claim captured");
  assert.match(rc.expectation, /must make these 1 assertion\(s\) pass/);
  // the regression is embedded in the prompt as valid JSON
  const p = generateRepairPrompt(t);
  const json = p.slice(p.indexOf("```json") + 7, p.lastIndexOf("```")).trim();
  assert.deepEqual(JSON.parse(json).id, rc.id);
});

scenario("(d) NO-FABRICATION — prompt asks for the smallest fix; it does not invent one", () => {
  const p = generateRepairPrompt(t);
  assert.match(p, /SMALLEST shared fix/);
  assert.match(p, /do not fabricate/i);
});

scenario("(e) DETERMINISM — same trajectory => byte-identical repair prompt + regression", () => {
  assert.equal(generateRepairPrompt(t), generateRepairPrompt(t));
  assert.equal(JSON.stringify(toRegressionCase(t)), JSON.stringify(toRegressionCase(t)));
});

/**
 * (f) guards a defect that shipped: the repair prompt printed `total reward: 0.238` for the very
 * trajectory whose storybook badge read `total 0.171`. Both surfaces were reading a different reward
 * for one object — the prompt recomputed one from the trace and ignored the reward the trajectory was
 * carrying. A reviewer comparing the two would have had no way to tell which number was the run's.
 */
const scored = mergeTrajectory(accountingInner, accountingOuter, accountingArtifacts, accountingEvidence, {
  ...accountingMeta,
  reward: { taskCompletion: 0.5, uiStateCorrectness: 0.5, evidenceGrounding: 0.2 },
});

scenario("(f) ONE-VALUE — repair prompt and storybook print the trajectory's reward, not two totals", () => {
  const onTrajectory = scored.reward!.total.toFixed(3);
  const inPrompt = generateRepairPrompt(scored).match(/total reward: ([\d.]+)/)?.[1];
  const inStorybook = renderStorybook(scored).match(/verdict: FAIL · total ([\d.]+)/)?.[1];

  assert.equal(inPrompt, onTrajectory, "repair prompt reports the reward stored on the trajectory");
  assert.equal(inStorybook, onTrajectory, "storybook badge reports the same stored reward");

  // And prove it is the STORED value being read, not a coincidence: the derived-from-trace reward
  // for this same trajectory is a different number, and neither surface may print it.
  const derived = computeMergedReward(scored).total.toFixed(3);
  assert.notEqual(derived, onTrajectory, "fixture is only meaningful while the two differ");
  assert.equal(generateRepairPrompt(scored).includes(derived), false, "the recomputed total is not printed");
});

scenario("(g) UNSCORED-TRAJECTORY — with no reward on the trajectory, the prompt derives one and says so", () => {
  // `t` carries no reward (the fixture supplies none), so there is nothing to disagree with: the
  // prompt derives, and the storybook — which never invents a number — shows no total at all.
  assert.equal(t.reward, undefined);
  const derived = computeMergedReward(t).total.toFixed(3);
  assert.match(generateRepairPrompt(t), new RegExp(`total reward: ${derived}`));
  assert.equal(renderStorybook(t).includes(" · total "), false, "no reward on the trace => no number rendered");
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
