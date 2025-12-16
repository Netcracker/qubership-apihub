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

import { ApiDocument, ApiOperation, BuildResult, OperationIdNormalizer, VersionDocument } from '../types'
import { GraphApiComponents, GraphApiDirectiveDefinition } from '@netcracker/qubership-apihub-graphapi'
import { OpenAPIV3 } from 'openapi-types'
import { isObject } from './objects'
import { serializeDocument } from './document'
import { SLUG_OPTIONS_DOCUMENT_ID, SLUG_OPTIONS_NORMALIZED_OPERATION_ID, SLUG_OPTIONS_OPERATION_ID, slugify } from './slugify'
import { normalizePath, removeFirstSlash } from './builder'
import { Diff, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import {
  denormalize,
  matchPaths,
  NormalizeOptions,
  OPEN_API_PROPERTY_PATHS,
  PREDICATE_ANY_VALUE,
} from '@netcracker/qubership-apihub-api-unifier'
import { DirectiveLocation } from 'graphql/language'
import { HTTP_METHODS_SET } from '../consts'

export function getOperationsList(buildResult: BuildResult): ApiOperation[] {
  return [...buildResult.operations.values()]
}

// The function to remove components is used in several APIHUB libraries.
// In the future, we need to find a common place for it
export function removeComponents(source: object | undefined): unknown {
  const runtimeDirective = new Set([
    DirectiveLocation.QUERY,
    DirectiveLocation.MUTATION,
    DirectiveLocation.SUBSCRIPTION,
    DirectiveLocation.FIELD,
    DirectiveLocation.FRAGMENT_DEFINITION,
    DirectiveLocation.FRAGMENT_SPREAD,
    DirectiveLocation.INLINE_FRAGMENT,
    DirectiveLocation.VARIABLE_DEFINITION,
  ])
  if (source && 'components' in source) {
    const { components, ...rest } = source
    if (isObject(components)) {
      if ('directives' in components && isObject(components.directives)) {
        return {
          ...rest,
          components: {
            //temp solution until support for runtime directives is implemented
            directives: Object.fromEntries(
              Object.entries(components.directives as Record<string, GraphApiDirectiveDefinition>)
                .filter(([, directive]) => directive.locations.some(location => runtimeDirective.has(location))),
            ),
          },
        }
      }
      if ('securitySchemes' in components) {
        return {
          ...rest,
          components: {
            securitySchemes: components.securitySchemes,
          },
        }
      }
    }
    return rest
  }
  return source
}

function isGraphApiComponents(components: OpenAPIV3.ComponentsObject | GraphApiComponents): components is GraphApiComponents {
  return 'directives' in components
}

export function isOperationRemove(operationDiff: Diff): boolean {
  // length is 2 because json path has view like ['paths', '/test/element']
  return operationDiff.action === DiffAction.remove && !!matchPaths(operationDiff.beforeDeclarationPaths, [[OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE]])
}

export function isPathParamRenameDiff(diff: Diff): boolean {
  return diff.action === DiffAction.rename && !!matchPaths(diff.beforeDeclarationPaths, [[OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE]])
}

export const isValidHttpMethod = (method: string): method is OpenAPIV3.HttpMethods => {
  return HTTP_METHODS_SET.has(method)
}

/**
 * Calculates a normalized operation ID for an operation.
 * Normalized operation ID has path parameters encoded as *.
 *
 * @param basePath - The base path from servers configuration
 * @param path - The operation path
 * @param method - The HTTP method
 * @returns The normalized operation ID
 */
export const calculateNormalizedRestOperationId = (basePath: string, path: string, method: string): string => {
  const pathSlug = slugify(removeFirstSlash(normalizePath(basePath + path)), SLUG_OPTIONS_NORMALIZED_OPERATION_ID)
  return `${pathSlug}-${method.toLowerCase()}`  // method is added after slugify to avoid several consecutive hyphens collapsing into one
}

// We keep this function to be able to do data migration for operation groups
export const _calculateRestOperationIdV1 = (
  basePath: string,
  key: string,
  path: string,
): string => {
  const operationPath = basePath + path
  return slugify(`${removeFirstSlash(operationPath)}-${key}`, SLUG_OPTIONS_DOCUMENT_ID) //Document options here are intentional to keep the same format as the old operation ID
}

const _calculateRestOperationIdV2 = (
  basePath: string,
  path: string,
  method: string,
): string => {
  const pathSlug = slugify(removeFirstSlash(basePath + path), SLUG_OPTIONS_OPERATION_ID)
  return `${pathSlug}-${method.toLowerCase()}`  // method is added after slugify to avoid several consecutive hyphens collapsing into one
}

/**
 * Calculates a rest operation ID for an operation.
 * Operation Id is supposed to be safe to use in a URL without encoding
 * and safe for use as a filename
 *
 * @param basePath - The base path from servers configuration
 * @param path - The operation path
 * @param method - The HTTP method
 * @returns The rest operation ID
 */
export const calculateRestOperationId = (
  basePath: string,
  path: string,
  method: string,
): string => {
  return _calculateRestOperationIdV2(basePath, path, method)
}

export const calculateGraphqlOperationId = (
  operationType: string,
  operationName: string,
): string => {
  return slugify(`${operationType}-${operationName}`, SLUG_OPTIONS_OPERATION_ID)
}

export const restOperationIdNormalizer: OperationIdNormalizer = (operation) => {
  const { metadata: { path, method } } = operation
  return calculateNormalizedRestOperationId('', path, method)
}

export const createSerializedInternalDocument = (document: VersionDocument, effectiveDocument: ApiDocument, options: NormalizeOptions): void => {
  const {versionInternalDocument} = document
  if(!versionInternalDocument){
    return
  }
  versionInternalDocument.serializedVersionDocument = serializeDocument(denormalize(effectiveDocument, options) as ApiDocument)
}
