import { isObject } from '@netcracker/qubership-apihub-json-crawl'

export const SPEC_TYPE_JSON_SCHEMA_04 = 'json-schema-04'
export const SPEC_TYPE_JSON_SCHEMA_06 = 'json-schema-06'
export const SPEC_TYPE_JSON_SCHEMA_07 = 'json-schema-07'
export const SPEC_TYPE_OPEN_API_30 = 'openapi-3.0'
export const SPEC_TYPE_OPEN_API_31 = 'openapi-3.1'
export const SPEC_TYPE_ASYNCAPI_2 = 'asyncapi-2'
export const SPEC_TYPE_GRAPH_API = 'graphapi'

export type JsonSchemaSpecVersion =
  typeof SPEC_TYPE_JSON_SCHEMA_04
  | typeof SPEC_TYPE_JSON_SCHEMA_06
  | typeof SPEC_TYPE_JSON_SCHEMA_07

export type OpenApiSpecVersion =
  typeof SPEC_TYPE_OPEN_API_30
  | typeof SPEC_TYPE_OPEN_API_31

export type SpecType =
  JsonSchemaSpecVersion
  | OpenApiSpecVersion
  | typeof SPEC_TYPE_GRAPH_API
  | typeof SPEC_TYPE_ASYNCAPI_2

interface OpenApiSpec {
  openapi: string
}

interface AsyncApiSpec {
  asyncapi: string
}

interface GraphApiSpec {
  graphapi: string
}

export interface Spec {
  readonly type: SpecType
  readonly version: string
}

export function resolveSpec(data: unknown): Spec {
  if (!isObject(data)) {
    throw new Error('Spec must be an object')
  }

  if (isOpenApi(data)) {
    if (data.openapi.startsWith('3.1')) {
      return { type: SPEC_TYPE_OPEN_API_31, version: data.openapi }
    }
    if (data.openapi.startsWith('3.0')) {
      return { type: SPEC_TYPE_OPEN_API_30, version: data.openapi }
    }
    throw new Error(`OpenApi version ${data.openapi} is not supported.`)
  }

  if (isAsyncApi(data)) {
    if (data.asyncapi.startsWith('2.')) {
      return { type: SPEC_TYPE_ASYNCAPI_2, version: data.asyncapi }
    }
    throw new Error(`AsyncApi version ${data.asyncapi} is not supported.`)
  }

  if (isGraphApi(data)) {
    return { type: SPEC_TYPE_GRAPH_API, version: data.graphapi }
  }

  return {
    type: SPEC_TYPE_JSON_SCHEMA_07,
    version: 'not-defined',
  }
}

function isOpenApi(
  data: unknown,
): data is OpenApiSpec {
  return isObject(data) && 'openapi' in data && typeof data.openapi === 'string' && data.openapi.length > 0
}

function isAsyncApi(
  data: unknown,
): data is AsyncApiSpec {
  return isObject(data) && 'asyncapi' in data && typeof data.asyncapi === 'string' && data.asyncapi.length > 0
}

function isGraphApi(
  data: unknown,
): data is GraphApiSpec {
  return isObject(data) && 'graphapi' in data && typeof data.graphapi === 'string' && data.graphapi.length > 0
}
