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
  DIFFS_AGGREGATED_META_KEY,
  Diff,
  DIFF_META_KEY,
  DiffMetaRecord,
} from '@netcracker/qubership-apihub-api-diff'

export type KeyOfConstType<T> = T[keyof T]

export type OperationsApiType = 'rest' | 'graphql'
export type PackageId = string
export type FileId = string
export type TemplatePath = string
export type VersionId = string | `${string}@${number}`
export type OperationId = string

export type WithDiffMetaRecord<T extends object> = T & {[DIFF_META_KEY]?: DiffMetaRecord}
export type WithAggregatedDiffs<T extends object> = T & {[DIFFS_AGGREGATED_META_KEY]: Diff[]}
