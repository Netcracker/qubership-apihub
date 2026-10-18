/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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