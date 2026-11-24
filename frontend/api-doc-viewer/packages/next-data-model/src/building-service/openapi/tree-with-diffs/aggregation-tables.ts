import { OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY, OPENAPI_RESPONSE_OPTIONS_DIFF_KEY } from "../../../model/openapi/tree-with-diffs/diff-keys"
import { OPENAPI_FIELD_PLACEMENTS, OPENAPI_NODE_PLACEMENTS } from "../../../model/openapi/tree-with-diffs/placements"
import { OpenApiTreeNodeKind, OpenApiTreeNodeKinds } from "../../../model/openapi/types/node-kind"
import { RecordDrivenAggregationTables } from "../../abstract/tree-with-diffs/node-diffs-data/record-driven-aggregators"
import { SECURITY_SYNTHETIC_FIELD_DIFF_KEYS } from "../../security/tree-with-diffs/aggregation-tables"
import { OPENAPI_NODE_VALUE_PROPS } from "../tree/node-data/builder"

// The placement tables live in the model (`model/openapi/tree-with-diffs/placements.ts`), next to the
// Security ones they include.

/** Field diffs that are not value props: synthetic row diffs written by the with-diffs transformer. */
const OPENAPI_SYNTHETIC_FIELD_DIFF_KEYS: Readonly<Partial<Record<OpenApiTreeNodeKind, readonly string[]>>> = {
  ...SECURITY_SYNTHETIC_FIELD_DIFF_KEYS,
  [OpenApiTreeNodeKinds.REQUEST_BODY]: [OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY],
  [OpenApiTreeNodeKinds.CONTENT]: [OPENAPI_MEDIA_TYPE_OPTIONS_DIFF_KEY],
  [OpenApiTreeNodeKinds.RESPONSES]: [OPENAPI_RESPONSE_OPTIONS_DIFF_KEY],
}

/**
 * The tables of every OpenAPI kind (one record-driven aggregator family serves them all): all
 * kind-specific diff semantics are prepared by `OpenApiSpecWithDiffsTransformer`; row-level
 * composition lives in `OpenApiRowDiffs` / `SecurityRowDiffs`. A kind aggregates its value props and
 * its synthetic row keys.
 */
export const OPENAPI_AGGREGATION_TABLES: RecordDrivenAggregationTables<OpenApiTreeNodeKind> = {
  fieldDiffKeys: kind => [...OPENAPI_NODE_VALUE_PROPS[kind], ...(OPENAPI_SYNTHETIC_FIELD_DIFF_KEYS[kind] ?? [])],
  fieldPlacements: OPENAPI_FIELD_PLACEMENTS,
  nodePlacements: OPENAPI_NODE_PLACEMENTS,
}
