import type { OpenApiOperationKeys } from '@netcracker/qubership-apihub-api-doc-viewer'
import { isObject } from '@netcracker/qubership-apihub-ui-shared/utils/objects'

import { isOpenApiSpecification } from './type-guards'

const OPEN_API_HTTP_METHODS: ReadonlySet<string> = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
])

/**
 * Keys of the only operation of an OpenAPI document cut to one path and one method
 * (see `useNormalizedOperation`, `handleOpenApiComparisonInternalDocument`, `getApiDiffResult`).
 * Symbol keys (diff meta) are ignored. Returns `undefined` when the document is not OpenAPI
 * or does not contain exactly one operation.
 */
export function resolveOpenApiOperationKeys(document: unknown): OpenApiOperationKeys | undefined {
  if (!isOpenApiSpecification(document) || !isObject(document.paths)) {
    return undefined
  }

  const pathKeys = Object.keys(document.paths)
  if (pathKeys.length !== 1) {
    console.warn(`Expected exactly 1 path in OpenAPI document, got ${pathKeys.length}`)
    return undefined
  }

  const [path] = pathKeys
  const pathItem = document.paths[path]
  if (!isObject(pathItem)) {
    return undefined
  }

  const methods = Object.keys(pathItem).filter(key => OPEN_API_HTTP_METHODS.has(key.toLowerCase()))
  if (methods.length !== 1) {
    console.warn(`Expected exactly 1 method in path "${path}" of OpenAPI document, got ${methods.length}`)
    return undefined
  }

  const [method] = methods
  return { path, method }
}
