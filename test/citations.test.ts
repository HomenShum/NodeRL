/**
 * citations.test.ts — proves every line number this repository's walkthroughs quote points at the
 * thing they say it points at.
 *
 * Why this test exists, and why the version before it was worthless:
 * A walkthrough step is a file path plus a line number. Code moves; the number does not move with it.
 * The previous guard checked that the number was inside the file and that the line was not blank —
 * which proves the anchor is STABLE and says nothing about whether it is CORRECT. It passed happily
 * while `docs/codebase/INTEGRATIONS.md` sent a reader to the OpenAI branch to read about the
 * Anthropic default, and while `docs/codebase/ARCHITECTURE.md` cited `deterministicId` at the line
 * two above it. A reader trusts a citation; a wrong one misleads silently, and nothing about it looks
 * broken from the outside.
 *
 * So every citation must now carry the SYMBOL (or a short expected substring) it is pointing at, and
 * this test asserts the cited line actually contains it. A drifted line number stops being invisible.
 *
 * The two citation forms, both checked:
 *   1. `anchor` (line N)        — the file is the nearest `**File:**` / `**Where:**` above it
 *   2. `anchor` (`path:N`)      — a repo-relative path, for a citation into another file
 * Anything that looks like a line reference but is in neither form fails as an UNGUARDED citation:
 * an escape hatch would make this whole test decorative.
 *
 * `.tour` steps carry the anchor in CodeTour's own `pattern` field rather than a bespoke one, so the
 * extension re-anchors the step itself and this test checks the same string it uses.
 *
 * What is deliberately NOT scanned: `docs/SIMPLIFICATION_REPORT.md` and `promotion/PROMOTION_LOG.md`
 * are dated records of what a past tree looked like ("Baseline commit 5a1b3e8"; "Append; never
 * rewrite history"). Forcing them to match today's code would mean falsifying the history they exist
 * to preserve.
 *
 * Run: npm test   (or: node --test test/citations.test.ts)
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

interface TourStep { file?: string; line?: number; pattern?: string; description?: string }
interface Tour { title?: string; description?: string; steps?: TourStep[] }

let pass = 0, fail = 0;
function scenario(name: string, fn: () => void): void {
  try { fn(); console.log(`  PASS  ${name}`); pass++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${(e as Error).message}`); fail++; }
}

const linesOf = (file: string): string[] => readFileSync(file, "utf8").split(/\r?\n/);

/* ── 1. The CodeTour walkthroughs ──────────────────────────────────────────────────────────── */

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

  scenario(`${tourFile} — every step's line matches the symbol the step claims`, () => {
    const broken: string[] = [];
    for (const [i, step] of (tour.steps ?? []).entries()) {
      const where = `step ${i + 1}`;
      if (!step.file) { broken.push(`${where}: no file`); continue; }
      if (!existsSync(step.file)) { broken.push(`${where}: ${step.file} does not exist`); continue; }
      if (typeof step.line !== "number") { broken.push(`${where}: ${step.file} has no line number`); continue; }
      if (!step.description?.trim()) { broken.push(`${where}: ${step.file}:${step.line} has an empty description`); }

      const lines = linesOf(step.file);
      if (step.line < 1 || step.line > lines.length) {
        broken.push(`${where}: ${step.file}:${step.line} is out of range (file has ${lines.length} lines)`);
        continue;
      }
      // The anchor. Without it the step proves only that the number is in range.
      if (!step.pattern?.trim()) {
        broken.push(`${where}: ${step.file}:${step.line} has no "pattern" — add the symbol this step opens on`);
        continue;
      }
      let re: RegExp;
      try { re = new RegExp(step.pattern); }
      catch (e) { broken.push(`${where}: pattern ${JSON.stringify(step.pattern)} is not a valid regex (${(e as Error).message})`); continue; }

      // CodeTour resolves a pattern to its FIRST match in the file. Requiring that match to be this
      // step's line proves two things at once: the line is right, and the pattern is specific enough
      // to be a real anchor rather than something like ".*" that would match anywhere.
      const firstMatch = lines.findIndex((l) => re.test(l)) + 1;
      if (firstMatch === 0) {
        broken.push(`${where}: pattern ${JSON.stringify(step.pattern)} matches nothing in ${step.file}`);
      } else if (firstMatch !== step.line) {
        broken.push(
          `${where}: ${step.file}:${step.line} does not match ${JSON.stringify(step.pattern)} — ` +
          `that pattern first matches line ${firstMatch}`,
        );
      }
    }
    assert.deepEqual(broken, [], `all steps are anchored:\n        ${broken.join("\n        ")}`);
  });
}

/* ── 2. The prose walkthroughs ─────────────────────────────────────────────────────────────── */

/** The docs a cold reader is told to follow, in the order ARCHITECTURE.md's "Reading order" names. */
const DOC_FILES = [
  "docs/START_HERE.md",
  ...readdirSync("docs/codebase").filter((f) => f.endsWith(".md")).sort().map((f) => `docs/codebase/${f}`),
];

/** `anchor` (`path/to/file.ts:123`) — an explicit repo-relative citation. */
const CROSS_FILE = /`([^`\n]+)`(?:\*\*)?\s*\(`([^`\n]+?):(\d+)`\)/g;
/** `anchor` (line 123) — resolved against the nearest **File:** / **Where:** above it. */
const SAME_FILE = /`([^`\n]+)`(?:\*\*)?\s*\(line (\d+)\)/g;
/** `**File:** `path`` or `**Where:** `path`` — sets the file the (line N) form resolves against. */
const FILE_CONTEXT = /\*\*(?:File|Where):\*\*\s*`([^`\n]+)`/g;
/** Anything that LOOKS like a line reference. Each must fall inside a citation matched above. */
const LOOKS_LIKE_A_CITATION = [/`[^`\n]*\.[a-z]+:\d+`/g, /\(lines? \d+/g, /\blines? \d+\b/g];

const MIN_ANCHOR = 3;

/** Fenced code blocks illustrate code; they do not cite it. Blank them out, preserving offsets. */
function stripFences(md: string): string {
  return md.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, " "));
}

for (const doc of DOC_FILES) {
  scenario(`${doc} — every cited line contains the symbol the sentence names`, () => {
    const raw = readFileSync(doc, "utf8");
    const text = stripFences(raw);
    const broken: string[] = [];
    const covered: Array<[number, number]> = [];

    const at = (i: number) => `${doc}:${text.slice(0, i).split("\n").length}`;

    function checkAnchor(file: string, line: number, anchor: string, i: number): void {
      if (anchor.trim().length < MIN_ANCHOR) {
        broken.push(`${at(i)}: anchor ${JSON.stringify(anchor)} is too short to prove anything`);
        return;
      }
      if (!existsSync(file)) { broken.push(`${at(i)}: ${file} does not exist`); return; }
      const lines = linesOf(file);
      if (line < 1 || line > lines.length) {
        broken.push(`${at(i)}: ${file}:${line} is out of range (file has ${lines.length} lines)`);
        return;
      }
      if (!lines[line - 1].includes(anchor.trim())) {
        const actual = lines.findIndex((l) => l.includes(anchor.trim())) + 1;
        broken.push(
          `${at(i)}: ${file}:${line} does not contain ${JSON.stringify(anchor)} — it reads ` +
          `${JSON.stringify(lines[line - 1].trim().slice(0, 60))}` +
          (actual > 0 ? ` (that symbol is on line ${actual})` : " (that symbol is not in the file at all)"),
        );
      }
    }

    for (const m of text.matchAll(CROSS_FILE)) {
      covered.push([m.index, m.index + m[0].length]);
      checkAnchor(m[2], Number(m[3]), m[1], m.index);
    }

    const contexts = [...text.matchAll(FILE_CONTEXT)].map((m) => ({ at: m.index, file: m[1] }));
    for (const m of text.matchAll(SAME_FILE)) {
      covered.push([m.index, m.index + m[0].length]);
      const ctx = [...contexts].reverse().find((c) => c.at < m.index);
      if (!ctx) { broken.push(`${at(m.index)}: "(line ${m[2]})" has no **File:** above it to resolve against`); continue; }
      checkAnchor(ctx.file, Number(m[2]), m[1], m.index);
    }

    for (const re of LOOKS_LIKE_A_CITATION) {
      for (const m of text.matchAll(re)) {
        const inside = covered.some(([s, e]) => m.index >= s && m.index + m[0].length <= e);
        if (!inside) {
          broken.push(
            `${at(m.index)}: ${JSON.stringify(m[0])} is an UNGUARDED line reference — write it as ` +
            "`symbol` (line N) or `symbol` (`path:N`) so this test can check it",
          );
        }
      }
    }

    assert.deepEqual(broken, [], `every citation is anchored and correct:\n        ${broken.join("\n        ")}`);
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
