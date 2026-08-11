import type { Realm } from "@netcracker/qubership-apihub-ddlapi";

/** True when the Realm contains at least one table (CREATE SCHEMA-only DDL yields false). */
export function realmHasTables(realm: Realm): boolean {
  for (const schema of realm.schemas ?? []) {
    if ((schema.tables ?? []).length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Schema shells copied from `present`, with empty `tables[]`.
 * Mirrors api-processor `compareDdlDocuments` / `emptyRealmLike` (kept local for Storybook).
 */
export function emptyRealmLike(present: Realm): Realm {
  return {
    ddlapi: present.ddlapi,
    schemas: (present.schemas ?? []).map(({ name }) => ({ name, tables: [] })),
  };
}

/**
 * Resolve one side of a before/after pair for `apiDiff`.
 * When `side` has no tables but `counterpart` does (e.g. before.sql is CREATE SCHEMA only),
 * substitute `emptyRealmLike(counterpart)` so table-level diffs surface correctly.
 */
export function resolveDdlDiffCompareSide(side: Realm, counterpart: Realm): Realm {
  if (realmHasTables(side) || !realmHasTables(counterpart)) {
    return side;
  }
  return emptyRealmLike(counterpart);
}

/** Resolve both sides of a Storybook DDL diff fixture pair. */
export function resolveDdlDiffComparePair(
  before: Realm,
  after: Realm,
): { before: Realm; after: Realm } {
  return {
    before: resolveDdlDiffCompareSide(before, after),
    after: resolveDdlDiffCompareSide(after, before),
  };
}
