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

// Trim env keys: a stray trailing \r (Windows copy/pipe artifact in `convex env set`) would otherwise
// produce a malformed "Authorization: Bearer …\r" header and break the provider call.
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim() });
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY?.trim() });

function providerFor(modelId: string): LanguageModel {
  if (modelId.startsWith("gpt") || modelId.startsWith("o1") || modelId.startsWith("o3") || modelId.startsWith("o4")) return openai(modelId);
  return anthropic(modelId); // default + all claude-* ids
}

/** Default model for `aiSdkReasoner` (SPEC model-defaults §A.2.1; wire id per §1.2, `anthropic` transport). */
export const DEFAULT_REASONING_MODEL = "claude-haiku-5-5";

// The 12-step / 60 s pipeline ceiling (docs/codebase/ARCHITECTURE.md) argues for low effort. Sent only to the
// 5.5 ids: `output_config.effort` is not accepted by older caller-supplied Claude ids, which keep today's request.
const providerOptionsFor = (modelId: string) =>
  modelId.startsWith("claude-") && modelId.endsWith("-5-5") ? { anthropic: { effort: "low" as const } } : undefined;

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
      const { object } = await generateObject({
        model: providerFor(modelId),
        schema, // zod schema → generateObject validates the result to T
        system,
        messages: [{ role: "user", content }],
        abortSignal: signal,
        providerOptions: providerOptionsFor(modelId),
      });
      return object as T;
    },
  };
}
