/**
 * NodeMem — the public surface.
 *
 * What an agent should remember between runs, and what it should be handed at the start
 * of the next one. Three jobs:
 *
 * 1. CLASSIFY — is this piece of text worth remembering at all, and about what?
 * 2. COMPILE — turn one finished episode into durable entities, facts and decisions.
 * 3. RETRIEVE — given the next goal, decide which memory shelves to read and rank what
 *    comes back.
 *
 * Plus a failure store: turn per-task failures into patterns so a re-run targets only
 * what is still broken.
 *
 * Every export is a pure function. Storage is the caller's problem, deliberately —
 * nothing here reaches for a database, so it runs anywhere.
 */

/** The record shapes everything else is written in terms of — episodes, entities, facts,
 *  decisions, failure patterns, context packs, and the shelves they live on. */
export * from "./core/types.ts";

/** 1. Is this text noteworthy, and what entity is it about? */
export * from "./core/classifier.ts";

/** 2. One finished episode -> the durable records it should leave behind. */
export * from "./core/memoryCompiler.ts";

/** 3. Given the next goal, which shelves to read and how to rank what comes back. */
export * from "./core/retrievalPlanner.ts";

/** Failures -> patterns -> the exact re-run command that would prove each one fixed. */
export * from "./failureMemory.ts";
