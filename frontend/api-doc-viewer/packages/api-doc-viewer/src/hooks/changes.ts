import { isObject } from '@netcracker/qubership-apihub-api-data-model'
import { ActionType, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { useMemo } from 'react'

type ReplaceAliasCondition = {
  actualReplacedValue?: unknown
  expectedReplacedValue?: unknown
}
export type ReplaceAliases = Partial<Record<ActionType, ReplaceAliasCondition>>

export function useItemChangedFlags($action: ActionType | undefined, replaceAlias?: ReplaceAliases) {
  return useMemo(() => ({
    itemAdded: $action === DiffAction.add || applyReplaceAlias(DiffAction.add, replaceAlias),
    itemRemoved: $action === DiffAction.remove || applyReplaceAlias(DiffAction.remove, replaceAlias),
    itemReplaced: $action === DiffAction.replace,
  }), [$action, replaceAlias])
}

function applyReplaceAlias(actionType: ActionType, replaceAlias?: ReplaceAliases): boolean {
  if (!replaceAlias) {
    return false
  }

  const aliasToActionType = replaceAlias[actionType]

  if (!isObject(aliasToActionType)) {
    return false
  }

  return aliasToActionType.actualReplacedValue === aliasToActionType.expectedReplacedValue
}