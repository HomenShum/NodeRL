/**
 * pipeline.test.ts — proves the capture loop rejects a malformed model reply AT THE SEAM.
 *
 * Why this test exists (it is guarding a claim that was not true):
 * `docs/START_HERE.md` and `.tours/02-agent-execution.tour` both told a reader that "DecisionSchema is
 * a Zod schema, so a model reply that is not a valid action is rejected at the seam rather than
 * halfway down the loop." The loop HANDED the schema to the reasoner and never parsed anything. With
 * the default `aiSdkReasoner` that happened to be true, because `generateObject` validates — but
 * `ReasoningModel` is the documented swap-your-own-model seam, and a caller's implementation owes the
 * loop nothing. A reply with no `action` used to sail past and die later in the extract step with
 * "Cannot read properties of undefined", which names neither the cause nor the culprit.
 *
 * No network, no key: the substrate and the model are both local fakes.
 *
 * Run: npm test   (or: node --test packages/nodetrace/test/pipeline.test.ts)
 */
import assert from "node:assert/strict";
import { runCapture } from "../src/pipeline.ts";
import type { BrowserSubstrate, PageHandle, ReasoningModel } from "../src/types.ts";

let pass = 0, fail = 0;
async function scenario(name: string, fn: () => Promise<void>): Promise<void> {
  try { await fn(); console.log(`  PASS  ${name}`); pass++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${(e as Error).message}`); fail++; }
}

/** A page that always answers the same way. Records nothing; the loop is what is under test. */
const fakePage: PageHandle = {
  async representation() { return { url: "https://example.com/", title: "Reconciliation", a11y: "ending cash 12,128.25" }; },
  async screenshot() { return { png: new Uint8Array([1, 2, 3]), width: 800, height: 600 }; },
  async locate(target) { return { ...target, selector: "#stub", box: { x: 0.1, y: 0.2, w: 0.3, h: 0.05 } }; },
  async act() { return {}; },
  async close() { /* nothing to release */ },
};

const fakeSubstrate: BrowserSubstrate = {
  name: "fake",
  capabilities: { interactive: true },
  async open() { return fakePage; },
};

/** A model whose ACT reply is whatever the test says. Extract always returns one valid field. */
function reasonerReplying(actReply: unknown): ReasoningModel {
  return {
    name: "fake",
    async decide<T>({ system }: { system: string }): Promise<T> {
      if (system.startsWith("You extract")) {
        return { fields: [{ name: "endingCash", value: "12,128.25", sourceText: "ending cash 12,128.25" }] } as T;
      }
      return actReply as T;
    },
  };
}

await scenario("(a) SEAM — a reply that is not a valid action is rejected by the loop, naming the field", async () => {
  // `thought` is a number and there is no `action` — a shape the schema forbids.
  const res = await runCapture({
    url: "https://example.com/",
    goal: "read the ending cash",
    reasoner: reasonerReplying({ thought: 42 }),
    substrate: fakeSubstrate,
  });

  assert.equal(res.ok, false, "an invalid decision fails the capture honestly");
  assert.match(res.error ?? "", /thought/, "the error names the offending field");
  assert.doesNotMatch(res.error ?? "", /Cannot read properties/, "not a confusing failure several steps deeper");
  assert.equal(res.steps.at(-1)?.phase, "Error", "the failure is recorded as a step, not swallowed");
});

await scenario("(b) HAPPY PATH — a well-formed reply still runs through to extraction", async () => {
  const res = await runCapture({
    url: "https://example.com/",
    goal: "read the ending cash",
    reasoner: reasonerReplying({ thought: "everything needed is on screen", done: true }),
    substrate: fakeSubstrate,
  });

  assert.equal(res.ok, true);
  assert.deepEqual(res.data, { endingCash: "12,128.25" });
  assert.ok(res.steps.some((s) => s.phase === "Extract"), "the extract step is recorded");
});

await scenario("(c) EXTRACT IS PARSED TOO — a malformed extraction fails rather than writing junk", async () => {
  const liar: ReasoningModel = {
    name: "fake",
    async decide<T>({ system }: { system: string }): Promise<T> {
      if (system.startsWith("You extract")) return { fields: "all of them" } as T;
      return { thought: "done", done: true } as T;
    },
  };
  const res = await runCapture({ url: "https://example.com/", goal: "g", reasoner: liar, substrate: fakeSubstrate });

  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /fields/);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
