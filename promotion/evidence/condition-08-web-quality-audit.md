# Condition 8 — web-quality audit (accessibility, performance, Core Web Vitals)

**Verdict: NOT APPLICABLE — the audit tools run here, but there is no page to run them against.**

Not PASS. No Lighthouse report and no axe report exist for this repo, because
producing one would have required inventing a surface to audit.

- **Audited:** NodeRL at commit `b748ae8`.
- **Measurements this rests on:**
  [`rendered-surface-probe.json`](rendered-surface-probe.json) (is there a target?)
  and [`audit-toolchain-versions.json`](audit-toolchain-versions.json) (are there tools?).

## The previous reason for UNVERIFIED was ambiguous. It is now resolved.

The 2026-08-13 baseline scored this condition UNVERIFIED with the reason "audit
not run; nothing to load". That sentence conflates two very different states —
*the tool was missing* (fixable by installing something) and *the thing to audit
was missing* (not fixable by installing anything). Each half was measured
separately.

**Half one — the tools. Available.** Both were invoked and asked to identify
themselves; the versions below are what each tool printed, not what this
document asserts:

| Tool | Command | Reported | Scores |
|---|---|---|---|
| `lighthouse@13.4.1` | `npx --yes lighthouse@13.4.1 --version` | `13.4.1` | performance, accessibility, best-practices, Core Web Vitals |
| `@axe-core/cli@4.13.0` | `npx --yes @axe-core/cli@4.13.0 --version` | `4.13.0` | accessibility violations |

Producer: [`audit-toolchain-check.mjs`](audit-toolchain-check.mjs) — network-bound,
so deliberately not part of `npm test`.

**Half two — the target. Absent.** Five independent checks over the committed
tree, all zero at `b748ae8`: markup files, stylesheets, server entry points, UI
framework dependencies or `bin` fields, and deployed page URLs. Full table and
method in [`condition-07-wig-review.md`](condition-07-wig-review.md); producer is
[`rendered-surface-probe.mjs`](rendered-surface-probe.mjs), negative control is
`test/renderedSurfaceProbe.test.ts`.

So the blocker moved. It is no longer "the audit was unavailable" — the audit is
available and was not the limit. The limit is that NodeRL ships nothing that
loads in a browser.

## What was deliberately not done

- **No page was created to audit.** Serving a scratch HTML file on port 4915 and
  running Lighthouse at it would have produced a real JSON report about a file
  that is not part of this product. A green score on a fabricated target is
  worse than no score: it looks like evidence.
- **No Lighthouse score was carried into condition 7.** There is no score to
  carry, and the two conditions measure different things — an automated document
  check versus a human review against a written interface checklist. They are
  filed separately for that reason.
- **`npm run demo` was not audited as a "surface".** It exits 0 under plain
  `node` and prints a scored verdict, but stdout has no viewport, no LCP, no CLS
  and no accessibility tree. Scoring a terminal against Core Web Vitals would be
  a category error.

## Core Web Vitals

| Metric | Value |
|---|---|
| LCP | not measurable — no document is ever loaded |
| CLS | not measurable — no layout exists to shift |
| INP / TBT | not measurable — no input target, no main thread rendering |
| Lighthouse performance / accessibility / best-practices / SEO | not run — no URL |
| axe violations (total, serious+critical) | not run — no URL |

## What would make this condition scoreable

The moment `rendered-surface-probe.mjs` exits 1 — a demo page, a docs site, a
served UI — the two commands at the top of this file get a real URL, their JSON
lands beside this document, and condition 8 is decided by that output instead of
by this absence.
