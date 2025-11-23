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

import { OpenAPIV3 } from 'openapi-types'
import {
  WithAggregatedDiffs,
  WithDiffMetaRecord,
} from '../../types'
import { Diff, DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY } from '@netcracker/qubership-apihub-api-diff'
import { isPathParamRenameDiff } from '../../utils'
import { dump, getCustomTags, resolveApiAudience } from '../../utils/apihubSpecificationExtensions'

// Re-export shared utilities for backward compatibility
export { dump, getCustomTags, resolveApiAudience } //TODO: just use new utilities for REST

export const extractOpenapiVersionDiff = (doc: OpenAPIV3.Document): Diff[] => {
  const diff = (doc as WithDiffMetaRecord<OpenAPIV3.Document>)[DIFF_META_KEY]?.openapi
  return diff ? [diff] : []
}

export const extractPathParamRenameDiff = (doc: OpenAPIV3.Document, path: string): Diff[] => {
  const diff = (doc.paths as WithDiffMetaRecord<OpenAPIV3.PathsObject>)[DIFF_META_KEY]?.[path]
  return diff && isPathParamRenameDiff(diff) ? [diff] : []
}

export const extractRootServersDiffs = (doc: OpenAPIV3.Document): Diff[] => {
  const addOrRemoveServersDiff = (doc as WithDiffMetaRecord<OpenAPIV3.Document>)[DIFF_META_KEY]?.servers
  const serversInternalDiffs = (doc.servers as WithAggregatedDiffs<OpenAPIV3.ServerObject[]> | undefined)?.[DIFFS_AGGREGATED_META_KEY] ?? []
  return [
    ...(addOrRemoveServersDiff ? [addOrRemoveServersDiff] : []),
    ...serversInternalDiffs,
  ]
}

const extractSecurityDiffs = (source: WithDiffMetaRecord<{ security?: OpenAPIV3.SecurityRequirementObject[] }>): Diff[] => {
  const addOrRemoveSecurityDiff = source[DIFF_META_KEY]?.security
  const securityInternalDiffs = (source.security as WithAggregatedDiffs<OpenAPIV3.SecurityRequirementObject[]> | undefined)?.[DIFFS_AGGREGATED_META_KEY] ?? []
  return [
    ...(addOrRemoveSecurityDiff ? [addOrRemoveSecurityDiff] : []),
    ...securityInternalDiffs,
  ]
}

export const extractRootSecurityDiffs = (doc: OpenAPIV3.Document): Diff[] => {
  return extractSecurityDiffs(doc as WithDiffMetaRecord<OpenAPIV3.Document>)
}

export const extractOperationSecurityDiffs = (operation: OpenAPIV3.OperationObject): Diff[] => {
  return extractSecurityDiffs(operation as WithDiffMetaRecord<OpenAPIV3.OperationObject>)
}

export const extractSecuritySchemesNames = (security: OpenAPIV3.SecurityRequirementObject[]): Set<string> => {
  return new Set(security.flatMap(securityRequirement => Object.keys(securityRequirement)))
}

export const extractSecuritySchemesDiffs = (components: OpenAPIV3.ComponentsObject | undefined, securitySchemesNames: Set<string>): Diff[] => {
  if (!components || !components.securitySchemes) {
    return []
  }
  const result: Diff[] = []

  const addRemoveSecuritySchemesDiffs = (components.securitySchemes as WithDiffMetaRecord<Record<string, OpenAPIV3.SecuritySchemeObject>>)?.[DIFF_META_KEY]
  if (addRemoveSecuritySchemesDiffs) {
    for (const schemeName of securitySchemesNames) {
      const diff = addRemoveSecuritySchemesDiffs[schemeName]
      if (diff) {
        result.push(diff)
      }
    }
  }

  for (const schemeName of securitySchemesNames) {
    const securityScheme = components.securitySchemes[schemeName]
    if (securityScheme) {
      const aggregatedDiffs = (securityScheme as WithAggregatedDiffs<OpenAPIV3.SecuritySchemeObject>)?.[DIFFS_AGGREGATED_META_KEY] ?? []
      result.push(...aggregatedDiffs)
    }
  }


  return result
}

export function validateGroupPrefix(group: unknown, paramName: string): void {
  if (group === undefined) {
    return
  }

  if (typeof group !== 'string') {
    throw new Error(`${paramName} must be a string, received: ${typeof group}`)
  }

  if (group.length < 3 || !group.startsWith('/') || !group.endsWith('/')) {
    throw new Error(`${paramName} must begin and end with a "/" character and contain at least one meaningful character, received: "${group}"`)
  }
}
