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

// Light entry: shared types, constants and pure utilities (parser-free, no WASM).
// The spec-processing engine — PackageVersionBuilder, the compare/build engine and
// the DDL parser — lives in the '/processor' entry. Importing this root never pulls
// the ddlapi parser / libpg-query WASM, so main-thread/UI code can import freely.
export * from './apitypes'
// Parser-free compare helpers (e.g. calculateTotalChangeSummary). The compare/build
// engine itself (compare, compare.ddl) is part of the '/processor' entry.
export * from './components/compare/compare.utils'
export * from './consts'
export * from './types'
export {
  calculateChangeId,
  calculateDiffId,
  calculateImpactedSummary,
  calculateNormalizedRestOperationId,
  cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument,
  removeComponents,
} from './utils'
export { convertDtoFieldOperationTypes, replacePropertyInChangesSummary } from './utils/transformToDto'
export { stringifyYaml } from './utils/export'
