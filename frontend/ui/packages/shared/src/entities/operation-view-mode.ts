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

import type { ApiType } from './api-types'
import { API_TYPE_GRAPHQL, API_TYPE_REST } from './api-types'

export const DOC_OPERATION_VIEW_MODE = 'doc'
export const SIMPLE_OPERATION_VIEW_MODE = 'simple'
export const RAW_OPERATION_VIEW_MODE = 'raw'
export const SCHEMA_OPERATION_VIEW_MODE = 'schema'
export const INTROSPECTION_OPERATION_VIEW_MODE = 'introspection'
export const GRAPH_VIEW_MODE = 'graph'

export type OperationViewMode =
  | typeof DOC_OPERATION_VIEW_MODE
  | typeof SIMPLE_OPERATION_VIEW_MODE
  | typeof RAW_OPERATION_VIEW_MODE
  | typeof SCHEMA_OPERATION_VIEW_MODE
  | typeof INTROSPECTION_OPERATION_VIEW_MODE
  | typeof GRAPH_VIEW_MODE

export const REST_OPERATION_VIEW_MODES: ReadonlyArray<OperationViewMode> = [
  DOC_OPERATION_VIEW_MODE,
  SIMPLE_OPERATION_VIEW_MODE,
  GRAPH_VIEW_MODE,
  RAW_OPERATION_VIEW_MODE,
]

export const GQL_OPERATION_VIEW_MODES: ReadonlyArray<OperationViewMode> = [
  DOC_OPERATION_VIEW_MODE,
  SIMPLE_OPERATION_VIEW_MODE,
  RAW_OPERATION_VIEW_MODE,
]

export const OPERATION_VIEW_MODES = new Map<ApiType, ReadonlyArray<OperationViewMode>>([
  [API_TYPE_GRAPHQL, GQL_OPERATION_VIEW_MODES],
  [API_TYPE_REST, REST_OPERATION_VIEW_MODES],
])

export const OPERATION_COMPARE_VIEW_MODES: ReadonlyArray<OperationViewMode> = [DOC_OPERATION_VIEW_MODE, RAW_OPERATION_VIEW_MODE]

export const OPERATION_PREVIEW_VIEW_MODES: ReadonlyArray<OperationViewMode> = [
  DOC_OPERATION_VIEW_MODE,
  SIMPLE_OPERATION_VIEW_MODE,
  RAW_OPERATION_VIEW_MODE,
]
