#!/usr/bin/env node
// Producer for `audit-toolchain-versions.json`.
//
// At the 2026-08-13 baseline, conditions 7 and 8 were UNVERIFIED with the
// reason "audit not run". That reason is ambiguous: it does not say whether the
// audit tooling was missing or the thing to audit was missing. Those are very
// different states — the first is fixable by installing something, the second
// is not.
//
// This resolves the ambiguity by measurement rather than assertion: it invokes
// each audit tool and records what the tool itself printed. Pair it with
// rendered-surface-probe.json, which measures the other half. Together they say
// the tools are present and the target is not, which is why 7 and 8 are NOT
// APPLICABLE instead of merely un-run.
//
//   node promotion/evidence/audit-toolchain-check.mjs [--write]
//
// Network-bound (npx fetches each package), so this is deliberately NOT part of
// `npm test`. Exits 1 if a tool fails to report a version.

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const TOOLS = [
  { name: 'lighthouse@13.4.1', scores: 'condition 8 — performance, accessibility, best-practices, Core Web Vitals' },
  { name: '@axe-core/cli@4.13.0', scores: 'condition 8 — accessibility violations' },
];

// On Windows npx is a .cmd shim: execFileSync does no PATHEXT resolution
// (ENOENT for bare `npx`) and Node >=20 refuses to spawn a .cmd without a shell
// (EINVAL, from the CVE-2024-27980 fix). Both failures would have been recorded
// here as "tool not available" when the tool is installed and working — which
// is the reason this file measures instead of asserting. The shell is safe:
// every argument below is a literal constant, none comes from input.
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const NEEDS_SHELL = process.platform === 'win32';

const tools = {};
let allOk = true;
for (const tool of TOOLS) {
  const command = `npx --yes ${tool.name} --version`;
  try {
    const stdout = execFileSync(NPX, ['--yes', tool.name, '--version'], {
      encoding: 'utf8',
      timeout: 10 * 60 * 1000,
      shell: NEEDS_SHELL,
    });
    // The version the tool reported about itself — not a version this file claims.
    const reported = stdout.trim().split('\n').filter(Boolean).pop() ?? '';
    tools[tool.name] = { command, available: true, reported_version: reported, scores: tool.scores };
  } catch (err) {
    allOk = false;
    tools[tool.name] = { command, available: false, error: String(err.message).slice(0, 300), scores: tool.scores };
  }
}

const artifact = {
  probe: 'audit-toolchain-check',
  question: 'Are the condition-8 audit tools installable on this machine?',
  generated_at: new Date().toISOString(),
  node: process.version,
  tools,
  all_available: allOk,
  note:
    'Availability of the tools is not a PASS for condition 8. A tool with nothing ' +
    'to point at produces no measurement. See rendered-surface-probe.json for the ' +
    'other half: NodeRL has no rendered surface, so neither tool was run against ' +
    'anything, and no Lighthouse score exists to be mistaken for a Web Interface ' +
    'Guidelines review (condition 7).',
};

const report = JSON.stringify(artifact, null, 2);
if (process.argv.includes('--write')) {
  writeFileSync(join(here, 'audit-toolchain-versions.json'), report + '\n');
}
console.log(report);
if (!allOk) process.exit(1);
