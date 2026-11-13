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
// what a failed build throws; clients read its lists to report the notifications with the failure
export { NotificationsError } from './errors'
export {
  calculateChangeId,
  calculateDiffId,
  calculateImpactedSummary,
  calculateNormalizedRestOperationId,
  cropRawGraphQlDocumentToRawSingleOperationGraphQlDocument,
  removeComponents,
} from './utils'
export { convertDtoFieldOperationTypes, replacePropertyInChangesSummary } from './utils/transformToDto'
// the key of `BuildResult.operations`, which `./types` above exports: a consumer holding an operationId
// cannot address the index without it, and this entry is the one that carries the type
export { operationKey } from './components/operations'
export { stringifyYaml } from './utils/export'
