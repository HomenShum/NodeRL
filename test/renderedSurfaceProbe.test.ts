/**
 * A reviewer must discover generated reports before deciding whether UI audits
 * apply. These committed-fixture scenarios test the detector, not the quality
 * of the detected UI. A discovered surface deliberately exits 1 for audit.
 * No-match fixtures establish only missing heuristic markers, never N/A.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

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

function removeFixture(dir: string): void {
  assert.equal(resolve(dirname(dir)), resolve(tmpdir()));
  assert.ok(basename(dir).startsWith("noderl-surface-probe-"));
  rmSync(dir, { recursive: true, force: true });
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
function vector(name: string, check: string, mutate: (dir: string) => void, expectedPath?: string): void {
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
      if (expectedPath) {
        assert.ok(report.checks[check].matches.some((line: string) => line.includes(`:${expectedPath}:`)),
          `the generated markup must come from ${expectedPath}`);
      }
    });
  } finally {
    removeFixture(dir);
  }
}

// A bare fixture has no heuristic markers; this is not an N/A approval.
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
  removeFixture(clean);
}

// Each independent vector must require an audit.
vector("one .html file", "markup_files", (dir) =>
  writeFileSync(join(dir, "demo.html"), "<!doctype html><title>demo</title>\n"));

vector("one stylesheet without a page", "stylesheet_files", (dir) =>
  writeFileSync(join(dir, "report.css"), "body { color: black; }\n"));

vector("TypeScript generates a complete report", "generated_markup", (dir) =>
  writeFileSync(join(dir, "report.ts"),
    "export const render = () => '<!doctype html><html lang=\"en\"><style>body{color:black}</style><body>Report</body></html>';\n"), "report.ts");

vector("JavaScript generates uppercase HTML", "generated_markup", (dir) =>
  writeFileSync(join(dir, "report.mjs"),
    "export const render = () => '<HTML><STYLE>body{color:black}</STYLE><BODY>Report</BODY></HTML>';\n"), "report.mjs");

{
  const dir = makeFixture();
  try {
    writeFileSync(join(dir, "prefix.ts"), "export const tags = '<stylesheet><htmlish><bodyguard>';\n");
    commit(dir);
    const { code, report } = runProbe(dir);
    scenario("tag-name prefixes do not masquerade as document markers", () => {
      assert.equal(code, 0);
      assert.equal(report.surface_found, false);
    });
  } finally {
    removeFixture(dir);
  }
}

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

// (f) The exclusion, pinned at exactly two files wide.
//
// The probe skips itself and this file, because a control has to contain the
// patterns it proves fire — the first fresh-clone run of this mechanism went red
// on its own fixture strings. An exclusion is also the classic hiding place for
// a weakened check, so it is asserted here from both sides: (d) above already
// proved `srv.mjs` with a `.listen(` DOES fire; this proves the same content at
// the excluded path does NOT, and that a THIRD file gets no such immunity.
{
  const dir = makeFixture();
  try {
    const server = 'import http from "node:http";\nhttp.createServer(() => {}).listen(4915);\n';
    mkdirSync(join(dir, "test"), { recursive: true });
    writeFileSync(join(dir, "test", "renderedSurfaceProbe.test.ts"), server);
    commit(dir);
    scenario("the two self-referential files are excluded, and only those two", () => {
      assert.equal(runProbe(dir).code, 0, "the control's own fixture strings must not redden the gate");
      writeFileSync(join(dir, "test", "somethingElse.test.ts"), server);
      commit(dir);
      const { code, report } = runProbe(dir);
      assert.equal(code, 1, "the same content in any other file must still fire");
      assert.equal(report.checks.server_entrypoints.count, 1, "exactly the non-excluded file fires");
    });
  } finally {
    removeFixture(dir);
  }
}

// A reviewer inspecting a commit must not accidentally combine it with a
// contributor's staged next revision. Repeated staging remains outside HEAD.
{
  const dir = makeFixture();
  try {
    const inspected = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
    scenario("staged revisions do not change the inspected committed tree", () => {
      for (let revision = 0; revision < 3; revision++) {
        writeFileSync(join(dir, "next.html"), `<html><body>Revision ${revision}</body></html>\n`);
        execFileSync("git", ["add", "--", "next.html"], { cwd: dir });
        const { code, report } = runProbe(dir);
        assert.equal(code, 0);
        assert.equal(report.commit, inspected);
        assert.equal(report.checks.markup_files.count, 0);
      }
      commit(dir);
      const { code, report } = runProbe(dir);
      assert.equal(code, 1);
      assert.notEqual(report.commit, inspected);
      assert.deepEqual(report.checks.markup_files.matches, ["next.html"]);
    });
  } finally {
    removeFixture(dir);
  }
}

// The current source actually generates an HTML report. Detection is a unit
// contract; the required audit remains a separate, unresolved promotion gate.
scenario("the real generated report requires an audit", () => {
  const { code, report } = runProbe(process.cwd());
  assert.equal(code, 1, "the real renderer must be detected, not waived as N/A");
  assert.equal(report.surface_found, true);
  assert.ok(report.checks.generated_markup.matches.some((line: string) =>
    line.includes(":packages/nodetrace/src/storybook.ts:")),
    "the generated-markup vector must find the actual renderer itself");
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
