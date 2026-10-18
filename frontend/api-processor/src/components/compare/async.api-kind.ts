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
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  ApihubApiCompatibilityKind,
} from '../../consts'
import { getApiKindProperty } from '../document'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { ApiKindValueAtFactory } from './api-kind.types'
import { toApiKind } from './api-kind.utils'

const ROOT_PATH_LENGTH = 0
const ASYNC_OPERATION_PATH_LENGTH = 2 // operations/<operationId>
const ASYNC_CHANNEL_PATH_LENGTH = 2   // channels/<channelId>

/**
 * Resolve effective api-kind for one side (before or after): operation overrides channel, channel overrides default (bwc).
 */
const resolveEffectiveApiKind = (
  operationKind: ApihubApiCompatibilityKind | undefined,
  channelKind: ApihubApiCompatibilityKind | undefined,
  documentKind: ApihubApiCompatibilityKind,
): ApihubApiCompatibilityKind => {
  return operationKind ?? channelKind ?? documentKind
}

/**
 * Answers the api kind scope element for AsyncAPI documents.
 *
 * For each side (before/after) the effective api-kind is resolved independently
 * with priority: operation x-api-kind > channel x-api-kind > default (bwc).
 * If at least one side's effective api-kind is no-bwc, the change is classified
 * as no-bwc, and the reclassification rule softens breaking to risky there; otherwise it stays bwc.
 *
 * The provider receives normalized before/after objects where $refs are resolved,
 * so operation.channel is the resolved channel object with all its properties.
 *
 * - root: defaults to bwc (document-level api-kind reserved for future use)
 * - operations/<operationId>: effective api-kind per side (operation overrides channel, channel overrides default)
 * - channels/<channelId>: channel's own x-api-kind per side
 */
export const createAsyncApiKindValueAt: ApiKindValueAtFactory = (
  prevDocumentApiKind = APIHUB_API_COMPATIBILITY_KIND_BWC,
  currDocumentApiKind = APIHUB_API_COMPATIBILITY_KIND_BWC,
) => {
  const documentApiKind = toApiKind(prevDocumentApiKind, currDocumentApiKind)

  return ({ path, beforeJso, afterJso }): ApihubApiCompatibilityKind | undefined => {
    const pathLength = path.length

    if (pathLength === ROOT_PATH_LENGTH) {
      return documentApiKind
    }

    const [firstSegment] = path

    // operations/<operationId>: effective api-kind per side (operation overrides channel, channel overrides default bwc)
    if (firstSegment === 'operations' && pathLength === ASYNC_OPERATION_PATH_LENGTH) {
      if (!beforeJso && !afterJso) { return undefined }

      const beforeChannelKind = getApiKindProperty((beforeJso as AsyncAPIV3.OperationObject | undefined)?.channel)
      const afterChannelKind = getApiKindProperty((afterJso as AsyncAPIV3.OperationObject | undefined)?.channel)

      const beforeOperationKind = getApiKindProperty(beforeJso)
      const afterOperationKind = getApiKindProperty(afterJso)

      const beforeEffective = resolveEffectiveApiKind(beforeOperationKind, beforeChannelKind, prevDocumentApiKind)
      const afterEffective = resolveEffectiveApiKind(afterOperationKind, afterChannelKind, currDocumentApiKind)

      return toApiKind(beforeEffective, afterEffective)
    }

    // channels/<channelId>: channel's own x-api-kind per side
    if (firstSegment === 'channels' && pathLength === ASYNC_CHANNEL_PATH_LENGTH) {
      if (!beforeJso && !afterJso) { return undefined }

      const beforeChannelKind = getApiKindProperty(beforeJso) ?? APIHUB_API_COMPATIBILITY_KIND_BWC
      const afterChannelKind = getApiKindProperty(afterJso) ?? APIHUB_API_COMPATIBILITY_KIND_BWC

      return toApiKind(beforeChannelKind, afterChannelKind)
    }

    return undefined
  }
}
