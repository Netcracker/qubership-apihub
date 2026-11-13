import { SECURITY_ALTERNATIVES_DIFF_KEY } from "../../../model/security/tree-with-diffs/diff-keys"
import { SECURITY_FIELD_PLACEMENTS, SECURITY_NODE_PLACEMENTS } from "../../../model/security/tree-with-diffs/placements"
import { SecurityTreeNodeKind, SecurityTreeNodeKinds } from "../../../model/security/types/node-kind"
import { SECURITY_NODE_VALUE_PROPS } from "../../../model/security/types/node-value"
import { RecordDrivenAggregationTables } from "../../abstract/tree-with-diffs/node-diffs-data/record-driven-aggregators"

// The placement tables the aggregators fill live in the model (`model/security/tree-with-diffs/placements.ts`):
// the card rows read the same tables.

/** Field diffs that are not value props: synthetic row diffs written by the security with-diffs builders. */
export const SECURITY_SYNTHETIC_FIELD_DIFF_KEYS: Readonly<Partial<Record<SecurityTreeNodeKind, readonly string[]>>> = {
  [SecurityTreeNodeKinds.SECURITY_ALTERNATIVES]: [SECURITY_ALTERNATIVES_DIFF_KEY],
}

/** The diffs a security node aggregates: its value props and its synthetic row keys. */
export function securityFieldDiffKeys(kind: SecurityTreeNodeKind): readonly string[] {
  return [...SECURITY_NODE_VALUE_PROPS[kind], ...(SECURITY_SYNTHETIC_FIELD_DIFF_KEYS[kind] ?? [])]
}

/**
 * The Security kinds' tables, for the API types whose own aggregators are not record-driven
 * (AsyncAPI: `ASYNC_API_SECURITY_NODE_AGGREGATORS`). OpenAPI spreads the same tables into its own.
 */
export const SECURITY_AGGREGATION_TABLES: RecordDrivenAggregationTables<SecurityTreeNodeKind> = {
  fieldDiffKeys: securityFieldDiffKeys,
  fieldPlacements: SECURITY_FIELD_PLACEMENTS,
  nodePlacements: SECURITY_NODE_PLACEMENTS,
}
