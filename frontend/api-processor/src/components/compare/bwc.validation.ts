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

import {
  APIHUB_API_COMPATIBILITY_KIND_BWC, APIHUB_API_COMPATIBILITY_KIND_NO_BWC, ApihubApiCompatibilityKind,
  SPECIFICATION_EXTENSION_PREFIX,
} from '../../consts'
import { isObject, isValidHttpMethod } from '../../utils'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import {
  ApiCompatibilityKind,
  ApiCompatibilityScopeFunction,
  API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE,
  API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE,
} from '@netcracker/qubership-apihub-api-diff'
import { getApiKindProperty } from '../document'
import { OpenAPIV3 } from 'openapi-types'

export const calculateOperationApiCompatibilityKind = (
  beforeOperationObject: OpenAPIV3.OperationObject | undefined,
  afterOperationObject: OpenAPIV3.OperationObject | undefined,
  beforeDefaultApiKind: ApihubApiCompatibilityKind,
  afterDefaultApiKind: ApihubApiCompatibilityKind,
): ApiCompatibilityKind => {
  const beforeKind = getApiKindProperty(beforeOperationObject, beforeDefaultApiKind)
  const afterKind = getApiKindProperty(afterOperationObject, afterDefaultApiKind)
  const isOperationRemoved = isObject(beforeOperationObject) && !isObject(afterOperationObject)

  // Handle operation removal: compatibility depends on the removed operation's kind
  if (isOperationRemoved) {
    return beforeKind === APIHUB_API_COMPATIBILITY_KIND_NO_BWC
      ? API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE
      : API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE
  }

  if (beforeKind === APIHUB_API_COMPATIBILITY_KIND_NO_BWC || afterKind === APIHUB_API_COMPATIBILITY_KIND_NO_BWC) {
    return API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE
  }

  return API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE
}

export const getMethodsApiCompatibilityKind = (pathItemObject: OpenAPIV3.PathItemObject, prevDocumentApiKind: ApihubApiCompatibilityKind): ApiCompatibilityKind => {
  if (checkAllMethodsHaveSameApiKind(pathItemObject, APIHUB_API_COMPATIBILITY_KIND_NO_BWC)) {
    return API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE
  }

  if (checkAllMethodsHaveSameApiKind(pathItemObject, APIHUB_API_COMPATIBILITY_KIND_BWC)) {
    return API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE
  }

  return prevDocumentApiKind === APIHUB_API_COMPATIBILITY_KIND_NO_BWC
    ? API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE
    : API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE
}

const hasApiKind = (obj: OpenAPIV3.OperationObject, apiKind: ApihubApiCompatibilityKind): boolean => {
  return getApiKindProperty(obj) === apiKind
}

const isSpecificationExtension = (propertyKey?: PropertyKey): boolean => {
  return propertyKey?.toString()?.startsWith(SPECIFICATION_EXTENSION_PREFIX) ?? false
}

// If a path object is removed/added, we must ensure every HTTP method under it
// is explicitly marked NO_BWC before treating the change as risky.
const checkAllMethodsHaveSameApiKind = (obj: OpenAPIV3.PathItemObject, apiKind: ApihubApiCompatibilityKind): boolean => {
  if (!isObject(obj)) {
    return false
  }
  const entries = Object.entries(obj)

  return entries.length > 0 &&
    entries.filter(([key, value]) => isValidHttpMethod(key) && isObject(value))
      .every(([key, value]) => hasApiKind(value as OpenAPIV3.OperationObject, apiKind))
}

const ROOT_PATH_LENGTH = 0
const PATH_ITEM_PATH_LENGTH = 2
const OPERATION_OBJECT_PATH_LENGTH = 3

export const createApihubApiCompatibilityScopeFunction = (
  prevDocumentApiKind: ApihubApiCompatibilityKind = APIHUB_API_COMPATIBILITY_KIND_BWC,
  currDocumentApiKind: ApihubApiCompatibilityKind = APIHUB_API_COMPATIBILITY_KIND_BWC,
): ApiCompatibilityScopeFunction => {
  const defaultApiCompatibilityKind = (prevDocumentApiKind === APIHUB_API_COMPATIBILITY_KIND_NO_BWC || currDocumentApiKind === APIHUB_API_COMPATIBILITY_KIND_NO_BWC)
    ? API_COMPATIBILITY_KIND_NOT_BACKWARD_COMPATIBLE
    : API_COMPATIBILITY_KIND_BACKWARD_COMPATIBLE

  return (
    path?: JsonPath,
    beforeJson?: unknown,
    afterJson?: unknown,
  ): ApiCompatibilityKind | undefined => {
    const pathLength = path?.length ?? 0
    /*
     * Calculating Api Kind for the entire document as the default
     * If there is a NO_BWC marker on:
     * - Version labels and Document labels
     * - Document API info section
     */
    if (pathLength === ROOT_PATH_LENGTH) {
      return defaultApiCompatibilityKind
    }
    /*
    * We check paths at level 2: paths/<path> and operation level 3: paths/<path>/<method>
    * Level 2: When an entire path item is deleted/added
    * Level 3: When individual operations are deleted/added
     */
    const isFirstPathSegmentPaths = path?.[0] === 'paths'
    if (!isFirstPathSegmentPaths) {
      return undefined
    }
    const beforeExists = isObject(beforeJson)
    const afterExists = isObject(afterJson)

    if (!beforeExists && !afterExists) {
      return undefined
    }

    if (pathLength === PATH_ITEM_PATH_LENGTH) {
      // case remove: when a node disappears, api-diff emits REMOVE diffs for each
      // operation. We only mark the deletion as NO_BWC if all removed methods were
      // explicitly flagged NO_BWC, keeping deletions consistent with declared scope.
      if (beforeExists && !afterExists) {
        const pathItemObject = beforeJson as OpenAPIV3.PathItemObject
        return getMethodsApiCompatibilityKind(pathItemObject, prevDocumentApiKind)
      }
    }

    if (pathLength === OPERATION_OBJECT_PATH_LENGTH) {
      const propertyKey = path?.at(-1)
      if (isSpecificationExtension(propertyKey)) {
        return undefined
      }

      const beforeOperationObject = beforeJson as OpenAPIV3.OperationObject | undefined
      const afterOperationObject = afterJson as OpenAPIV3.OperationObject | undefined

      return calculateOperationApiCompatibilityKind(beforeOperationObject, afterOperationObject, prevDocumentApiKind, currDocumentApiKind)
    }

    return undefined
  }
}
