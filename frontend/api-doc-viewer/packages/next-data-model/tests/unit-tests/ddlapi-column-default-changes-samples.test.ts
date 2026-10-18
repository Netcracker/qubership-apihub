import { readdirSync, readFileSync } from "fs"
import path from "path"
import { buildFromDdl } from "@netcracker/qubership-apihub-ddlapi/parser"
import { apiDiff } from "@netcracker/qubership-apihub-api-diff"
import { DdlApiSpecWithDiffsTransformer } from "../../src/building-service/ddlapi/shared/ddlapi-spec-with-diffs-transformer"
import { createBuildingServiceLogger } from "../../src/loggers"

const TEST_DIFFS_META_KEY = Symbol("test-ddl-diffs-meta-key")
const samplesRoot = path.join(__dirname, "../../../samples/ddlapi-diffs/column-default-changes")

describe("column-default-changes ddlapi diff samples", () => {
  const transformer = new DdlApiSpecWithDiffsTransformer(
    createBuildingServiceLogger(),
    {
      diffsMetaKey: TEST_DIFFS_META_KEY,
      aggregatedDiffsMetaKey: Symbol("test-ddl-aggregated-diffs-meta-key"),
    },
  )

  const caseIds = readdirSync(samplesRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))

  it.each(caseIds)("parses and maps default diff for %s", async (caseId) => {
    const beforeSql = readFileSync(path.join(samplesRoot, caseId, "before.sql"), "utf8")
    const afterSql = readFileSync(path.join(samplesRoot, caseId, "after.sql"), "utf8")
    const before = await buildFromDdl(beforeSql)
    const after = await buildFromDdl(afterSql)
    const merged = apiDiff(before, after, {
      metaKey: TEST_DIFFS_META_KEY,
      normalizedResult: false,
    }).merged

    const spec = transformer.transformSourceToTableOrientedSpecWithDiffs(merged, {
      schemaName: "public",
      name: "t",
    })
    const sampleColumn = spec?.columns.items.find(column => column.columnName !== "id")
    expect(sampleColumn).toBeDefined()
  })
})
