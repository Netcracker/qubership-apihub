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

import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type OperationTypeForm =
  | ReadonlyArray<ApiType>
  | Record<ApiType, unknown>
  | undefined
  | null

export function isApiTypeSelectorShown(operationTypes: OperationTypeForm): boolean {
  if (!operationTypes) {
    return false
  }
  return Array.isArray(operationTypes)
    ? operationTypes.length > 1
    : Object.keys(operationTypes).length > 1
}

export function getDefaultApiType(operationTypes: OperationTypeForm): ApiType {
  if (!operationTypes) {
    return DEFAULT_API_TYPE
  }

  const apiTypes = Array.isArray(operationTypes) ? operationTypes : Object.keys(operationTypes!) as ApiType[]
  if (apiTypes.length > 1 || isEmpty(apiTypes)) {
    return DEFAULT_API_TYPE
  }

  return apiTypes[0]
}
