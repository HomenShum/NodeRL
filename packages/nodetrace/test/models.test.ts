/**
 * models.test.ts — request-shape proof for the default reasoning model (SPEC model-defaults §A.2.1, §A.0.6).
 *
 * Builds a real `generateObject` request through `aiSdkReasoner` and the locked @ai-sdk/anthropic, with a fake
 * fetch standing in for the network (no key, no spend). Asserts the wire id is the §1.2 `anthropic` id and that
 * none of the keys Haiku 5.5 rejects are in the body: sampling params, `budget_tokens`, assistant prefill, a
 * forced `tool_choice` (structured output must go through the native `output_config.format` path, not a `json` tool).
 *
 * Run: npm test   (or: node --test packages/nodetrace/test/models.test.ts)
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";

process.env.ANTHROPIC_API_KEY = "test-key-not-real";
const { aiSdkReasoner, DEFAULT_REASONING_MODEL } = await import("../src/reasoning.ts");

async function captureBody(reasoner: ReturnType<typeof aiSdkReasoner>): Promise<Record<string, any>> {
  const realFetch = globalThis.fetch;
  let body: Record<string, any> | undefined;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      id: "msg_test", type: "message", role: "assistant", model: body!.model, stop_reason: "end_turn",
      content: [{ type: "text", text: '{"ok":true}' }], usage: { input_tokens: 1, output_tokens: 1 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    await reasoner.decide({
      system: "s", instruction: "i", schema: z.object({ ok: z.boolean() }),
      context: { url: "https://example.com/", title: "t", a11y: "a" },
    });
  } finally { globalThis.fetch = realFetch; }
  assert.ok(body, "no request reached the fake transport");
  return body;
}

test("default reasoner sends claude-haiku-5-5 with no Haiku-5.5-forbidden keys", async () => {
  assert.equal(DEFAULT_REASONING_MODEL, "claude-haiku-5-5");
  const body = await captureBody(aiSdkReasoner());
  assert.equal(body.model, "claude-haiku-5-5");
  for (const k of ["temperature", "top_p", "top_k"]) assert.ok(!(k in body), `${k} must be absent`);
  assert.ok(!JSON.stringify(body.thinking ?? {}).includes("budget_tokens"), "no budget_tokens");
  assert.notEqual(body.messages.at(-1).role, "assistant", "no assistant prefill");
  assert.ok(!("tool_choice" in body), "no forced tool_choice");
  assert.ok(!(body.tools ?? []).some((t: any) => t.name === "json"), "no json-tool forcing");
  assert.equal(body.output_config?.format?.type, "json_schema", "native structured output path");
  assert.equal(body.output_config?.effort, "low", "effort set explicitly");
  assert.ok(body.max_tokens > 4096, `max_tokens ${body.max_tokens} must not be the unknown-model 4096 cap`);
});

test("caller-supplied older Claude id is sent as given, without effort", async () => {
  const body = await captureBody(aiSdkReasoner("claude-haiku-4-5"));
  assert.equal(body.model, "claude-haiku-4-5");
  assert.ok(!("effort" in (body.output_config ?? {})), "effort is only sent to 5.5 ids");
});
