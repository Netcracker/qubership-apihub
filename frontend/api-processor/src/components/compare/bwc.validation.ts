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

import { BREAKING_CHANGE_TYPE, ResolvedOperation, RISKY_CHANGE_TYPE } from '../../types'
import { API_KIND } from '../../consts'
import { Diff } from '@netcracker/qubership-apihub-api-diff'

export function reclassifyNoBwcBreakingChanges(
  operationDiffs: Diff[],
  previous?: ResolvedOperation,
  current?: ResolvedOperation,
): Diff[] {
  if (current?.apiKind === API_KIND.NO_BWC || previous?.apiKind === API_KIND.NO_BWC) {
    return operationDiffs?.map((diff) => {
      return diff.type === BREAKING_CHANGE_TYPE
        ? { ...diff, type: RISKY_CHANGE_TYPE }
        : diff
    })
  }
  return operationDiffs
}
