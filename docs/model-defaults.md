# Model defaults: how the default model stays current

**The situation.** NodeRL's reasoning step defaults to one AI model. Vendors retire models on dates they
announce on web pages, and a default that is typed into code is never re-read, so one day the default stops
answering. This repo no longer types the id. It reads it from a small lock file that a weekly robot proposes
changes to; a person reviews and merges.

**What to know.**

- `models.config.json` says which role this repo has (`reasoner`: the Haiku line, on the `anthropic` transport).
- `models.lock.json` is the pinned answer, copied from NodeKit's reviewed registry
  (`HomenShum/NodeKit`, `models.yaml`). Do not edit it by hand; `nodekit models sync` writes it.
- `packages/nodetrace/src/models.ts` only looks things up. `DEFAULT_REASONING_MODEL` is the lock's `reasoner` id.
  A caller can still pass any model id to `aiSdkReasoner(id)`; an id the registry has not reviewed is reported
  as `override-unknown` and keeps today's routing, it is never rewritten.
- `.github/workflows/model-defaults.yml` runs every Tuesday. If the registry changed something this repo uses
  (the id, its constraints, its lifecycle dates, its price), it opens one pull request on
  `automation/model-defaults`. On pull requests it lints the lock offline. It never merges, uses no provider
  key and makes no paid call. Closing a proposal keeps it closed until the registry's decision changes.

**What a proposal checks before it opens.** The lock is regenerated from the registry, linted (no raw model id
outside the allowlist in `models.config.json`, the role's transport has a wire id, the pinned id is not
retired or within 30 days of retiring) and this repo's own `npm test && npm run typecheck` runs.

**If you change the default on purpose.** Edit the registry in NodeKit (`lines.anthropic.haiku.current`, a
human-owned PR there), not this repo. If this repo needs a different line, change `models.config.json`.

**A floor is not a retirement.** Anthropic's "Not sooner than <date>" is recorded as an advisory; it never moves
the default.

Design and sources: `SPEC-v9.md` Part B and its brief in the model-defaults workspace; NodeKit's
`docs/MODEL_REGISTRY.md`.
