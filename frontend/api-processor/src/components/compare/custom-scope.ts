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

import {
  breaking,
  DiffType,
  ReclassificationRule,
  risky,
} from '@netcracker/qubership-apihub-api-diff'
import { ApihubApiCompatibilityKind, isNoBwcLike } from '../../consts'

/** Api kind a node was reached under. */
export const CUSTOM_SCOPE_ELEMENT_API_KIND = 'apiKind'

/** Group of operations a removal of a long-deprecated element was reached from. */
export const CUSTOM_SCOPE_ELEMENT_DEPRECATION = 'deprecation'

export const apiKindReclassificationRule: ReclassificationRule = ({ type, customScope }): DiffType | undefined => {
  // A cast rather than a check: api-diff types every custom scope value as a string, and the only provider
  // writing under this name is the api kind one each `*.changes.ts` declares, which `apiDiff` keeps sole by
  // rejecting a second provider of the same name
  const apiKind = customScope?.[CUSTOM_SCOPE_ELEMENT_API_KIND] as ApihubApiCompatibilityKind | undefined
  return type === breaking && isNoBwcLike(apiKind) ? risky : undefined
}
