# Stack

## What you need

**Node 22.18 or newer. That is the entire list.**

No database, no Docker, no build step, no test framework, no linter config, no bundler. `npm install`
fetches 19 packages and every one of them is either a type definition or a dependency of the
*optional* live-capture path.

Declared in `package.json` as `"engines": { "node": ">=22.18" }`. That version is the floor because
below it Node cannot execute TypeScript directly.

## Language and how it runs

TypeScript, executed directly by Node's built-in **type stripping**. Node reads a `.ts` file, removes
the type annotations, and runs the result. There is no compiler output, no `dist/`, and nothing in
`.gitignore` for build artifacts because none are produced.

Two consequences a new reader will notice immediately:

1. **Every relative import carries an explicit `.ts` extension** — `from "./merged.ts"`, not
   `from "./merged"`. Node's module resolver does not guess extensions. `tsconfig.packages.json`
   sets `allowImportingTsExtensions: true` so `tsc` accepts the same specifiers.
2. **`npm run typecheck` is a checker, not a build.** `tsc` runs with `noEmit: true`. Nothing depends
   on its output; it exists purely to fail when types are wrong.

## Commands

| Command | What it does | How long |
|---|---|---|
| `npm install` | Fetch dependencies | ~15s |
| `npm test` | Run 14 test files through Node's built-in runner | ~10s |
| `npm run typecheck` | `tsc --noEmit` over every `.ts` file, sources and tests | ~5s |
| `npm run demo` | Run one real failed agent run end to end and print the repair | instant |

There is no `npm run build`, `npm start`, or `npm run lint`. Their absence is deliberate, not an
oversight.

## Dependencies

**Direct development dependencies (2), for the whole repository:**

| Package | Why |
|---|---|
| `typescript` | the `typecheck` script |
| `@types/node` | type definitions for `node:fs`, `node:assert`, `process` |

**Direct runtime dependencies (5), all in `packages/nodetrace` and all for live capture only:**

| Package | Why |
|---|---|
| `ai` (Vercel AI SDK) | `generateObject` — a structured, schema-validated model reply |
| `@ai-sdk/anthropic` | Claude provider |
| `@ai-sdk/openai` | GPT provider |
| `zod` | the schemas the model's replies are validated against |
| `playwright-core` *(optional)* | driving the Browserbase substrate |

`packages/nodeeval` and `packages/nodemem` declare **no dependencies at all**, and neither does the
pure loop half of `nodetrace`. You can use the trace/reward/repair path with nothing installed but
the two dev dependencies.

## Test runner

Node's built-in `node --test`. No Jest, Vitest, or Mocha.

Each test file is a plain script that uses `node:assert/strict` and exits non-zero on failure. The
test runner treats a non-zero exit as a failed file. This is why there is no test framework in
`package.json` and no config file for one — see [TESTING.md](TESTING.md).

## What this repository is not

There is **no application**. No HTTP server, no web page, no CLI binary. `git ls-files` matches zero
`.html`, `.tsx`, `.jsx`, `.css`, `.vue` or `.svelte` files, nothing calls `listen(` or
`createServer`, and no `package.json` declares a `bin`.

NodeRL is three libraries plus one runnable demo script. The surface a newcomer meets is the README
quickstart and `npm run demo`, not a URL.
