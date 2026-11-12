import { APIHUB_API_COMPATIBILITY_KIND_BWC, ApihubApiCompatibilityKind } from '../../consts'
import { isObject } from '../../utils'
import { GRAPHQL_TYPE_KEYS } from '../../apitypes/graphql/graphql.consts'
import { ApiKindValueAtFactory } from './api-kind.types'
import { toApiKind } from './api-kind.utils'

const ROOT_PATH_LENGTH = 0
const GRAPHQL_OPERATION_PATH_LENGTH = 2 // queries|mutations|subscriptions/<operationName>

const OPERATION_ROOT_SEGMENTS: ReadonlySet<string> = new Set(GRAPHQL_TYPE_KEYS)

/**
 * Answers the api kind scope element for GraphQL documents.
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
export const createGraphqlApiKindValueAt: ApiKindValueAtFactory = (
  prevDocumentApiKind = APIHUB_API_COMPATIBILITY_KIND_BWC,
  currDocumentApiKind = APIHUB_API_COMPATIBILITY_KIND_BWC,
) => {
  const documentApiKind = toApiKind(prevDocumentApiKind, currDocumentApiKind)

  return ({ path, beforeJso, afterJso }): ApihubApiCompatibilityKind | undefined => {
    const pathLength = path.length

    if (pathLength === ROOT_PATH_LENGTH) {
      return documentApiKind
    }

    // queries|mutations|subscriptions/<operationName>
    if (pathLength === GRAPHQL_OPERATION_PATH_LENGTH && OPERATION_ROOT_SEGMENTS.has(String(path[0]))) {
      const beforeExists = isObject(beforeJso)
      const afterExists = isObject(afterJso)

      if (!beforeExists && !afterExists) {
        return undefined
      }

      if (beforeExists && !afterExists) {
        return toApiKind(prevDocumentApiKind)
      }

      return documentApiKind
    }

    return undefined
  }
}
