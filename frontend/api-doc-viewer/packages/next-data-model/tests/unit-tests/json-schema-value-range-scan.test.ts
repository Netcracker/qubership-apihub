import { DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY, apiDiff } from "@netcracker/qubership-apihub-api-diff"
import { JsonSchemaTreeWithDiffsBuilder } from "../../src/building-service/json-schema/tree-with-diffs/builder"
import { JsonSchemaValidationRowKeys } from "../../src/model/json-schema/tree-with-diffs/validation-row-source-keys"
import {
  JsonSchemaRowDiffs,
} from "../../src/model/json-schema/tree-with-diffs/property-row-diffs"
import {
  listValueRangeDiffFixtureCaseIds,
  resolveValueRangeDiffFixtureSchemas,
} from "../helpers/value-range-diff-fixtures"

const DIFF_META_KEYS = {
  diffsMetaKey: DIFF_META_KEY,
  aggregatedDiffsMetaKey: DIFFS_AGGREGATED_META_KEY,
}

function mergeSchemas(beforeSchema: object, afterSchema: object): object {
  const beforeDocument = {
    openapi: "3.0.0",
    info: { title: "Test", version: "1.0.0" },
    paths: {},
    components: { schemas: { __Substitution__: beforeSchema } },
  }
  const afterDocument = {
    openapi: "3.0.0",
    info: { title: "Test", version: "1.0.0" },
    paths: {},
    components: { schemas: { __Substitution__: afterSchema } },
  }
  return apiDiff(beforeDocument, afterDocument, {
    beforeSource: beforeDocument,
    afterSource: afterDocument,
    metaKey: DIFF_META_KEY,
  }).merged.components.schemas.__Substitution__ as object
}

describe("value range exclusive flag scan", () => {
  it("never treats boolean exclusive flags as standalone chip or row diffs", () => {
    const caseIds = listValueRangeDiffFixtureCaseIds({ includeOas31Only: false })
    const rowKey = JsonSchemaValidationRowKeys.VALUE_RANGE

    for (const caseId of caseIds) {
      const { before: beforeSchema, after: afterSchema } = resolveValueRangeDiffFixtureSchemas(caseId)
      const merged = mergeSchemas(beforeSchema, afterSchema)
      const tree = new JsonSchemaTreeWithDiffsBuilder({
        source: merged,
        diffsMetaKeys: DIFF_META_KEYS,
      }).build()

      const valueDiffs = JsonSchemaRowDiffs.ValidationRows.takeValueDiffs(tree.root!, rowKey)
      const valueDiffKeys = Object.keys(valueDiffs ?? {})

      expect(valueDiffKeys.some((key) => key.startsWith("exclusive"))).toBe(false)
    }
  })
})
