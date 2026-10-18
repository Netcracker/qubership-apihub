import { DdlApiForeignKeyTarget } from "../../model/ddlapi/tree/node-value"

export function formatForeignKeyTargetKey(target: DdlApiForeignKeyTarget): string {
  return `${target.schemaName}\0${target.tableName}\0${target.columnName}`
}

/**
 * Keys of a column's foreign key targets, in the order the row lists them. A column references the
 * same target through two foreign keys when, for example, a key is renamed: the key that went away
 * and the key that replaced it. The first occurrence of a target keeps the plain key, and each
 * repeat gets an occurrence suffix, so every badge looks up the diff of its own foreign key.
 */
export function formatForeignKeyTargetKeys(targets: readonly DdlApiForeignKeyTarget[]): string[] {
  const occurrences = new Map<string, number>()
  return targets.map(target => {
    const key = formatForeignKeyTargetKey(target)
    const occurrence = occurrences.get(key) ?? 0
    occurrences.set(key, occurrence + 1)
    return occurrence === 0 ? key : `${key}\0${occurrence}`
  })
}
