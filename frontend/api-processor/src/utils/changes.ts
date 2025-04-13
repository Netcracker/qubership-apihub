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

import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { BREAKING_CHANGE_TYPE, OperationChanges, RISKY_CHANGE_TYPE } from '../types'

export function markChangeAsRisky(diff: Diff, operationChange: OperationChanges): void {
  diff.type = RISKY_CHANGE_TYPE

  const {
    changeSummary,
    impactedSummary,
  } = operationChange

  changeSummary[BREAKING_CHANGE_TYPE] -= 1
  changeSummary[RISKY_CHANGE_TYPE] += 1

  impactedSummary[BREAKING_CHANGE_TYPE] = !!changeSummary[BREAKING_CHANGE_TYPE]
  impactedSummary[RISKY_CHANGE_TYPE] = true
}
