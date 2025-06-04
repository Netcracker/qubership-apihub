import { ActionType, Diff, DiffAction, isDiffAdd, isDiffRemove, isDiffRename } from '@netcracker/qubership-apihub-api-diff';

type DiffAlias = {
  beforeValue: unknown
  afterValue: unknown
}

type DiffAliases = Partial<
  Record<
    Exclude<ActionType, typeof DiffAction.replace | typeof DiffAction.rename>, DiffAlias
  >
>

export const DIFF_REPLACE_ALIAS_BOOLEAN_PROPERTY: DiffAliases = {
  [DiffAction.add]: { beforeValue: false, afterValue: true },
  [DiffAction.remove]: { beforeValue: true, afterValue: false },
}

export function applyDiffReplaceAliasBooleanProperty(diff?: Diff) {
  return applyDiffReplaceAlias(DIFF_REPLACE_ALIAS_BOOLEAN_PROPERTY, diff)
}

export function applyDiffReplaceAlias(
  aliases: DiffAliases = {},
  diff?: Diff
): Diff | undefined {
  if (!diff) {
    return undefined
  }
  if (isDiffAdd(diff) || isDiffRemove(diff) || isDiffRename(diff)) {
    return diff
  }
  for (const [action, alias] of Object.entries(aliases)) {
    const isMatched = alias.beforeValue === diff.beforeValue && alias.afterValue === diff.afterValue
    if (!isMatched) { continue }
    switch (action) {
      case DiffAction.add:
        return {
          type: diff.type,
          action: action,
          description: diff.description,
          scope: diff.scope,
          afterValue: diff.afterValue,
          afterNormalizedValue: diff.afterNormalizedValue,
          afterDeclarationPaths: diff.afterDeclarationPaths,
        }
      case DiffAction.remove:
        return {
          type: diff.type,
          action: action,
          description: diff.description,
          scope: diff.scope,
          beforeValue: diff.beforeValue,
          beforeNormalizedValue: diff.beforeNormalizedValue,
          beforeDeclarationPaths: diff.beforeDeclarationPaths,
        }
    }
  }
  return undefined
}
