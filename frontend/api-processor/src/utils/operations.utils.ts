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

import { ApiOperation, BuildResult, OperationIdNormalizer } from '../types'
import { GraphApiComponents, GraphApiDirectiveDefinition } from '@netcracker/qubership-apihub-graphapi'
import { OpenAPIV3 } from 'openapi-types'
import { isObject } from './objects'
import { IGNORE_PATH_PARAM_UNIFIED_PLACEHOLDER, slugify } from './document'
import { removeFirstSlash } from './builder'
import { Diff, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { matchPaths, OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE } from '@netcracker/qubership-apihub-api-unifier'
import { DirectiveLocation } from 'graphql/language'
import { HTTP_METHODS_SET } from '../consts'

export function getOperationsList(buildResult: BuildResult): ApiOperation[] {
  return [...buildResult.operations.values()]
}

export function convertToSlug(text: string): string {
  return slugify(removeFirstSlash(text))
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
  return operationDiff.action === DiffAction.remove && !!matchPaths(operationDiff.beforeDeclarationPaths, [[OPEN_API_PROPERTY_PATHS, PREDICATE_ANY_VALUE]])
}

export const isValidHttpMethod = (method: string): method is OpenAPIV3.HttpMethods => {
  return HTTP_METHODS_SET.has(method)
}

export const calculateNormalizedOperationId: OperationIdNormalizer = (operation) => {
  const { metadata: { path, method } } = operation
  return slugify(`${path}-${method}`, [], IGNORE_PATH_PARAM_UNIFIED_PLACEHOLDER)
}

export const calculateOperationId = (
  basePath: string,
  key: string,
  path: string,
): string => {
  const operationPath = basePath + path
  return slugify(`${removeFirstSlash(operationPath)}-${key}`)
}
