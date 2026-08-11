export const DDL_UNNAMED_INDEX_TITLE = '<unnamed>'

export function resolveIndexTitle(indexName?: string): string {
  return indexName ?? DDL_UNNAMED_INDEX_TITLE
}

export function isNamedIndexTitle(indexName: string): boolean {
  return indexName !== DDL_UNNAMED_INDEX_TITLE
}

type DdlApiIndexRowKeySource = {
  readonly indexName?: string
}

export function resolveDdlApiIndexNodeKey<Key extends string | number>(
  crawlKey: Key,
  value: DdlApiIndexRowKeySource,
): Key | string {
  if (value.indexName && isNamedIndexTitle(value.indexName)) {
    return value.indexName
  }

  return crawlKey
}

export function resolveDdlApiIndexDescendantDiffKey(
  arrayIndex: number,
  indexRow: DdlApiIndexRowKeySource | undefined,
  sourceIndexName: string | undefined,
): string {
  if (sourceIndexName) {
    return sourceIndexName
  }

  if (indexRow?.indexName && isNamedIndexTitle(indexRow.indexName)) {
    return indexRow.indexName
  }

  return String(arrayIndex)
}
