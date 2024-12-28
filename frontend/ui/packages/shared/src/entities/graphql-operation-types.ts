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

export const QUERY_OPERATION_TYPE = 'query'
export const MUTATION_OPERATION_TYPE = 'mutation'
export const SUBSCRIPTION_OPERATION_TYPE = 'subscription'

export type GraphQlOperationType =
  | typeof QUERY_OPERATION_TYPE
  | typeof MUTATION_OPERATION_TYPE
  | typeof SUBSCRIPTION_OPERATION_TYPE

export const GRAPHQL_OPERATION_TYPE_COLOR_MAP: Record<GraphQlOperationType, string> = {
  [QUERY_OPERATION_TYPE]: '#00BB5B',
  [MUTATION_OPERATION_TYPE]: '#4FC0F8',
  [SUBSCRIPTION_OPERATION_TYPE]: '#FFB02E',
}
