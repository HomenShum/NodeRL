import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeTrajectory, type InnerTraceInput, type OuterTraceInput, type MergedArtifact, type MergedEvidence, type MergeMeta } from "../../packages/nodetrace/src/merged.ts";
import { generateRepairPrompt, toRegressionCase } from "../../packages/nodetrace/src/repair.ts";
import { computeMergedReward } from "../../packages/nodetrace/src/mergedReward.ts";
import { buildFailurePatterns, mergeFailureMemory, repairTargets } from "../../packages/nodemem/src/failureMemory.ts";
import { verifyBankReconciliation, type BankReconciliationInput } from "../../packages/nodeeval/src/accounting/bankReconciliation.ts";

export const LIMITS = Object.freeze({ cases: 32, caseBytes: 64 * 1024, candidateBytes: 4 * 1024, fileBytes: 2 * 1024 * 1024, outputBytes: 2 * 1024 * 1024, processMs: 60_000 });
export const MANIFEST_SHA256 = "86c11751430ceb375ab7b74aacb7d0c210b9c80115b43e7f60bc5209f5365512";
const SOURCE_COMMIT = "008a83c5504369cb04988a35c8fab0419b109d78";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const MANIFEST_PATH = resolve(ROOT, "experiments/harness-replay/cases.json");
const SOURCE_HASHES: Readonly<Record<string, string>> = Object.freeze({
  "package.json": "b29b46c499dd8ad0c928f9f8cabb5073ecb7a818daf09caf2a253038b569067c",
  "experiments/fr-a1-runs/fr-a1-live-run-001-build.mjs": "d20b622e7f5c9f2b79d0d502efcd21c9d702fb34578d71e5a76d21ea0af3dbe5",
  "packages/nodetrace/src/repair.ts": "3eefab87ad2e4a9126772abb817e6f54ea0200307cfe31f8d5875cc47220f6e4",
  "packages/nodetrace/src/mergedReward.ts": "d09ee595cc0a7c17dd41e504414131074051cf5a4110c8c400e8a9c9670c8c33",
  "packages/nodetrace/test/merged.fixture.ts": "5971b8d06ecbf8e0628a2b2b3e8bc1768dc1b5321307f2ed31a0cf3a6d03f434",
  "packages/nodemem/src/failureMemory.ts": "25e326f93d12e9cd7f72466049d45f457b2610a23cc9b0d36c18a03d6590760d",
  "packages/nodeeval/src/accounting/bankReconciliation.ts": "c2ff83b0cebe054651c7d47143c3431895d16175dcea001aa95238b0cc7e728d",
  "packages/nodeeval/test/accounting_bankReconciliation.test.ts": "d7b8fdcc46e0c832471a69e3ce2bd45f0a1a77099b95d5ad67e62dae68e63cf6",
});
const HONESTY = Object.freeze({ promotionEligible: false, agentQualityDelta: null });
type TraceInput = { kind: "trace"; inner: InnerTraceInput; outer: OuterTraceInput; artifacts: MergedArtifact[]; evidence: MergedEvidence[]; meta: MergeMeta };
type Input = TraceInput | (BankReconciliationInput & { kind: "bank" });
type Outcome = { failedAssertions: string[]; needsReview: string[]; reopenFailures: string[]; missingReceipts: string[]; oracleFailures: string[]; attemptRejected: boolean; resolved: boolean };
type ReplayCase = {
  caseId: string; groupId: string; split: "development" | "validation" | "holdout";
  provenance: { kind: string; sourcePath: string; sourceSha256: string; parentCaseId: string | null; parentSha256: string; license: string; transformation: string };
  baseline: Input; observation: Input | null; attempt: unknown; expected: Outcome; caseSha256: string;
};

function requireThat(condition: unknown, reason: string): asserts condition {
  if (!condition) throw new Error(reason);
}
export function sha256(bytes: string | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
export function semanticHash(value: unknown): string {
  return sha256(JSON.stringify(value, (_, v: unknown) => v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, (v as Record<string, unknown>)[k]])) : v));
}

// Normalize checkout newlines only; fatal decoding and ignoreBOM preserve all other content.
export function portableText(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes).replace(/\r\n/g, "\n");
}

function parseManifest(bytes: Uint8Array): ReplayCase[] {
  requireThat(bytes.byteLength > 0 && bytes.byteLength <= LIMITS.fileBytes, "manifest file bound (1..2MiB)");
  const text = portableText(bytes);
  // The fixed authenticated fixture already binds size, depth, lineage, outcomes and provenance.
  requireThat(sha256(text) === MANIFEST_SHA256, "frozen manifest mismatch; record a new attempt before corrections");
  return JSON.parse(text) as ReplayCase[];
}

function validateCandidate(candidate: unknown): asserts candidate is { repair_instructions: string } {
  requireThat(candidate && typeof candidate === "object" && !Array.isArray(candidate), "candidate must contain only repair_instructions");
  const record = candidate as Record<string, unknown>;
  requireThat(Object.keys(record).length === 1 && typeof record.repair_instructions === "string", "candidate cannot supply status, pass flags, labels, costs or evidence");
  requireThat(Buffer.byteLength(record.repair_instructions) <= LIMITS.candidateBytes, "candidate text bound (4KiB)");
}

async function readLocal(path: string, signal: AbortSignal): Promise<Buffer> {
  signal.throwIfAborted();
  const actual = await realpath(path);
  const rel = relative(await realpath(ROOT), actual);
  requireThat(rel !== "" && !rel.startsWith("..") && !isAbsolute(rel), "local file must stay inside checkout");
  const info = await stat(actual);
  requireThat(info.isFile() && info.size <= LIMITS.fileBytes, "local regular file bound (2MiB)");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of createReadStream(actual, { highWaterMark: 64 * 1024, signal })) {
    const data = chunk as Buffer;
    size += data.length;
    requireThat(size <= LIMITS.fileBytes, "local file grew beyond 2MiB");
    chunks.push(data);
  }
  return Buffer.concat(chunks, size);
}

function observe(input: Input, attemptRejected: boolean) {
  const trajectory = input.kind === "trace" ? mergeTrajectory(input.inner, input.outer, input.artifacts, input.evidence, input.meta) : null;
  const oracle = input.kind === "bank" ? verifyBankReconciliation(input) : null;
  const outcome: Outcome = {
    failedAssertions: trajectory?.outerTrace.uiAssertions.filter(a => !a.passed).map(a => a.id).sort() ?? [],
    needsReview: trajectory?.evidence.filter(e => e.status === "needs_review").map(e => e.factId).sort() ?? [],
    reopenFailures: trajectory?.artifacts.filter(a => a.reopenPassed !== true).map(a => a.artifactId).sort() ?? [],
    missingReceipts: trajectory?.artifacts.filter(a => !a.exportPath).map(a => a.artifactId).sort() ?? [],
    oracleFailures: oracle?.checks.filter(c => !c.passed).map(c => c.name).sort() ?? [],
    attemptRejected,
    resolved: false,
  };
  outcome.resolved = ![outcome.failedAssertions, outcome.needsReview, outcome.reopenFailures, outcome.missingReceipts, outcome.oracleFailures].some(a => a.length)
    && !(trajectory?.innerTrace.steps.some(s => s.error) || trajectory?.outerTrace.consoleErrors.length);
  return { trajectory, oracle, outcome };
}

async function evaluate(bytes: Uint8Array, candidate: unknown, signal: AbortSignal) {
  validateCandidate(candidate);
  const cases = parseManifest(bytes).sort((a, b) => a.caseId < b.caseId ? -1 : a.caseId > b.caseId ? 1 : 0);
  for (const [path, expected] of Object.entries(SOURCE_HASHES)) {
    requireThat(sha256(portableText(await readLocal(resolve(ROOT, path), signal))) === expected, `source/hash mismatch: ${path}`);
  }
  const failure = (row: ReplayCase, outcome: Outcome) => buildFailurePatterns(outcome.resolved ? [] : [{
    taskId: row.caseId, lane: "isolated", receiptRef: `sha256:${row.caseSha256}`,
    reason: [
      ...outcome.failedAssertions.map(id => `assertion failed: ${id}`),
      ...outcome.needsReview.map(id => `needs_review: ${id}`),
      ...outcome.reopenFailures.map(id => `reopen failed: ${id}`),
      ...outcome.missingReceipts.map(id => `missing export receipt: ${id}`),
      ...outcome.oracleFailures.map(id => `oracle failed: ${id}`),
    ].join("; "),
  }], 0);
  const initialMemory = cases.flatMap(row => failure(row, observe(row.baseline, false).outcome));
  let memory = initialMemory;
  const records = cases.map(row => {
    signal.throwIfAborted();
    const baselineSha256 = semanticHash(row.baseline);
    let attemptRejected = false;
    if (row.attempt !== null) {
      try { validateCandidate(row.attempt); } catch { attemptRejected = true; }
      requireThat(attemptRejected, "frozen forged-pass control was accepted");
    }
    const result = observe(row.observation ?? row.baseline, attemptRejected);
    requireThat(semanticHash(result.outcome) === semanticHash(row.expected), `inconsistent outcome: ${row.caseId}`);
    const previousTargets = repairTargets(memory);
    // Only the observed, source-pinned outcome can authorize clearing this task's entry.
    const incoming = failure(row, result.outcome);
    // Replace this task's current summary; immutable baseline evidence remains in its record.
    const existing = incoming.length ? memory.filter(p => !p.affectedSystems.includes(row.caseId)) : memory;
    memory = mergeFailureMemory(existing, incoming, result.outcome.resolved ? [row.caseId] : []);
    const targets = repairTargets(memory);
    requireThat(previousTargets.filter(id => id !== row.caseId).every(id => targets.includes(id)), "cleared another task's failure");
    requireThat(memory.length <= LIMITS.cases, "failure memory bound (32)");
    requireThat(semanticHash(row.baseline) === baselineSha256, "source evidence mutated");
    const reward = result.trajectory ? result.trajectory.reward ?? computeMergedReward(result.trajectory) : null;
    return {
      ...HONESTY, caseId: row.caseId, groupId: row.groupId, split: row.split, provenance: row.provenance,
      caseSha256: row.caseSha256, baselineSha256, baseline: row.baseline,
      observationSha256: semanticHash(row.observation ?? row.baseline), trajectory: result.trajectory,
      reward: reward ? { origin: result.trajectory?.reward ? "supplied_archived" : "derived_from_frozen_trace", value: reward, agentQualityScore: false } : null,
      oracle: result.oracle, outcome: result.outcome,
      repairPrompt: result.trajectory ? generateRepairPrompt(result.trajectory, reward!) : null,
      regression: result.trajectory ? toRegressionCase(result.trajectory, reward!) : null,
      protocolChecks: { expectedOutcomeMatched: true, immutableBaseline: true, unrelatedFailuresPreserved: true },
      memoryCountAfter: memory.length,
    };
  });
  const reflectiveRecords = records.filter(r => r.split === "development").map(r => ({
    ...HONESTY, caseId: r.caseId, groupId: r.groupId, component: "repair_instructions", repairPrompt: r.repairPrompt, regression: r.regression,
  }));
  const semantic = {
    ...HONESTY, schemaVersion: 1, mode: "offline_protocol", proof: "FailureReplayProtocol-v1", sourceCommit: SOURCE_COMMIT,
    hashConvention: "utf8-crlf-to-lf-v1", caseManifestSha256: MANIFEST_SHA256, sourceHashes: SOURCE_HASHES, candidateSha256: semanticHash(candidate),
    protocolPassed: true, agentExecuted: false, optimizerInvoked: false, billedTokens: 0,
    commandHints: "Originating NodeRoom repository only; inert and not executable by this caller.",
    records, initialMemory, failureMemory: memory, repairTargets: repairTargets(memory), reflectiveRecords,
  };
  return { ...semantic, semanticSha256: semanticHash(semantic) };
}

export function encodeReceipt(receipt: unknown): string {
  const output = JSON.stringify(receipt, null, 2) + "\n";
  requireThat(Buffer.byteLength(output) <= LIMITS.outputBytes, "output bound (2MiB)");
  return output;
}

/** Isolated state per invocation; candidate instructions are data and never run. */
export async function replay(bytes: Uint8Array, candidate: unknown = { repair_instructions: "" }) {
  const signal = AbortSignal.timeout(LIMITS.processMs);
  const receipt = await evaluate(bytes, candidate, signal);
  signal.throwIfAborted();
  encodeReceipt(receipt);
  return receipt;
}

async function main() {
  const args = process.argv.slice(2);
  requireThat(args.length === 2 && args[0] === "--cases", "usage: node experiments/harness-replay/replay.ts --cases experiments/harness-replay/cases.json");
  requireThat(resolve(args[1]) === MANIFEST_PATH, "CLI accepts only the frozen cases path inside this checkout");
  const signal = AbortSignal.timeout(LIMITS.processMs);
  const start = performance.now();
  const receipt = await evaluate(await readLocal(MANIFEST_PATH, signal), { repair_instructions: "" }, signal);
  signal.throwIfAborted();
  const output = encodeReceipt({ ...receipt, resources: { elapsedMs: performance.now() - start, maxRssKiB: process.resourceUsage().maxRSS, ...process.memoryUsage() } });
  await new Promise<void>((resolveWrite, reject) => process.stdout.write(output, error => error ? reject(error) : resolveWrite()));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const watchdog = setTimeout(() => { process.stderr.write("replay process budget exceeded\n"); process.exit(1); }, LIMITS.processMs);
  try { await main(); } catch (error) {
    process.stderr.write(encodeReceipt({ ...HONESTY, protocolPassed: false, error: error instanceof Error ? error.message : "replay failed" }));
    process.exitCode = 1;
  } finally { clearTimeout(watchdog); }
}
