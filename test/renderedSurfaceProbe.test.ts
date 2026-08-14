/**
 * renderedSurfaceProbe.test.ts — the negative control for the evidence behind
 * promotion conditions 7 and 8.
 *
 * Why this test exists:
 * `promotion/evidence/rendered-surface-probe.mjs` is the sole evidence that
 * NodeRL has no rendered surface, which is the sole reason conditions 7 (Web
 * Interface Guidelines review) and 8 (web-quality audit) are scored NOT
 * APPLICABLE instead of being audited. A probe that reports "no surface" on
 * every input would produce exactly the same green result on a repo full of
 * HTML — it would be a rubber stamp, and the NOT APPLICABLE verdict resting on
 * it would be worthless. A gate that cannot fail is not a gate.
 *
 * So this stands up throwaway git repositories and checks that the probe
 * answers differently when the answer should differ:
 *   (a) a tree with nothing renderable      -> exit 0, surface_found false
 *   (b) + one .html file                    -> exit 1, markup_files fires
 *   (c) + a UI framework dependency         -> exit 1, ui_dependencies fires
 *   (d) + a server that binds a port        -> exit 1, server_entrypoints fires
 *   (e) + a deployed page URL in a doc      -> exit 1, deployed_urls fires
 * Each vector is proved to fire on its own, because four dead checks hiding
 * behind one live one is the same rubber stamp wearing a longer coat.
 *
 * Then (f) runs the probe against THIS repository, which is what gives the N/A
 * verdict an expiry date: the day a demo page, a stylesheet, a server or a
 * deployed URL lands here, `npm test` goes red and points at the eight
 * scorecard rows that have to be re-scored by opening the page.
 *
 * Run: npm test   (or: node --test test/renderedSurfaceProbe.test.ts)
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0, fail = 0;
function scenario(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    pass++;
  } catch (e: unknown) {
    console.error(`  FAIL  ${name}\n        ${(e as Error).message}`);
    fail++;
  }
}

const PROBE = "promotion/evidence/rendered-surface-probe.mjs";

/** A minimal git repo carrying a copy of the probe and nothing renderable. */
function makeFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "noderl-surface-probe-"));
  mkdirSync(join(dir, "promotion", "evidence"), { recursive: true });
  copyFileSync(PROBE, join(dir, PROBE));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fixture", private: true }, null, 2) + "\n");
  writeFileSync(join(dir, "README.md"), "# fixture\n");
  execFileSync("git", ["init", "-q"], { cwd: dir });
  commit(dir);
  return dir;
}

function commit(dir: string): void {
  execFileSync("git", ["add", "-A"], { cwd: dir });
  execFileSync(
    "git",
    ["-c", "user.email=probe@test", "-c", "user.name=probe", "commit", "-q", "-m", "fixture"],
    { cwd: dir },
  );
}

/** Run the probe in `dir`, returning its exit code and parsed JSON report. */
function runProbe(dir: string): { code: number; report: Record<string, any> } {
  try {
    const out = execFileSync(process.execPath, [PROBE], { cwd: dir, encoding: "utf8" });
    return { code: 0, report: JSON.parse(out) };
  } catch (e: any) {
    return { code: e.status as number, report: JSON.parse(e.stdout as string) };
  }
}

/** Add one rendered-surface vector to a clean fixture and assert the probe reddens. */
function vector(name: string, check: string, mutate: (dir: string) => void): void {
  const dir = makeFixture();
  try {
    mutate(dir);
    commit(dir);
    const { code, report } = runProbe(dir);
    scenario(`${name} -> probe fails, ${check} fires`, () => {
      assert.equal(code, 1, `probe must exit 1 when a surface exists (got ${code})`);
      assert.equal(report.surface_found, true, "surface_found must be true");
      assert.ok(
        report.checks[check].count > 0,
        `${check} must be the check that fired, got ${JSON.stringify(report.checks[check])}`,
      );
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// (a) The premise: with nothing renderable, the probe is green.
const clean = makeFixture();
try {
  const { code, report } = runProbe(clean);
  scenario("bare tree -> probe passes, surface_found false", () => {
    assert.equal(code, 0, `probe must exit 0 on a tree with no surface (got ${code})`);
    assert.equal(report.surface_found, false, "surface_found must be false");
    for (const [name, result] of Object.entries(report.checks as Record<string, { count: number }>)) {
      assert.equal(result.count, 0, `${name} must find nothing on a bare tree`);
    }
  });
} finally {
  rmSync(clean, { recursive: true, force: true });
}

// (b)-(e) Each vector, alone, must turn the probe red.
vector("one .html file", "markup_files", (dir) =>
  writeFileSync(join(dir, "demo.html"), "<!doctype html><title>demo</title>\n"));

vector("a UI framework dependency", "ui_dependencies_or_bin", (dir) =>
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "fixture", private: true, dependencies: { react: "^19.0.0" } }, null, 2) + "\n",
  ));

vector("a server that binds a port", "server_entrypoints", (dir) =>
  writeFileSync(
    join(dir, "srv.mjs"),
    'import http from "node:http";\nhttp.createServer(() => {}).listen(4915);\n',
  ));

vector("a deployed page URL in a doc", "deployed_urls", (dir) =>
  writeFileSync(join(dir, "README.md"), "# fixture\n\nLive at https://noderl-demo.vercel.app\n"));

// (f) The live claim. The scorecard scores conditions 3-10 N/A on the premise
// that THIS repository has no rendered surface. Running the probe against the
// fixtures above proves the probe works; running it here is what keeps the
// scorecard honest. When someone commits a demo page, this line goes red and
// those eight rows have to be re-scored by opening the page — they cannot
// inherit "nothing to audit" from a tree that no longer exists.
scenario("this repository -> no rendered surface, so conditions 3-10 stay N/A", () => {
  const { code, report } = runProbe(process.cwd());
  assert.equal(
    code,
    0,
    "a rendered surface has appeared in NodeRL. promotion/PRODUCT_GOAL.md scores " +
      "conditions 3-10 N/A on the premise that none exists; that premise is now false. " +
      "Run the lighthouse + axe audits and a real Web Interface Guidelines review, then " +
      "re-score those rows. Offending matches: " +
      JSON.stringify(report.checks),
  );
  assert.equal(report.surface_found, false, "surface_found must still be false");
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
