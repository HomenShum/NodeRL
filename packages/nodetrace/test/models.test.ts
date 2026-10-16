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
const { aiSdkReasoner, DEFAULT_REASONING_MODEL, providerOptionsFor } = await import("../src/reasoning.ts");
const { default: lock } = await import("../../../models.lock.json", { with: { type: "json" } });
const { resolveModel, resolveWith, wireId } = await import("../src/models.ts");

// Returns the captured request body and any decide() error. Callers assert on the body FIRST so a wrong request
// shape (e.g. an old SDK forcing a `json` tool) is named directly, then assert the error is absent.
async function captureBody(reasoner: ReturnType<typeof aiSdkReasoner>, stopReason = "end_turn"): Promise<{ body: Record<string, any>; err: unknown }> {
  const realFetch = globalThis.fetch;
  let body: Record<string, any> | undefined;
  let err: unknown;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      id: "msg_test", type: "message", role: "assistant", model: body!.model, stop_reason: stopReason,
      content: [{ type: "text", text: '{"ok":true}' }], usage: { input_tokens: 1, output_tokens: 1 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    await reasoner.decide({
      system: "s", instruction: "i", schema: z.object({ ok: z.boolean() }),
      context: { url: "https://example.com/", title: "t", a11y: "a" },
    });
  } catch (e) { err = e; } finally { globalThis.fetch = realFetch; }
  assert.ok(body, `no request reached the fake transport (decide error: ${err})`);
  return { body, err };
}

// Was: DEFAULT_REASONING_MODEL === "claude-haiku-5-5", the same literal in the request body, and effort "low"
// unconditionally. Those pinned today's id, so the weekly bump (which runs this test before it opens its PR) could
// never deliver a reviewed successor: it would fail every week. The id, its wire string and the effort are now read
// from the lock, so a legitimate registry move passes here and a wrong request still fails.
test("default reasoner sends the lock's wire id with none of the keys the Haiku 5.5 line rejects", async () => {
  const role = lock.roles.reasoner;
  assert.equal(DEFAULT_REASONING_MODEL, role.id);
  const { body, err } = await captureBody(aiSdkReasoner());
  assert.equal(body.model, wireId(role.id, role.transport));
  for (const k of ["temperature", "top_p", "top_k"]) assert.ok(!(k in body), `${k} must be absent`);
  assert.ok(!JSON.stringify(body.thinking ?? {}).includes("budget_tokens"), "no budget_tokens");
  assert.notEqual(body.messages.at(-1).role, "assistant", "no assistant prefill");
  assert.ok(!("tool_choice" in body), "no forced tool_choice");
  assert.ok(!(body.tools ?? []).some((t: any) => t.name === "json"), "no json-tool forcing");
  assert.equal(body.output_config?.format?.type, "json_schema", "native structured output path");
  // effort goes out only when the lock's constraints for the pinned id list it (see providerOptionsFor)
  if ((role.constraints.efforts as string[]).includes("low")) assert.equal(body.output_config?.effort, "low", "effort set explicitly");
  else assert.ok(!("effort" in (body.output_config ?? {})), "an id that does not list 'low' is not sent it");
  assert.ok(body.max_tokens > 4096, `max_tokens ${body.max_tokens} must not be the unknown-model 4096 cap`);
  assert.ifError(err);
});

test("caller-supplied older Claude id is sent as given, without effort", async () => {
  const { body, err } = await captureBody(aiSdkReasoner("claude-haiku-4-5"));
  assert.equal(body.model, "claude-haiku-4-5");
  assert.ok(!("effort" in (body.output_config ?? {})), "effort is only sent to the migrated default");
  assert.ifError(err);
});

// §A.0 rule 4 / §1.3: the lock supplies only the default. Other 5.5 ids a caller passes have their own effort
// defaults (Sonnet 5.5 high, Opus 5.5 medium), so they must keep today's request, not silently get "low".
for (const id of ["claude-sonnet-5-5", "claude-opus-5-5"]) {
  test(`caller-supplied ${id} is sent as given, without effort`, async () => {
    const { body, err } = await captureBody(aiSdkReasoner(id));
    assert.equal(body.model, id);
    assert.ok(!("effort" in (body.output_config ?? {})), "effort is only sent to the migrated default");
    assert.ifError(err);
  });
}

// Haiku 5.5 checklist [BLOCKS] item / README "never a fake success": a refusal (stop_reason "refusal", which the SDK
// reports as finishReason "content-filter") must fail decide() even when its text is schema-valid.
test("a refusal with schema-valid text fails decide() instead of returning an object", async () => {
  const { err } = await captureBody(aiSdkReasoner(), "refusal");
  assert.ok(err instanceof Error, "decide() must throw on a refusal");
  assert.match(String((err as Error).message), /refused/);
});

// ── the lock is the source of the default (SPEC model-defaults §B.5, §B.6) ───────────────────────────────────────

test("the default is the lock's reasoner role, and the request carries the lock's wire id and honours its constraints", async () => {
  const role = lock.roles.reasoner;
  assert.equal(DEFAULT_REASONING_MODEL, role.id);
  assert.equal(wireId(role.id, role.transport), role.ids.anthropic);
  const { body, err } = await captureBody(aiSdkReasoner());
  assert.equal(body.model, role.ids.anthropic, "the model string equals the lock");
  // The lock's constraints drive the assertions, so a registry change to them is checked against the real request.
  const c = role.constraints as Record<string, unknown>;
  if (c.sampling === "forbidden") for (const k of ["temperature", "top_p", "top_k"]) assert.ok(!(k in body), `${k} is forbidden by the lock`);
  if (c.prefill === "forbidden") assert.notEqual(body.messages.at(-1).role, "assistant");
  if (c.budgetTokens === "forbidden") assert.ok(!JSON.stringify(body.thinking ?? {}).includes("budget_tokens"));
  assert.ok(body.max_tokens >= role.minMaxTokens, "role.minMaxTokens: an adaptive-thinking id needs headroom");
  assert.ifError(err);
});

// The effort option is the one part of the request that depends on WHICH id is the default: it goes to the lock's
// default only, and only when that id's constraints list "low" (a successor with a different effort set must not be
// sent a value it rejects, which would make the first real retirement fail at runtime instead of in this test).
test("providerOptionsFor: effort low goes to the lock's default only, and only when its constraints list it", () => {
  const role = (id: string, efforts?: string[]) => ({ ...resolveModel("reasoner"), id, constraints: efforts ? { efforts } : null });
  assert.deepEqual(providerOptionsFor("claude-haiku-5-6", role("claude-haiku-5-6", ["low", "medium"])), { anthropic: { effort: "low" } });
  assert.equal(providerOptionsFor("claude-haiku-5-6", role("claude-haiku-5-6", ["medium", "high"])), undefined, "a successor without 'low' is not sent it");
  assert.equal(providerOptionsFor("claude-haiku-5-6", role("claude-haiku-5-6")), undefined, "no constraints: nothing is assumed");
  assert.equal(providerOptionsFor("claude-sonnet-5-5", role("claude-haiku-5-6", ["low"])), undefined, "a caller-supplied id keeps its own request");
  assert.deepEqual(providerOptionsFor(DEFAULT_REASONING_MODEL), providerOptionsFor(lock.roles.reasoner.id), "the committed lock is the default source");
});

test("the lock has the shape the accessor and NodeKit's lint rely on, and no clock inside its decision fields", () => {
  assert.equal(lock.schemaVersion, "nodeplatform.model-defaults/v1");
  assert.match(lock.registrySha256, /^[0-9a-f]{64}$/);
  assert.match(lock.registryRef, /^[0-9a-f]{40}$/);
  const role = lock.roles.reasoner;
  assert.ok(role.lineTransports.includes(role.transport), "(b2) the role's transport is one its line offers");
  assert.ok(role.ids[role.transport as keyof typeof role.ids], "(b2) a verified wire id exists for the transport in use");
  assert.ok(role.id in lock.known, "the pinned id is also a known id");
  assert.ok(!JSON.stringify(lock).includes("checkedAt"));
  assert.deepEqual(lock.frozen, []);
});

test("resolveModel covers all four sources, takes the transport from the override's own ids, and never constructs a wire id", () => {
  const fromLock = resolveModel("reasoner");
  assert.deepEqual([fromLock.source, fromLock.id, fromLock.transport, fromLock.provider], ["lock", lock.roles.reasoner.id, "anthropic", "anthropic"]);

  const known = resolveModel("reasoner", "claude-sonnet-5-5");
  assert.deepEqual([known.source, known.transport], ["override", "anthropic"]);
  assert.equal((known.constraints as Record<string, unknown>).forcedToolChoice, "forbidden", "an override carries its OWN constraints, not the default's");

  const unknown = resolveModel("reasoner", "claude-haiku-4-5");
  assert.deepEqual([unknown.source, unknown.id, unknown.transport, unknown.constraints], ["override-unknown", "claude-haiku-4-5", null, null]);

  // A reviewed id with no wire id on the role's transport and none on its own provider's transport.
  const bedrockOnly = structuredClone(lock);
  (bedrockOnly.known as Record<string, any>)["claude-opus-5-5"].ids = { bedrock: "anthropic.claude-opus-5-5" };
  const incompatible = resolveWith(bedrockOnly, "reasoner", "claude-opus-5-5");
  assert.deepEqual([incompatible.source, incompatible.transport, incompatible.constraints], ["override-incompatible", null, null]);

  // A reviewed id that is only reachable on its provider's own transport falls back to that transport.
  const viaProvider = structuredClone(lock);
  (viaProvider.roles.reasoner as any).transport = "openrouter";
  assert.equal(resolveWith(viaProvider, "reasoner", "claude-sonnet-5-5").transport, "openrouter");
  (viaProvider.known as Record<string, any>)["claude-sonnet-5-5"].ids = { anthropic: "claude-sonnet-5-5" };
  assert.equal(resolveWith(viaProvider, "reasoner", "claude-sonnet-5-5").transport, "anthropic");

  assert.throws(() => wireId("claude-haiku-5-5", "openai"), /no verified openai id for claude-haiku-5-5/);
  assert.throws(() => wireId("gpt-nothing", "anthropic"), /no verified anthropic id/);
});

test("a caller-supplied id the registry does not know still reaches the wire as given (callers keep their own routing)", async () => {
  const { body, err } = await captureBody(aiSdkReasoner("claude-haiku-4-5"));
  assert.equal(body.model, "claude-haiku-4-5");
  assert.equal(resolveModel("reasoner", "claude-haiku-4-5").source, "override-unknown");
  assert.ifError(err);
});
