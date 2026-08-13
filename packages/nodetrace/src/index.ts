/**
 * NodeTrace — the public surface.
 *
 * Two halves, and it is worth knowing which one you are in:
 *
 * 1. THE LOOP (pure, no dependencies, no network). Join what an agent run did into one
 *    object, score it from honest signals, and turn a failure into a repair prompt plus a
 *    regression case. Everything here is deterministic: same input, byte-identical output.
 *
 * 2. LIVE CAPTURE (needs an LLM key and a remote browser). Drive a real page with a model
 *    in an observe -> act -> extract loop and record every step with a screenshot.
 *
 * Most readers want half 1. It is what the tests cover and what `npm run demo` runs.
 */

/* ── 1. The loop: trace -> reward -> repair ─────────────────────────────────────────── */

/** One agent run, joined from its browser-side proof, its reasoning steps, its artifacts
 *  and its evidence. `mergeTrajectory` is the join; it never invents a score. */
export {
  mergeTrajectory,
  defaultMergedRewardFormula,
  MERGED_REWARD_COMPONENTS,
  type NodeMergedTrajectory,
  type MergedStep,
  type MergedArtifact,
  type MergedEvidence,
  type MergedReward,
  type MergedRewardFormula,
  type UiAssertion,
  type OuterScreenshot,
  type OuterTraceInput,
  type InnerTraceInput,
  type MergeMeta,
} from "./merged.ts";

/** Derive the reward components that ARE readable off the trace; leave the rest labelled
 *  "unscored:<name>" rather than guessing them. */
export { computeMergedReward, type EvalBudget, type EvalOptions } from "./mergedReward.ts";

/** Turn a failed run into a coding-agent repair prompt and a promotable regression case. */
export { generateRepairPrompt, toRegressionCase, type RegressionCase } from "./repair.ts";

/** Render one merged trajectory as a single self-contained HTML page — no server, no build. */
export { renderStorybook } from "./storybook.ts";

/** The (state, action, observation, reward) export: one capture -> one trajectory -> JSONL
 *  for SFT / DPO / RLVR pipelines. */
export {
  toTrajectory,
  toJSONL,
  summarizeReward,
  deterministicId,
  defaultRewardFormula,
  type NodeTrajectory,
  type NodeTraceStep,
  type NodeRewardSummary,
  type TrajectoryInitialState,
  type TrajectoryOutputs,
  type ToTrajectoryMeta,
  type TraceAction,
  type ToolCallAction,
  type FileEditAction,
  type TestRunAction,
  type ProcessReward,
  type StepCost,
  type RewardFormula,
} from "./trajectory.ts";

/* ── 2. Live capture: drive a real browser with a model ─────────────────────────────── */

export * from "./types.ts";
export { runCapture } from "./pipeline.ts";
export { aiSdkReasoner } from "./reasoning.ts";
export { CAPTURE_LIMITS, CaptureUrlError, assertCapturableUrl, clipRepresentation } from "./guards.ts";
export { pickSubstrate, browserbaseSubstrate, firecrawlSubstrate } from "./substrate/index.ts";
