/**
 * model-defaults-workflow.test.ts — the consumer workflow's contract (SPEC model-defaults §B.6): weekly,
 * least privilege per job, the same 40-hex NodeKit commit everywhere, no secret, no merge. Reads the file as text
 * so this repo needs no YAML dependency.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const text = readFileSync(new URL("../.github/workflows/model-defaults.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("every NodeKit reference is the same 40-hex commit, as the uses ref and as platform_sha", () => {
  const refs = [...text.matchAll(/model-bump\.yml@([^\s]+)/g)].map((m) => m[1]);
  const shas = [...text.matchAll(/platform_sha: ([^\s]+)/g)].map((m) => m[1]);
  assert.equal(refs.length, 3, "lint, watch, bump");
  assert.equal(shas.length, 3);
  for (const ref of [...refs, ...shas]) assert.match(ref, /^[0-9a-f]{40}$/, `not a 40-hex SHA: ${ref}`);
  assert.equal(new Set([...refs, ...shas]).size, 1, "uses ref and platform_sha move together");
});

test("permissions: none at the top, read for lint, issues for watch, contents+PR for bump, nothing else", () => {
  assert.match(text, /^permissions: \{\}$/m);
  const job = (name: string) => text.split(new RegExp(`^  ${name}:$`, "m"))[1].split(/^  \w+:$/m)[0];
  assert.deepEqual([...job("lint").matchAll(/^      ([a-z-]+): (\w+)$/gm)].map((m) => `${m[1]}:${m[2]}`).filter((s) => /:(read|write)$/.test(s)), ["contents:read"]);
  assert.deepEqual([...job("watch").matchAll(/^      ([a-z-]+): (\w+)$/gm)].map((m) => `${m[1]}:${m[2]}`).filter((s) => /:(read|write)$/.test(s)), ["contents:read", "issues:write"]);
  assert.deepEqual([...job("bump").matchAll(/^      ([a-z-]+): (\w+)$/gm)].map((m) => `${m[1]}:${m[2]}`).filter((s) => /:(read|write)$/.test(s)), ["contents:write", "pull-requests:write"]);
});

test("weekly schedule, manual runs default to a dry run, no secret, no merge", () => {
  assert.match(text, /cron: "\d+ \d+ \* \* 2"/);
  assert.match(text, /dry_run:\n(?:.*\n)*?\s+default: true/);
  assert.doesNotMatch(text, /secrets\.|ANTHROPIC|OPENAI|OPENROUTER|GEMINI/);
  assert.doesNotMatch(text, /gh pr merge|automerge|--auto/i);
  assert.doesNotMatch(text, /pull_request_target/);
  assert.match(text, /needs: watch/);
});
