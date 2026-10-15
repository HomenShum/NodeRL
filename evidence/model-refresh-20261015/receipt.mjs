/**
 * receipt.mjs — live receipt for the claude-haiku-5-5 default (SPEC model-defaults §A.0.3, §A.2.1).
 *
 * Makes ONE aiSdkReasoner().decide() call (the real builder, the locked SDK) and writes receipt.json next to
 * this file. It is run by a person with a key, on a clean tree; CI never runs it (no key, paid).
 *
 *   ANTHROPIC_API_KEY=... node evidence/model-refresh-20261015/receipt.mjs
 *
 * Cost: ~$0.00006 actual; $0.064 worst case (the SDK sends max_tokens 128000 for this id); hard cap $0.24.
 * The cap is checked on the outgoing request body BEFORE it is sent, and only one request is allowed.
 *
 * Then commit the written receipt.json as a receipt-only commit on top of the tested commit: nothing
 * outside evidence/ may change after it (§A.0.3 form a). A rejected receipt is re-run, never edited.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const CONSTANT_FILE = "packages/nodetrace/src/reasoning.ts";
const CANDIDATE = "claude-haiku-5-5";
const MAX_USD = 0.24;
const PRICE = { inPerM: 0.10, outPerM: 0.50, source: "SPEC-v3 §A.2.10 (vendor list price, pricingAsOf 2026-10-10)" };

const git = (...args) => execFileSync("git", args, { cwd: ROOT, maxBuffer: 64 << 20 });
const fail = (msg) => { console.error(`receipt: ${msg}`); process.exit(1); };

if (!process.env.ANTHROPIC_API_KEY?.trim()) fail("ANTHROPIC_API_KEY is not set; this is a paid, keyed call. Nothing was sent.");
if (git("status", "--porcelain").length) fail("working tree is not clean (§A.0.3 rejects gitDirty). Commit or stash first. Nothing was sent.");
const testedCommit = git("rev-parse", "HEAD").toString().trim();
// Raw blob bytes at testedCommit. Never hash the working copy: core.autocrlf=true makes it CRLF on Windows.
const constantSha256 = createHash("sha256").update(git("show", `${testedCommit}:${CONSTANT_FILE}`)).digest("hex");

// Wrap fetch BEFORE reasoning.ts is imported, so the provider client captures what is actually sent/returned.
const realFetch = globalThis.fetch;
const wire = { requests: 0, body: null, response: null, estimateUsd: 0 };
globalThis.fetch = async (url, init) => {
  if (wire.requests >= 1) throw new Error("receipt: budget stop, only one request is allowed");
  const body = JSON.parse(String(init?.body));
  const inTokens = Buffer.byteLength(String(init.body)); // upper bound: a token covers at least one UTF-8 byte (the 3-chars-per-token guess undercounted: 491 chars -> 280 tokens)
  wire.estimateUsd = (inTokens * PRICE.inPerM + body.max_tokens * PRICE.outPerM) / 1e6;
  if (!(wire.estimateUsd <= MAX_USD)) throw new Error(`receipt: budget stop, worst case $${wire.estimateUsd} > cap $${MAX_USD}`);
  wire.requests++;
  wire.body = body;
  const res = await realFetch(url, init);
  wire.response = await res.clone().json().catch(() => null);
  return res;
};

const { z } = await import("zod");
const { aiSdkReasoner, DEFAULT_REASONING_MODEL } = await import("../../packages/nodetrace/src/reasoning.ts");
const startedAt = new Date().toISOString();
const reasoner = aiSdkReasoner();
let stoppedBy = null;
try {
  await reasoner.decide({
    system: "Reply with JSON only.", instruction: "Set ok to true.", schema: z.object({ ok: z.boolean() }),
    context: { url: "https://example.com/", title: "receipt", a11y: "n/a" },
  });
} catch (e) {
  stoppedBy = String(e?.message ?? e);
}

const usage = wire.response?.usage ?? null;
const costUsd = usage ? (usage.input_tokens * PRICE.inPerM + usage.output_tokens * PRICE.outPerM) / 1e6 : 0;
const row = {
  requestedModel: reasoner.name, // the id the reasoner was asked for (the default, no override)
  resolvedModel: wire.body?.model ?? null, // the id actually sent on the wire (the selected id)
  echoedModel: wire.response?.model ?? null, // the `model` string the provider returned
  usage,
  costUsd, // list price x provider-reported usage
  fallbackUsed: wire.body?.model !== DEFAULT_REASONING_MODEL,
};
const receipt = {
  command: "node evidence/model-refresh-20261015/receipt.mjs", // ANTHROPIC_API_KEY comes from the environment and is never recorded
  candidateIds: [CANDIDATE],
  echoedModels: [row.echoedModel],
  rows: [row],
  testedCommit,
  constantSha256,
  constantFile: CONSTANT_FILE,
  dispatchPolicy: { maxRetries: 0, crossModelFallback: false }, // SDK retries are refused at the fetch wrapper (one request max); the call names one model
  budget: { maxUsd: MAX_USD, estimateUsd: wire.estimateUsd, spentUsd: costUsd, requests: wire.requests, stoppedBy },
  price: PRICE,
  startedAt,
  environment: { node: process.version, platform: process.platform, sdk: JSON.parse(readFileSync(join(ROOT, "node_modules/@ai-sdk/anthropic/package.json"), "utf8")).version },
};

const bad = stoppedBy ?? (row.requestedModel !== CANDIDATE || row.requestedModel !== row.resolvedModel || row.resolvedModel !== row.echoedModel || row.fallbackUsed || !usage ? "model mismatch or no usage" : null);
console.log(JSON.stringify(receipt, null, 2));
if (bad) fail(`REJECTED (${bad}); no receipt file written. Re-run after fixing the cause.`);
const out = join(HERE, "receipt.json");
writeFileSync(out, JSON.stringify(receipt, null, 2) + "\n");
console.error(`receipt written: ${out}`);
