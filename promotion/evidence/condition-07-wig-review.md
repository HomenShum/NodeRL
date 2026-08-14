# Condition 7 — Web Interface Guidelines review

**Verdict: NOT APPLICABLE — no rendered surface exists to review.**

Not PASS. A condition with no artifact to score cannot be passed, and this one
was not scored against a substitute.

- **Reviewed against:** Vercel Web Interface Guidelines, <https://vercel.com/design/guidelines>
- **Retrieved:** 2026-08-14. The page was reachable; the full category list it
  returned is reproduced below, so this review can be re-read against the same
  material it was performed against even if the page later changes.
- **Reviewed:** NodeRL at commit `b748ae8`.
- **Measurement this rests on:** [`rendered-surface-probe.json`](rendered-surface-probe.json),
  produced by [`rendered-surface-probe.mjs`](rendered-surface-probe.mjs).

## What "no rendered surface" means here, and how it was established

A Web Interface Guidelines review scores an interface: something a person opens,
looks at, tabs through, and types into. NodeRL has none. It is three importable
TypeScript libraries plus a terminal demo script — the thing a user holds at the
end of every journey in `PRODUCT_JOURNEYS.md` is stdout and a JSON block, not a
page.

That is a measurement, not an impression. `rendered-surface-probe.mjs` asks five
independent questions of the committed tree and all five return zero:

| Check | Count at `b748ae8` |
|-------|--------------------|
| markup files (`.html .htm .tsx .jsx .vue .svelte .astro`) | 0 |
| stylesheets (`.css .scss .sass .less .styl`) | 0 |
| server entry points (`.listen(`, `createServer(`, `Bun.serve`, `Deno.serve`, `next dev`, `vite dev`) | 0 |
| UI framework dependencies or a `bin` field, across every tracked `package.json` | 0 |
| deployed page URLs (`*.vercel.app`, `*.netlify.app`, `*.github.io`, `*.pages.dev`, …) | 0 |

The probe is a gate, not a dumper: it exits 1 the moment any of those becomes
non-zero, so this verdict expires automatically the day someone commits an
interface. `test/renderedSurfaceProbe.test.ts` is its negative control — it
stands up throwaway repositories and proves each of the five checks fires on its
own, because a probe that reported "no surface" on every input would make this
review worthless.

## The review

Every category the guidelines define, and what NodeRL offers it. "No artifact"
is the finding; it is recorded per category rather than once, because a single
blanket dismissal is indistinguishable from not having looked.

| Guideline category | Scores | NodeRL artifact | Finding |
|---|---|---|---|
| **Interactions** | keyboard operability, focus rings and traps, hit-target size, zoom, paste, loading buttons, optimistic updates, URL-as-state, deep links, destructive-action confirmation, `aria-live` announcements | none — nothing is focusable, no pointer target, no URL | no finding; no artifact |
| **Animations** | `prefers-reduced-motion`, compositor-friendly properties, interruptibility, transform origin, never `transition: all` | none — nothing animates; zero stylesheets, zero JS that renders | no finding; no artifact |
| **Layout** | optical and deliberate alignment, responsive coverage mobile→ultra-wide, safe areas, scrollbars, intrinsic sizing | none — no viewport, so no width at which to check overflow | no finding; no artifact |
| **Content** | page `<title>`, all states designed, headings and skip link, icon labels, accessible names, tabular numerals, locale-aware formats, resilience to long user content | none as *interface* content. The repo's prose (README, specs) is Markdown rendered by GitHub, not a surface this repo controls or ships. | no finding; no artifact |
| **Forms** | labels, Enter-to-submit, validation placement, `autocomplete`, input modes, unsaved-changes warnings, password-manager compatibility | none — zero form controls in the tree | no finding; no artifact |
| **Performance** | re-render cost, layout thrash, network budgets, list virtualization, image CLS, font preloading and subsetting | none *as web performance*. The demo's runtime is a Node process, not a page load; there is no LCP, CLS, INP or main thread to measure. | no finding; no artifact |
| **Design** | layered shadows, nested radii, contrast (APCA), `theme-color`, `color-scheme` | none — no colour, type or elevation is specified anywhere in the tree | no finding; no artifact |
| **Copywriting** *(Vercel-specific)* | product-page microcopy: title case, active voice, placeholder conventions, units, error messages that guide the exit | none as product-page copy. NodeRL's user-visible strings are CLI stdout — the demo's repair prompt does satisfy the *spirit* of "error messages guide the exit" (it names each failed assertion expected-vs-observed and states what re-running must make pass), but that is terminal output, and scoring it here would be inventing a surface. | no finding; not scored |

**Major findings: none.** Not "none found after inspection of a good interface" —
none possible, because there is no interface. That distinction is the point of
recording this as NOT APPLICABLE rather than PASS.

## What this review is not

This review used no Lighthouse output and no axe output, and none exists to
have used: neither tool was pointed at anything (see
[`condition-08-web-quality-audit.md`](condition-08-web-quality-audit.md)). A
Lighthouse accessibility score is an automated check of a loaded document; a
Web Interface Guidelines review is a human reading of an interface against a
written checklist. They measure different things, and substituting one for the
other would be a fabrication dressed as a number. The two conditions are kept in
two files for exactly that reason.

## What would make this condition scoreable

Any of the five probe checks turning non-zero — a demo page, a docs site, a
served dashboard for browsing trajectories. At that point the probe fails, this
file's premise is void, and condition 7 must be re-scored by opening the thing
and walking the table above against it for real.
