#!/usr/bin/env node
// Detect committed rendered-surface markers before assessing promotion audits.
// A generated HTML report counts even when its markup lives in TypeScript.
// Exit 1 means a surface was found and requires an actual review; it is not a
// detector-test failure or a completed audit. Exit 0 means no heuristic marker
// was found, not automatic permission to score UI conditions N/A.
//
// node promotion/evidence/rendered-surface-probe.mjs
// node promotion/evidence/rendered-surface-probe.mjs --write
//
// Every inspected source path/content comes from HEAD. The executing detector
// can be uncommitted; its separate hash makes that distinction explicit.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const deadline = Date.now() + 30_000;
const gitText = (...args) => {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error('Source inspection exceeded its 30-second budget');
  return execFileSync('git', ['--no-optional-locks', ...args], {
    cwd: repoRoot, encoding: 'utf8', timeout: remaining, maxBuffer: 1024 * 1024,
  });
};
const git = (...args) => gitText(...args)
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

// `git grep` exits 1 on no matches. Only that status is an empty result;
// genuine Git errors propagate and must not become an absence claim.
const gitAllowEmpty = (...args) => {
  try {
    return git(...args);
  } catch (err) {
    if (err.status === 1) return [];
    throw err;
  }
};

// Every file extension that renders in a browser, plus the ones that compile
// into something that does.
const MARKUP_SUFFIXES = ['.html', '.htm', '.tsx', '.jsx', '.vue', '.svelte', '.astro'];
const STYLE_SUFFIXES = ['.css', '.scss', '.sass', '.less', '.styl'];
const GENERATED_MARKUP_PATTERN = '<!doctype[[:space:]]+html([[:space:]>])|<(html|style|body)([[:space:]>])';

// Something in the tree that binds a port and serves a page.
const SERVER_PATTERN =
  '\\.listen\\(|createServer\\(|Bun\\.serve|Deno\\.serve|serve\\(\\{|next (dev|start)|vite (dev|preview)';

// A dependency whose whole job is producing a rendered surface.
const UI_DEPENDENCIES =
  /^(react|react-dom|vue|svelte|next|nuxt|astro|vite|@sveltejs\/.*|@remix-run\/.*|express|fastify|koa|hono|@hono\/.*|solid-js|preact|lit)$/;

// A deployed page counts as a rendered surface even with no markup in-tree.
const DEPLOY_URL_PATTERN =
  'https?://[A-Za-z0-9.-]*(vercel\\.app|netlify\\.app|github\\.io|pages\\.dev|render\\.com|fly\\.dev|surge\\.sh)';

const trackedPaths = git('ls-tree', '-r', '--name-only', 'HEAD');
const trackedPackageJsons = trackedPaths.filter((name) => name.endsWith('package.json'));
const uiDependencyHits = [];
for (const relativePath of trackedPackageJsons) {
  const manifest = JSON.parse(
    gitText('show', `HEAD:${relativePath}`),
  );
  const declared = {
    ...(manifest.dependencies ?? {}),
    ...(manifest.devDependencies ?? {}),
    ...(manifest.peerDependencies ?? {}),
    ...(manifest.optionalDependencies ?? {}),
  };
  for (const name of Object.keys(declared)) {
    if (UI_DEPENDENCIES.test(name)) uiDependencyHits.push(`${relativePath}: ${name}`);
  }
  if (manifest.bin) uiDependencyHits.push(`${relativePath}: bin field present`);
}

// A file whose JOB is to describe these patterns is not an instance of them.
// Exactly two files are in that position, and both are named here rather than
// matched by a rule, so the exclusion cannot quietly widen: this probe, and the
// control test that proves the probe fires (a control has to contain the thing
// it detects). `test/renderedSurfaceProbe.test.ts` asserts this exclusion stays
// this narrow — an ordinary file with the same content still reddens the gate.
const SELF_REFERENTIAL = [
  ':!promotion/evidence/rendered-surface-probe.mjs',
  ':!test/renderedSurfaceProbe.test.ts',
];

// A server entry point is code. Markdown cannot bind a port, so prose that
// quotes `.listen(` while explaining this probe is not a server — scoping the
// grep to source files is what makes the check mean what it says.
const CODE_GLOBS = ['*.ts', '*.mts', '*.cts', '*.js', '*.mjs', '*.cjs'];

// A deployed page, unlike a server, is typically announced in prose — so this
// one deliberately keeps scanning Markdown. It only skips the lock file, which
// lists transitive packages nobody imports.
const DEPLOY_SCOPE = ['--', ':!package-lock.json', ...SELF_REFERENTIAL];

const checks = {
  markup_files: trackedPaths.filter((name) => MARKUP_SUFFIXES.some((suffix) => name.endsWith(suffix))),
  stylesheet_files: trackedPaths.filter((name) => STYLE_SUFFIXES.some((suffix) => name.endsWith(suffix))),
  generated_markup: gitAllowEmpty(
    'grep', '-niIE', GENERATED_MARKUP_PATTERN, 'HEAD', '--', ...CODE_GLOBS, ...SELF_REFERENTIAL,
  ),
  server_entrypoints: gitAllowEmpty(
    'grep', '-nIE', SERVER_PATTERN, 'HEAD', '--', ...CODE_GLOBS, ...SELF_REFERENTIAL,
  ),
  ui_dependencies_or_bin: uiDependencyHits,
  deployed_urls: gitAllowEmpty('grep', '-nIE', DEPLOY_URL_PATTERN, 'HEAD', ...DEPLOY_SCOPE),
};

const surfaceFound = Object.values(checks).some((hits) => hits.length > 0);

const artifact = {
  probe: 'rendered-surface-probe',
  question: 'Does NodeRL have a rendered surface for conditions 7 and 8 to score?',
  answer: surfaceFound ? 'YES — audit it' : 'NO MARKERS FOUND — applicability remains unverified',
  commit: git('rev-parse', 'HEAD')[0],
  source_tree: git('rev-parse', 'HEAD^{tree}')[0],
  source_snapshot: 'Committed HEAD paths and contents; index and working source are not inspected',
  detector: {
    path: 'promotion/evidence/rendered-surface-probe.mjs',
    sha256: createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
    source: 'Executed working file; may differ from the detector committed at the inspected HEAD',
  },
  node: process.version,
  generated_at: new Date().toISOString(),
  // The other half of the 7/8 verdict — whether the audit TOOLS exist — is a
  // separate measurement and lives in a separate artifact, because a version
  // string copied into this file would be a claim rather than something this
  // run observed.
  audit_toolchain_evidence: 'promotion/evidence/audit-toolchain-versions.json',
  checks: Object.fromEntries(
    Object.entries(checks).map(([name, hits]) => [name, { count: hits.length, matches: hits }]),
  ),
  surface_found: surfaceFound,
};

const report = JSON.stringify(artifact, null, 2);
if (process.argv.includes('--write')) {
  writeFileSync(join(repoRoot, 'promotion', 'evidence', 'rendered-surface-probe.json'), report + '\n');
}
console.log(report);

if (surfaceFound) {
  console.error(
    '\nFAIL: a rendered surface exists. Conditions 7 and 8 must now be audited\n' +
      '(lighthouse + @axe-core/cli against the served page, plus a real Web\n' +
      'Interface Guidelines review) — they can no longer be NOT APPLICABLE.',
  );
  process.exit(1);
}
