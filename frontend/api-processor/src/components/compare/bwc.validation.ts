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

import { BREAKING_CHANGE_TYPE, OperationChanges, RISKY_CHANGE_TYPE } from '../../types'
import { API_KIND } from '../../consts'

export function validateBwcBreakingChanges(
  operationChanges: OperationChanges,
): void {
  if (!operationChanges.changeSummary?.breaking) {
    return
  }
  if (operationChanges.apiKind !== API_KIND.NO_BWC && operationChanges.previousApiKind !== API_KIND.NO_BWC) {
    return
  }

  operationChanges.changeSummary[RISKY_CHANGE_TYPE] = operationChanges.changeSummary[BREAKING_CHANGE_TYPE]
  operationChanges.changeSummary[BREAKING_CHANGE_TYPE] = 0

  operationChanges.impactedSummary[BREAKING_CHANGE_TYPE] = false
  operationChanges.impactedSummary[RISKY_CHANGE_TYPE] = true

  operationChanges.diffs = operationChanges.diffs?.map((diff) => {
    if (diff.type !== BREAKING_CHANGE_TYPE) {
      return { ...diff }
    }
    return { ...diff, type: RISKY_CHANGE_TYPE }
  })
}
