/**
 * tours.test.ts — proves the CodeTour walkthroughs in `.tours/` still point at real code.
 *
 * Why this test exists:
 * A tour step is a file path plus a line number. Code moves; the tour does not move with it.
 * A walkthrough that opens the wrong line is worse than no walkthrough, because a new reader
 * trusts it and is silently misled — and nothing about a stale tour looks broken from the
 * outside. So the tours are checked by the test suite like any other claim about the code.
 *
 * A failure here does NOT mean the tour is wrong in spirit — it usually means a file grew or
 * shrank above the referenced line. Open the tour, find the symbol it is describing, update
 * the number.
 *
 * Run: npm test   (or: node --test test/tours.test.ts)
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

interface TourStep { file?: string; line?: number; description?: string }
interface Tour { title?: string; description?: string; steps?: TourStep[] }

let pass = 0, fail = 0;
function scenario(name: string, fn: () => void): void {
  try { fn(); console.log(`  PASS  ${name}`); pass++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${(e as Error).message}`); fail++; }
}

const TOURS_DIR = ".tours";
const tourFiles = readdirSync(TOURS_DIR).filter((f) => f.endsWith(".tour")).sort();

scenario("the .tours directory actually contains tours", () => {
  assert.ok(tourFiles.length > 0, `${TOURS_DIR}/ contains at least one .tour file`);
});

for (const tourFile of tourFiles) {
  const tour = JSON.parse(readFileSync(join(TOURS_DIR, tourFile), "utf8")) as Tour;

  scenario(`${tourFile} — is a well-formed tour with a title and steps`, () => {
    assert.ok(tour.title, "tour declares a title");
    assert.ok(Array.isArray(tour.steps) && tour.steps.length > 0, "tour has at least one step");
  });

  scenario(`${tourFile} — every step resolves to a real, non-blank line`, () => {
    const broken: string[] = [];
    for (const [i, step] of (tour.steps ?? []).entries()) {
      const where = `step ${i + 1}`;
      if (!step.file) { broken.push(`${where}: no file`); continue; }
      if (!existsSync(step.file)) { broken.push(`${where}: ${step.file} does not exist`); continue; }
      if (typeof step.line !== "number") { broken.push(`${where}: ${step.file} has no line number`); continue; }

      const lines = readFileSync(step.file, "utf8").split(/\r?\n/);
      if (step.line < 1 || step.line > lines.length) {
        broken.push(`${where}: ${step.file}:${step.line} is out of range (file has ${lines.length} lines)`);
        continue;
      }
      // A tour that opens on a blank line has almost certainly drifted off its symbol.
      if (lines[step.line - 1].trim() === "") {
        broken.push(`${where}: ${step.file}:${step.line} is a blank line — the tour has drifted`);
      }
      if (!step.description?.trim()) {
        broken.push(`${where}: ${step.file}:${step.line} has an empty description`);
      }
    }
    assert.deepEqual(broken, [], `all steps resolve:\n        ${broken.join("\n        ")}`);
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
