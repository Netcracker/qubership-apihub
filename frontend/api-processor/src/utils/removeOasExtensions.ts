import { OpenAPIV3 } from 'openapi-types'
import { normalize, OpenApiExtensionKey } from '@netcracker/qubership-apihub-api-unifier'
import { isArray } from '@netcracker/qubership-apihub-json-crawl'

export const removeOasExtensions = (document: OpenAPIV3.Document, allowedOasExtensions?: OpenApiExtensionKey[]): OpenAPIV3.Document => {
  return normalize(
    document,
    {
      resolveRef: false,
      mergeAllOf: false,
      removeOasExtensions: isArray(allowedOasExtensions),
      shouldRemoveOasExtension: (key) => !allowedOasExtensions?.includes(key),
    },
  ) as OpenAPIV3.Document
}
