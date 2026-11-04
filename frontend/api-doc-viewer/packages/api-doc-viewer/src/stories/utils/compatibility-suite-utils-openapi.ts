import { DIFF_META_KEY, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { OPEN_API_HTTP_METHODS_ORDER } from '@netcracker/qubership-apihub-next-data-model/shared/openapi/types/http-method'
import type { OpenApiOperationKeys } from '@netcracker/qubership-apihub-next-data-model/shared/openapi/types/operation-keys'
import { isObject } from '@netcracker/qubership-apihub-next-data-model/utilities'

/** Whether the merged object records a wholly added / removed child under `key`. */
function isChildWhollyChanged(merged: Record<PropertyKey, unknown>, key: string): boolean {
  const diffs = merged[DIFF_META_KEY]
  const diff = isObject(diffs) ? diffs[key] : undefined
  const action = isObject(diff) ? diff.action : undefined
  return action === DiffAction.add || action === DiffAction.remove
}

/**
 * The operation an OpenAPI compatibility case shows: almost every case has one operation; a case
 * that adds / removes a path or a method has two, and shows the added / removed one. Read from the
 * merged document, where path-item `$ref`s are resolved. Design:
 * docs/design/openapi/features/compatibility-suite.md -> "Operation".
 */
export function resolveOpenApiCompatibilitySuiteOperationKeys(merged: unknown): OpenApiOperationKeys | undefined {
  const paths = isObject(merged) ? merged.paths : undefined
  if (!isObject(paths)) {
    return undefined
  }
  const operations: Array<OpenApiOperationKeys & { whollyChanged: boolean }> = []
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!isObject(pathItem)) {
      continue
    }
    for (const method of OPEN_API_HTTP_METHODS_ORDER) {
      if (isObject(pathItem[method])) {
        operations.push({ path, method, whollyChanged: isChildWhollyChanged(paths, path) || isChildWhollyChanged(pathItem, method) })
      }
    }
  }
  const operation = operations.find(candidate => candidate.whollyChanged) ?? operations[0]
  return operation ? { path: operation.path, method: operation.method } : undefined
}
