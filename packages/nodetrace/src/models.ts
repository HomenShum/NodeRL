/**
 * models.ts — the one place this package learns which model it defaults to.
 *
 * The id is not typed here. It comes from `models.lock.json`, a file NodeKit's `nodekit models sync` writes
 * from a reviewed registry (SPEC model-defaults §B.5). The accessor only LOOKS THINGS UP: it never builds an id
 * and never guesses one, so an id the registry has not reviewed comes back as `override-unknown` and the
 * caller's existing routing decides, exactly as before.
 *
 * JSON import, no node:fs: this file loads the same way in Node, a bundler and a Convex-style runtime.
 */
import lock from "../../../models.lock.json" with { type: "json" };

export type Lock = typeof lock;
export type Role = keyof typeof lock.roles;

export type Resolved = {
  id: string;
  provider: string | null;
  transport: string | null;
  constraints: object | null;
  /**
   * lock: the registry's choice. override: a caller-supplied id the registry reviewed. override-incompatible:
   * reviewed, but with no wire id on this role's transport or its own provider's transport. override-unknown:
   * not in the registry at all.
   */
  source: "lock" | "override" | "override-incompatible" | "override-unknown";
};

type Known = { provider: string; ids: Record<string, string>; constraints: object };

/** Lookup against an explicit lock; `resolveModel` is this over the committed one (and tests pass variants). */
export function resolveWith(source: Lock, role: Role, override?: string): Resolved {
  const r = source.roles[role];
  if (override) {
    const k = (source.known as Record<string, Known>)[override];
    if (!k) return { id: override, provider: null, transport: null, constraints: null, source: "override-unknown" };
    // The override's transport comes from the OVERRIDE's own verified ids, never from the role: the role's
    // transport when the override has a wire id for it, else the override's provider-direct transport, else
    // none (the caller keeps its legacy routing).
    const transport = k.ids?.[r.transport] ? r.transport : k.ids?.[k.provider] ? k.provider : null;
    return transport
      ? { id: override, provider: k.provider, transport, constraints: k.constraints, source: "override" }
      : { id: override, provider: k.provider, transport: null, constraints: null, source: "override-incompatible" };
  }
  return { id: r.id, provider: r.provider, transport: r.transport, constraints: r.constraints, source: "lock" };
}

export const resolveModel = (role: Role, override?: string): Resolved => resolveWith(lock, role, override);

/** The verified wire string for `id` on `transport`. Throws rather than constructing one. */
export function wireId(id: string, transport: string, source: Lock = lock): string {
  const known = (source.known as Record<string, Known>)[id];
  const byRole = Object.values(source.roles).find((r) => r.id === id);
  const w = (known?.ids ?? byRole?.ids)?.[transport];
  if (!w) throw new Error(`no verified ${transport} id for ${id}`);
  return w;
}
