import { Diff, DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import { SPECIFICATION_EXTENSION_PREFIX } from '../consts'
import { WithAggregatedDiffs, WithDiffMetaRecord } from '../types'
import { isString } from './objects'

export function extractAggregatedDiffs(obj: unknown): Diff[] {
  return [...((obj as WithAggregatedDiffs<object> | undefined)?.[DIFFS_AGGREGATED_META_KEY] ?? [])]
}

export function extractAggregatedExtensionDiffs(obj: unknown, excludedExtensionNames: readonly string[] = []): Diff[] {
  return extractAggregatedDiffs(obj).filter(diff => {
    const beforePaths = 'beforeDeclarationPaths' in diff ? diff.beforeDeclarationPaths : []
    const afterPaths = 'afterDeclarationPaths' in diff ? diff.afterDeclarationPaths : []
    return [...beforePaths, ...afterPaths].some(path => {
      const extensionName = path.find(key => isString(key) && key.startsWith(SPECIFICATION_EXTENSION_PREFIX))
      return extensionName !== undefined && !excludedExtensionNames.includes(extensionName.toString())
    })
  })
}

export function extractOwnDiffs(obj: object): Diff[] {
  const meta = (obj as unknown as WithDiffMetaRecord<object>)[DIFF_META_KEY]
  return meta ? Object.values(meta) : []
}

export function extractOwnPropertyDiff(obj: object, property: string): Diff[] {
  const diff = (obj as unknown as WithDiffMetaRecord<object>)[DIFF_META_KEY]?.[property]
  return diff ? [diff] : []
}

export function extractOwnExtensionDiffs(obj: object): Diff[] {
  const meta = (obj as unknown as WithDiffMetaRecord<object>)[DIFF_META_KEY]
  return meta
    ? Object.entries(meta).filter(([key]) => key.startsWith(SPECIFICATION_EXTENSION_PREFIX)).map(([, diff]) => diff)
    : []
}

export function extractExtensionDiffs(obj: object): Diff[] {
  const diffs: Diff[] = []
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith(SPECIFICATION_EXTENSION_PREFIX)) {
      continue
    }
    diffs.push(...extractAggregatedDiffs(value))
  }
  return diffs
}
