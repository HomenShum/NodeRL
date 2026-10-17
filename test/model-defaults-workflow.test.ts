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

test("lint runs on every pull request: rule (b) scans the whole repo, so a path filter would let a raw model id merge unlinted", () => {
  const trigger = text.split(/^on:$/m)[1].split(/^permissions:/m)[0];
  assert.match(trigger, /^  pull_request:$/m);
  assert.doesNotMatch(trigger, /^\s+paths(-ignore)?:/m, "a path filter narrows lint to part of what lint scans");
  assert.doesNotMatch(trigger, /^\s+branches(-ignore)?:/m);
});

test("weekly schedule, manual runs default to a dry run, no secret, no merge", () => {
  assert.match(text, /cron: "\d+ \d+ \* \* 2"/);
  assert.match(text, /dry_run:\n(?:.*\n)*?\s+default: true/);
  assert.doesNotMatch(text, /secrets\.|ANTHROPIC|OPENAI|OPENROUTER|GEMINI/);
  assert.doesNotMatch(text, /gh pr merge|automerge|--auto/i);
  assert.doesNotMatch(text, /pull_request_target/);
  assert.match(text, /needs: watch/);
});

// The scheduled run is the only thing that makes this repo's default current without anyone remembering. A `dry_run`
// that is true on a schedule leaves every run green while the URGENT issue (and the "registry refresh not running"
// alarm) and the proposal PR never open, so the expression is evaluated for each event, not just matched as text.
test("watch and bump are live on the weekly schedule and a dry run on a default manual run", () => {
  const job = (name: string) => text.split(new RegExp(`^  ${name}:$`, "m"))[1].split(/^  \w+:$/m)[0];
  const dryRun = (name: string, eventName: string, dispatchInput?: boolean) => {
    const raw = job(name).match(/^      dry_run: (.+)$/m)?.[1].trim();
    assert.ok(raw, `${name} passes dry_run`);
    if (raw === "true" || raw === "false") return raw === "true"; // a literal: evaluated as written
    const expr = raw.match(/^\$\{\{ ([\w.\s='&|!()]+) \}\}$/)?.[1];
    assert.ok(expr, `${name}: dry_run is a literal or a plain expression, got ${raw}`);
    return Boolean(new Function("github", "inputs", `return ${expr};`)({ event_name: eventName }, { dry_run: dispatchInput }));
  };
  for (const name of ["watch", "bump"]) {
    assert.equal(dryRun(name, "schedule"), false, `${name}: the scheduled run must act`);
    assert.equal(dryRun(name, "workflow_dispatch", true), true, `${name}: a default manual run pushes nothing`);
    assert.equal(dryRun(name, "workflow_dispatch", false), false, `${name}: a manual run with the box unticked acts`);
  }
});
