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

import { GRAPHQL_API_TYPE, REST_API_TYPE } from '@netcracker/qubership-apihub-api-processor'
import { isNotEmpty } from '../utils/arrays'

export const API_TYPE_REST = REST_API_TYPE
export const API_TYPE_GRAPHQL = GRAPHQL_API_TYPE

export type ApiType =
  | typeof API_TYPE_REST
  | typeof API_TYPE_GRAPHQL

export const API_TYPES: ApiType[] = [API_TYPE_REST, API_TYPE_GRAPHQL]
export const API_TYPE_TITLE_MAP: Record<ApiType, string> = {
  [API_TYPE_REST]: 'REST API',
  [API_TYPE_GRAPHQL]: 'GraphQL API',
}

export function toApiTypeMap<T extends {
  apiType: ApiType
}>(operationTypes?: ReadonlyArray<T>): Record<ApiType, T> | undefined {
  return isNotEmpty(operationTypes)
    ? (Object.fromEntries(
      operationTypes!.map(operationType => [operationType.apiType, operationType]),
    )) as Record<ApiType, T>
    : undefined
}
