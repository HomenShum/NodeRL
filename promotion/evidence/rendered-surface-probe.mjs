#!/usr/bin/env node
// Producer for PROMOTION conditions 7 and 8 on NodeRL.
//
// Conditions 7 (Web Interface Guidelines review) and 8 (web-quality audit:
// accessibility, performance, Core Web Vitals) both score a rendered surface.
// Both toolchains are installable here — `lighthouse@13.4.1` and
// `@axe-core/cli@4.13.0` resolve and print their versions (recorded in the
// artifact alongside this probe). So the question that decides 7 and 8 is not
// "is the tool available" but "is there a page to point it at".
//
// This script answers that question with committed evidence instead of prose,
// and it is a gate, not a dumper: it exits 1 the moment a rendered surface
// appears in the tree. That matters because a NOT APPLICABLE verdict is only
// honest while the premise holds. The day someone commits an .html, a .tsx, a
// stylesheet, a server entry point or a UI framework dependency, this probe
// goes red and forces 7 and 8 to be re-scored by actually running the audits,
// rather than inheriting a stale "nothing to audit" from a tree that no longer
// exists.
//
//   node promotion/evidence/rendered-surface-probe.mjs
//   node promotion/evidence/rendered-surface-probe.mjs --write   # refresh JSON
//
// Exit 0 = no rendered surface (7 and 8 stay NOT APPLICABLE).
// Exit 1 = a surface exists (7 and 8 must be audited, not waived).

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const git = (...args) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

// `git grep` and `git ls-files` exit 1 on "no matches", which is the expected
// answer here — treat it as an empty result, not as a crash.
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
const MARKUP_GLOBS = ['*.html', '*.htm', '*.tsx', '*.jsx', '*.vue', '*.svelte', '*.astro'];
const STYLE_GLOBS = ['*.css', '*.scss', '*.sass', '*.less', '*.styl'];

// Something in the tree that binds a port and serves a page.
const SERVER_PATTERN =
  '\\.listen\\(|createServer\\(|Bun\\.serve|Deno\\.serve|serve\\(\\{|next (dev|start)|vite (dev|preview)';

// A dependency whose whole job is producing a rendered surface.
const UI_DEPENDENCIES =
  /^(react|react-dom|vue|svelte|next|nuxt|astro|vite|@sveltejs\/.*|@remix-run\/.*|express|fastify|koa|hono|@hono\/.*|solid-js|preact|lit)$/;

// A deployed page counts as a rendered surface even with no markup in-tree.
const DEPLOY_URL_PATTERN =
  'https?://[A-Za-z0-9.-]*(vercel\\.app|netlify\\.app|github\\.io|pages\\.dev|render\\.com|fly\\.dev|surge\\.sh)';

const trackedPackageJsons = git('ls-files', '*package.json');
const uiDependencyHits = [];
for (const relativePath of trackedPackageJsons) {
  const manifest = JSON.parse(
    execFileSync('git', ['show', `HEAD:${relativePath}`], { cwd: repoRoot, encoding: 'utf8' }),
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
  markup_files: git('ls-files', ...MARKUP_GLOBS),
  stylesheet_files: git('ls-files', ...STYLE_GLOBS),
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
  answer: surfaceFound ? 'YES — audit it' : 'NO — 7 and 8 are NOT APPLICABLE',
  commit: git('rev-parse', 'HEAD')[0],
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
