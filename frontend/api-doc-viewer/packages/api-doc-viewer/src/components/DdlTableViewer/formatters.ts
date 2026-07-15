import { DdlApiForeignKeyTarget } from "@netcracker/qubership-apihub-next-data-model/model/ddlapi/tree/node-value"
import { DEFAULT_SCHEMA_NAME } from "./consts"

export function formatForeignKeyTarget(target: DdlApiForeignKeyTarget): string {
  const tableAndColumn = `${target.tableName}.${target.columnName}`
  if (!target.schemaName || target.schemaName === DEFAULT_SCHEMA_NAME) {
    return tableAndColumn
  }
  return `${target.schemaName}.${tableAndColumn}`
}

export function formatIndexPartNames(partNames: readonly string[]): string {
  return partNames.join(', ')
}
