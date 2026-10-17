/**
 * aiSdkReasoner — the default ReasoningModel, provider-agnostic via the Vercel AI SDK (already a repo
 * dep). Pick the provider by model id; the AI SDK clients auto-read ANTHROPIC_API_KEY / OPENAI_API_KEY
 * from the environment. This is the "bring your own reasoning model" seam: swap this impl (or its id)
 * to route act/observe/extract through any model — Claude, GPT, a local endpoint — without touching the
 * pipeline. Vision models additionally get the screenshot, so observe/extract can reason over pixels.
 */
import { generateObject, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { ReasoningModel } from "./types.ts";
import { resolveModel, type Resolved } from "./models.ts";

// Trim env keys: a stray trailing \r (Windows copy/pipe artifact in `convex env set`) would otherwise
// produce a malformed "Authorization: Bearer …\r" header and break the provider call.
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY?.trim() });

function providerFor(modelId: string): LanguageModel {
  if (modelId.startsWith("gpt") || modelId.startsWith("o1") || modelId.startsWith("o3") || modelId.startsWith("o4")) return openai(modelId);
  return anthropic(modelId); // default + all claude-* ids
}

/**
 * Default model for `aiSdkReasoner`. Not typed here: it is the `reasoner` role in models.lock.json, which NodeKit's
 * weekly `nodekit models sync` proposes changes to (models.config.json declares the role). A human merges that
 * proposal; this file does not change when the registry moves the default.
 */
export const DEFAULT_REASONING_MODEL = resolveModel("reasoner").id;

// The 12-step / 60 s pipeline ceiling (docs/codebase/ARCHITECTURE.md) argues for low effort. Keyed on the exact
// lock default only: every caller-supplied id (including other 5.5 ids, whose own effort defaults differ,
// SPEC §1.3) keeps today's request. And only when the lock's constraints for that id list "low": a reviewed
// successor with a different effort set is not sent a value it may reject.
export const providerOptionsFor = (modelId: string, role: Resolved = resolveModel("reasoner")) =>
  modelId === role.id && (role.constraints as { efforts?: string[] } | null)?.efforts?.includes("low") ? { anthropic: { effort: "low" as const } } : undefined;

export function aiSdkReasoner(modelId: string = DEFAULT_REASONING_MODEL): ReasoningModel {
  return {
    name: modelId,
    async decide<T>({ system, instruction, context, schema, signal }: {
      system: string; instruction: string; context: import("./types").ReasoningContext; schema: import("zod").ZodType<T>; signal?: AbortSignal;
    }): Promise<T> {
      const text = [
        instruction,
        "",
        `PAGE: ${context.title} — ${context.url}`,
        "ACCESSIBILITY TREE / TEXT:",
        context.a11y,
      ].join("\n");
      const content: Array<{ type: "text"; text: string } | { type: "image"; image: Uint8Array }> = [{ type: "text", text }];
      if (context.screenshot) content.push({ type: "image", image: context.screenshot.png });
      const { object, finishReason } = await generateObject({
        model: providerFor(modelId),
        schema, // zod schema → generateObject validates the result to T
        system,
        messages: [{ role: "user", content }],
        abortSignal: signal,
        providerOptions: providerOptionsFor(modelId),
      });
      // The SDK maps Anthropic stop_reason "refusal" to "content-filter". A refusal whose text still parses against
      // the schema would otherwise return as a successful capture (README: "never a fake success"). Haiku 5.5 has no
      // server-side fallback for refusals (SPEC §1.3), so fail here and let runCapture record { ok: false }.
      if (finishReason === "content-filter") throw new Error(`${modelId} refused the request (finishReason: content-filter)`);
      return object as T;
    },
  };
}
