import type { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { isGraphApi } from '@netcracker/qubership-apihub-graphapi'
import { isObject } from '@netcracker/qubership-apihub-ui-shared/utils/objects'
import type { OpenAPIV3 } from 'openapi-types'

export function isRestOperation(specification: unknown): specification is OpenAPIV3.Document {
  if (!isObject(specification)) {
    return false
  }
  return 'openapi' in specification && typeof specification.openapi === 'string'
}

export function isGraphQLOperation(specification: unknown): specification is GraphApiSchema {
  return isGraphApi(specification)
}
