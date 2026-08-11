import { DdlApiForeignKeyTarget } from "../../model/ddlapi/tree/node-value"

export function formatForeignKeyTargetKey(target: DdlApiForeignKeyTarget): string {
  return `${target.schemaName}\0${target.tableName}\0${target.columnName}`
}
