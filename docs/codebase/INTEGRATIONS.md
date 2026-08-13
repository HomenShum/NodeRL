# Integrations

Everything outside this process, and what happens when it is absent.

**Nothing here is required for the default path.** `npm install && npm test && npm run demo` needs no
key, no account and no network. Every integration below belongs to the optional live-capture half of
`packages/nodetrace`.

## Environment variables — the complete list

```
ANTHROPIC_API_KEY        Claude, via the Vercel AI SDK
OPENAI_API_KEY           GPT / o-series, via the Vercel AI SDK
BROWSERBASE_API_KEY      interactive remote browser
BROWSERBASE_PROJECT_ID   required alongside the key above
FIRECRAWL_API_KEY        screenshot + extract only (no clicking)
```

That is all of them — `grep -rhoE 'process\.env\.[A-Z_0-9]+' packages` returns exactly these five.
There is no `.env` loader in this repo; export them in your shell or inject them however you already
do it.

## The model providers

**Where:** `packages/nodetrace/src/reasoning.ts`
**How it chooses:** by model id prefix. Anything starting `gpt`, `o1`, `o3` or `o4` routes to OpenAI;
everything else routes to Anthropic (line 19). Default id is `claude-haiku-4-5`.

```ts
aiSdkReasoner("claude-haiku-4-5")   // a model id string, not an options object
```

Keys are read from the environment by the AI SDK clients and are `.trim()`ed on the way in. That
trim is not cosmetic: a trailing `\r` picked up from a Windows copy-paste would otherwise produce a
malformed `Authorization` header and a confusing 401.

**If a key is missing:** the provider call fails, `runCapture` catches it and returns
`{ ok: false, error }` with the steps collected so far. It does not throw and it does not retry.

**To use a different model entirely:** implement `ReasoningModel` (`types.ts:74`) and pass it as
`reasoner`. Nothing else changes — the pipeline never names a provider.

## The browser substrates

**Where:** `packages/nodetrace/src/substrate/`
**Selection:** `pickSubstrate(env)` (`substrate/index.ts:10`), in strict order:

| Order | Substrate | Requires | Can click? | Reports element boxes? |
|---|---|---|---|---|
| 1 | Browserbase | `BROWSERBASE_API_KEY` + `BROWSERBASE_PROJECT_ID` | yes | yes, exact |
| 2 | Firecrawl | `FIRECRAWL_API_KEY` | no | no |
| 3 | *(none)* | — | — | returns `null` |

Browserbase is preferred because interactive capture needs both clicking and exact boxes.

**If nothing is configured:** `pickSubstrate` returns `null`. It does not fall back to a stub or a
local browser, so the caller must handle the absence explicitly rather than discovering it as an
inexplicable failure later.

`playwright-core` is an **optional** dependency used by the Browserbase substrate. `npm install`
succeeding does not mean a browser is available.

## Outbound request safety

Every capture URL passes `assertCapturableUrl` (`guards.ts:71`) before anything is opened. It
rejects:

- non-`http`/`https` protocols,
- `localhost`, `*.localhost`, `*.local`, `*.internal`,
- private IP literals — IPv4 ranges, IPv6 unique-local and link-local, IPv4-mapped IPv6 forms,
- anything outside `allowHosts` when a caller supplies that allowlist.

**The honest limit, stated in the file's own header:** the browser runs *remotely*, at Browserbase or
Firecrawl, so the provider resolves the hostname, not this process. Blocking IP literals is defence
in depth and cannot stop a domain that resolves to a private address. **For a production capture
surface, `allowHosts` is the real control.** The comment says this rather than implying the check is
stronger than it is.

Hard ceilings live in `CAPTURE_LIMITS` (`guards.ts:12`): 12 steps, 60 seconds total, 24k characters
of page text sent to the model, 4MB per screenshot, 64 extracted fields. All are enforced in
`pipeline.ts`, and the total budget is backed by an `AbortController` so an in-flight request is
actually cancelled rather than merely ignored.

## What is NOT integrated

- **No database.** Not Convex, not Postgres, not SQLite. Some type names carry a `Convex` prefix
  (`ConvexBtbLedgerRunPayload`) — those are payload *shapes* describing what a caller might send
  elsewhere. Nothing in this repository connects to anything.
- **No file system writes.** `toJSONL` returns a string; `renderStorybook` returns a string. The
  caller decides where they go.
- **No telemetry, analytics, or crash reporting.**
- **No CI configuration.** No `.github/workflows` is committed.

## Secrets

This repository bundles none, and `SECURITY.md` states the bring-your-own-keys policy. If you add an
integration, read keys from the environment at the point of use — never commit a default, and never
add a fixture containing a real key.
