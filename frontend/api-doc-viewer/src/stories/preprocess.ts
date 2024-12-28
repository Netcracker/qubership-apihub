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

import { apiDiff, COMPARE_MODE_OPERATION, DIFF_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import { denormalize, normalize, NormalizeOptions, stringifyCyclicJso } from '@netcracker/qubership-apihub-api-unifier'
import { ObjectUtils } from '../utils/common/objects'
import { isObject } from '@netcracker/qubership-apihub-api-data-model'

const syntheticTitleFlag = Symbol('syntheticTitle')

const DEFAULT_NORMALIZE_OPTIONS: NormalizeOptions = {
  syntheticTitleFlag: syntheticTitleFlag,
  unify: true,
  validate: true,
  liftCombiners: true,
  allowNotValidSyntheticChanges: true,
}

function oas3TemplateInstance(): any {
  return {
    openapi: '3.0.2',
    paths: {
      '/test': {
        post: {
          summary: 'Test Operation',
          description: 'Description for Test Operation',
          parameters: [
            {
              name: 'TestRequestHeader',
              in: 'header',
              schema: { $ref: '#/components/schemas/__Substitution__' },
            },
            {
              name: 'TestRequestCookie',
              in: 'cookie',
              schema: { $ref: '#/components/schemas/__Substitution__' },
            },
            {
              name: 'TestPathParam',
              in: 'path',
              schema: { $ref: '#/components/schemas/__Substitution__' },
            },
            {
              name: 'TestQueryParam',
              in: 'query',
              schema: { $ref: '#/components/schemas/__Substitution__' },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/__Substitution__' },
              },
            },
          },
          responses: {
            200: {
              headers: {
                testResponseHeader: {
                  schema: { $ref: '#/components/schemas/__Substitution__' },
                },
              },
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/__Substitution__' },
                },
              },
            },
            401: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/__Substitution__' },
                },
              },
            },
            403: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/__Substitution__' },
                },
              },
            },
            404: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/__Substitution__' },
                },
              },
            },
            500: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/__Substitution__' },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        __Substitution__: null as unknown,
      },
    },
  }
}

export const REQUEST_HEADER_TARGET = 'request-header'
export const REQUEST_COOKIE_TARGET = 'request-cookie'
export const PATH_PARAMETER_TARGET = 'path-parameter'
export const QUERY_PARAMETER_TARGET = 'query-parameter'
export const REQUEST_BODY_TARGET = 'request-body'
export const RESPONSE_HEADER_TARGET = 'response-header'
export const RESPONSE_200_BODY_TARGET = 'response-200-body'
export const RESPONSE_401_BODY_TARGET = 'response-401-body'
export const RESPONSE_403_BODY_TARGET = 'response-403-body'
export const RESPONSE_404_BODY_TARGET = 'response-404-body'
export const RESPONSE_500_BODY_TARGET = 'response-500-body'

export type OASTarget =
  | typeof REQUEST_HEADER_TARGET
  | typeof REQUEST_COOKIE_TARGET
  | typeof PATH_PARAMETER_TARGET
  | typeof QUERY_PARAMETER_TARGET
  | typeof REQUEST_BODY_TARGET
  | typeof RESPONSE_HEADER_TARGET
  | typeof RESPONSE_200_BODY_TARGET
  | typeof RESPONSE_401_BODY_TARGET
  | typeof RESPONSE_403_BODY_TARGET
  | typeof RESPONSE_404_BODY_TARGET
  | typeof RESPONSE_500_BODY_TARGET

function getSchemaByTarget(source: any, target: OASTarget): unknown {
  switch (target) {
    case REQUEST_HEADER_TARGET:
      return source.paths['/test'].post.parameters[0].schema
    case REQUEST_COOKIE_TARGET:
      return source.paths['/test'].post.parameters[1].schema
    case PATH_PARAMETER_TARGET:
      return source.paths['/test'].post.parameters[2].schema
    case QUERY_PARAMETER_TARGET:
      return source.paths['/test'].post.parameters[3].schema
    case REQUEST_BODY_TARGET:
      return source.paths['/test'].post.requestBody.content['application/json'].schema
    case RESPONSE_HEADER_TARGET:
      return source.paths['/test'].post.responses[200].headers['testResponseHeader'].schema
    case RESPONSE_200_BODY_TARGET:
      return source.paths['/test'].post.responses[200].content['application/json'].schema
    case RESPONSE_401_BODY_TARGET:
      return source.paths['/test'].post.responses[401].content['application/json'].schema
    case RESPONSE_403_BODY_TARGET:
      return source.paths['/test'].post.responses[403].content['application/json'].schema
    case RESPONSE_404_BODY_TARGET:
      return source.paths['/test'].post.responses[404].content['application/json'].schema
    case RESPONSE_500_BODY_TARGET:
      return source.paths['/test'].post.responses[500].content['application/json'].schema
  }
}

function mergeComponents(
  a: Record<PropertyKey, unknown>,
  b: Record<PropertyKey, unknown>,
): Record<PropertyKey, unknown> {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  const keys = new Set([...aKeys, ...bKeys])
  const result: Record<PropertyKey, unknown> = {}
  for (const key of keys) {
    const aValue = a[key]
    const bValue = b[key]
    const isObjectA = isObject(aValue)
    const isObjectB = isObject(bValue)
    if (isObjectA && isObjectB) {
      result[key] = { ...aValue, ...bValue }
    } else if (isObjectA) {
      result[key] = { ...aValue }
    } else if (isObjectB) {
      result[key] = { ...bValue }
    }
  }
  return result
}

export type JsonSchemaOptions = {
  schema: unknown
  additionalComponents?: Record<PropertyKey, unknown>
  target: OASTarget
  circular?: boolean
}

export function prepareJsonSchema(options: JsonSchemaOptions): unknown {
  const {
    schema,
    additionalComponents = {},
    target,
    circular = false,
  } = options

  const document = oas3TemplateInstance()
  document.components.schemas.__Substitution__ = schema
  document.components = mergeComponents(document.components, additionalComponents)

  const normalizeOptions: NormalizeOptions = { ...DEFAULT_NORMALIZE_OPTIONS, source: document }
  const normalizedSource = normalize(document, normalizeOptions)
  const mergedSource = denormalize(normalizedSource, normalizeOptions)
  const mergedSchema = getSchemaByTarget(mergedSource, target)
  if (circular && isObject(mergedSchema)) {
    mergedSchema.toJSON = () => stringifyCyclicJso(mergedSchema)
  }
  return mergedSchema
}

type JsonSchemaFromOASOptions = {
  source: unknown
  path: PropertyKey[]
  circular?: boolean
}

export function prepareJsonSchemaFromOAS(options: JsonSchemaFromOASOptions) {
  const { source, path, circular = false } = options
  const normalizeOptions: NormalizeOptions = { ...DEFAULT_NORMALIZE_OPTIONS, source: source }
  const normalizedSource = normalize(source, normalizeOptions)
  const mergedSource = denormalize(normalizedSource, normalizeOptions)
  const mergedSchema = ObjectUtils.get(mergedSource, path)
  if (circular && isObject(mergedSchema)) {
    mergedSchema.toJSON = () => stringifyCyclicJso(mergedSchema)
  }
  return mergedSchema
}

type JsonDiffSchemaFromOASOptions = {
  beforeSource: unknown
  afterSource: unknown
  path: PropertyKey[]
  circular?: boolean
}

export function prepareJsonDiffSchemaFromOAS(options: JsonDiffSchemaFromOASOptions) {
  const { beforeSource, afterSource, path, circular = false } = options
  const beforeOperation = removeComponents(beforeSource)
  const afterOperation = removeComponents(afterSource)
  const mergedDocument = apiDiff(beforeOperation, afterOperation, {
    ...DEFAULT_NORMALIZE_OPTIONS,
    beforeSource: beforeSource,
    afterSource: afterSource,
    mode: COMPARE_MODE_OPERATION,
    metaKey: DIFF_META_KEY,
    onRefResolveError: (message: string, path: PropertyKey[], ref: string) => {
      console.debug([
        '[ASV] [Ref Resolve Error]',
        `Message: ${message}`,
        `JSON path: ${path}`,
        `Ref: ${ref}`,
      ].join('\n'))
    },
    onMergeError: (message: string, path: PropertyKey[], values: any[]) => {
      console.debug([
        '[ASV] [Merge Error]',
        `Message: ${message}`,
        `JSON path: ${path}`,
        `Values: ${JSON.stringify(values)}`,
      ].join('\n'))
    },
    onUnifyError: (message: string, path: PropertyKey[], value: any, cause: unknown) => {
      console.debug([
        '[ASV] [Unify Error]',
        `Message: ${message}`,
        `JSON path: ${path}`,
        `Values: ${JSON.stringify(value)}`,
        `Cause: ${cause}`,
      ].join('\n'))
    },
    onValidateError: (message: string, path: PropertyKey[], value: any, cause: unknown) => {
      console.debug([
        '[ASV] [Validate Error]',
        `Message: ${message}`,
        `JSON path: ${path}`,
        `Values: ${JSON.stringify(value)}`,
        `Cause: ${cause}`,
      ].join('\n'))
    },
  }).merged as any
  const mergedSchema = ObjectUtils.get(mergedDocument, path)
  if (circular && isObject(mergedSchema)) {
    mergedSchema.toJSON = () => stringifyCyclicJso(mergedSchema)
  }
  return mergedSchema
}

function removeComponents(source: unknown): unknown {
  if (source && isObject(source) && 'components' in source) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { components, ...rest } = source
    return rest
  }

  return source
}

export type JsonDiffSchemaOptions = {
  beforeSchema?: unknown,
  afterSchema: unknown,
  beforeAdditionalComponents?: Record<PropertyKey, unknown>
  afterAdditionalComponents?: Record<PropertyKey, unknown>
  target: OASTarget,
  circular?: boolean
}

export function prepareJsonDiffSchema(options: JsonDiffSchemaOptions): unknown {
  const {
    beforeSchema,
    afterSchema,
    beforeAdditionalComponents = {},
    afterAdditionalComponents = {},
    target,
    circular = false,
  } = options

  const beforeDocument = oas3TemplateInstance()
  beforeDocument.components.schemas.__Substitution__ = beforeSchema
  beforeDocument.components = mergeComponents(beforeDocument.components, beforeAdditionalComponents)
  const afterDocument = oas3TemplateInstance()
  afterDocument.components.schemas.__Substitution__ = afterSchema
  afterDocument.components = mergeComponents(afterDocument.components, afterAdditionalComponents)

  const mergedDocument = apiDiff(beforeDocument, afterDocument, {
    ...DEFAULT_NORMALIZE_OPTIONS,
    beforeSource: beforeDocument,
    afterSource: afterDocument,
    metaKey: DIFF_META_KEY,
  }).merged as any
  const mergedSchema = getSchemaByTarget(mergedDocument, target)
  if (circular && isObject(mergedSchema)) {
    mergedSchema.toJSON = () => stringifyCyclicJso(mergedSchema)
  }
  return mergedSchema
}

export type GraphApiSchemaOptions = {
  source: unknown
  circular?: boolean
}

export function prepareGraphApiSchema(options: GraphApiSchemaOptions): unknown {
  const { source, circular = false } = options
  const normalizedSchema = normalize(source, {
    syntheticTitleFlag: syntheticTitleFlag,
    unify: true,
    validate: true,
    liftCombiners: true,
  })
  const mergedSchema = denormalize(normalizedSchema, {
    syntheticTitleFlag: syntheticTitleFlag,
    unify: true,
    validate: true,
    liftCombiners: true,
  })
  if (circular && isObject(mergedSchema)) {
    mergedSchema.toJSON = () => stringifyCyclicJso(mergedSchema)
  }
  return mergedSchema
}

export type GraphApiDiffSchemaOptions = {
  beforeSource?: unknown
  afterSource: unknown
  circular?: boolean
}

export function prepareGraphApiDiffSchema(options: GraphApiDiffSchemaOptions): unknown {
  const { beforeSource, afterSource, circular = false } = options
  const mergedSource = apiDiff(beforeSource, afterSource, {
    beforeSource,
    afterSource,
    syntheticTitleFlag: syntheticTitleFlag,
    metaKey: DIFF_META_KEY,
    validate: true,
    liftCombiners: true,
    unify: true,
  }).merged
  if (circular && isObject(mergedSource)) {
    mergedSource.toJSON = () => stringifyCyclicJso(mergedSource)
  }
  return mergedSource
}

export function generateSyntheticObjectPropsFromArray(...arr: Record<PropertyKey, unknown>[]): Record<PropertyKey, unknown> {
  const object: Record<PropertyKey, unknown> = {}
  for (let i = 0; i < arr.length; i++) {
    object[`prop${i}`] = arr[i]
  }
  return object
}