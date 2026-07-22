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

import { APIHUB_API_COMPATIBILITY_KIND_BWC } from '../../consts'
import { isObject } from '../../utils'
import { JsonPath } from '@netcracker/qubership-apihub-json-crawl'
import { ApiCompatibilityKind } from '@netcracker/qubership-apihub-api-diff'
import { GRAPHQL_TYPE_KEYS } from '../../apitypes/graphql/graphql.consts'
import { ApiCompatibilityScopeFunctionFactory } from './bwc.validation.types'
import { toApiCompatibilityKind } from './bwc.validation.utils'

const ROOT_PATH_LENGTH = 0
const GRAPHQL_OPERATION_PATH_LENGTH = 2 // queries|mutations|subscriptions/<operationName>

const OPERATION_ROOT_SEGMENTS: ReadonlySet<string> = new Set(GRAPHQL_TYPE_KEYS)

/**
 * Creates an ApiCompatibilityScopeFunction for GraphQL documents.
 *
 * GraphQL api-kind is document-level only: there is no per-operation `x-api-kind`
 * in the SDL (out of scope), so every operation inherits the document
 * api-kind. Because of that this function never inspects per-node markers — it
 * uses the resolved document api-kinds directly.
 *
 * Classification (consistent with REST/async):
 * - modification (operation exists on both sides, an added operation, or a root-level
 *     document change): risky if EITHER the previous or the current document api-kind
 *     is no-bwc-like.
 * - removal (operation exists before, absent after): keyed on the PREVIOUS document
 *     api-kind.
 */
export const createGraphqlApiCompatibilityScopeFunction: ApiCompatibilityScopeFunctionFactory = (
  prevDocumentApiKind = APIHUB_API_COMPATIBILITY_KIND_BWC,
  currDocumentApiKind = APIHUB_API_COMPATIBILITY_KIND_BWC,
) => {
  const defaultApiCompatibilityKind = toApiCompatibilityKind(prevDocumentApiKind, currDocumentApiKind)

  return (
    path?: JsonPath,
    beforeJson?: unknown,
    afterJson?: unknown,
  ): ApiCompatibilityKind | undefined => {
    const pathLength = path?.length ?? 0

    if (pathLength === ROOT_PATH_LENGTH) {
      return defaultApiCompatibilityKind
    }

    // queries|mutations|subscriptions/<operationName>
    if (pathLength === GRAPHQL_OPERATION_PATH_LENGTH && OPERATION_ROOT_SEGMENTS.has(String(path?.[0]))) {
      const beforeExists = isObject(beforeJson)
      const afterExists = isObject(afterJson)

      if (!beforeExists && !afterExists) {
        return undefined
      }

      if (beforeExists && !afterExists) {
        return toApiCompatibilityKind(prevDocumentApiKind)
      }

      return defaultApiCompatibilityKind
    }

    return undefined
  }
}
