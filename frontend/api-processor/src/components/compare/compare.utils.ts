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
  ChangeSummary,
  CompareContext,
  DIFF_TYPES,
  ImpactedOperationSummary,
  OperationChangesMetadata,
  OperationId,
  OperationsApiType,
  OperationTypes,
  ResolvedOperation,
  ResolvedVersionOperationsHashMap,
  VersionCache,
} from '../../types'
import { BUILD_TYPE, EMPTY_CHANGE_SUMMARY, MESSAGE_SEVERITY } from '../../consts'
import { convertToSlug, takeIfDefined } from '../../utils'
import { normalizePath } from '../../utils/builder'

export const totalChanges = (changeSummary?: ChangeSummary): number => {
  return changeSummary
    ? Object.values(changeSummary).reduce((acc, current) => acc + current, 0)
    : 0
}

export function calculateTotalChangeSummary(
  summaries: ChangeSummary[],
): ChangeSummary {
  return summaries.reduce((totalSummary, currentSummary) => {
    for (const key of DIFF_TYPES) {
      totalSummary[key] += currentSummary[key]
    }
    return totalSummary
  }, { ...EMPTY_CHANGE_SUMMARY })
}

export function calculateTotalImpactedSummary(
  summaries: ImpactedOperationSummary[],
): ChangeSummary {
  return summaries.reduce((totalSummary, currentSummary) => {
    for (const key of DIFF_TYPES) {
      totalSummary[key] += currentSummary[key] ? 1 : 0
    }
    return totalSummary
  }, { ...EMPTY_CHANGE_SUMMARY })
}

export function getOperationTags(operation: ResolvedOperation): string[] {
  return operation?.tags || operation?.metadata?.tags || []
}

export function getUniqueApiTypesFromVersions(
  prevVersion: VersionCache | null,
  currVersion: VersionCache | null,
): Set<OperationsApiType> {
  const [prevOperationTypesData, currOperationTypesData] = getOperationTypesFromTwoVersions(prevVersion, currVersion)

  const prevOperationTypes = prevOperationTypesData.map(({ apiType }) => apiType)
  const currOperationTypes = currOperationTypesData.map(({ apiType }) => apiType)

  return new Set(
    prevOperationTypes.concat(currOperationTypes),
  )
}

export function getOperationTypesFromTwoVersions(
  prevVersion: VersionCache | null,
  currVersion: VersionCache | null,
): [OperationTypes[], OperationTypes[]] {
  return [prevVersion?.operationTypes || [], currVersion?.operationTypes || []]
}

type OperationIdWithoutGroupPrefix = string
export type OperationIdentityMap = Record<OperationIdWithoutGroupPrefix, OperationId>

export function getOperationsHashMapByApiType(
  currentApiType: OperationsApiType,
  operationTypes: OperationTypes[],
  operationIdentityMap: OperationIdentityMap,
  ctx: CompareContext,
  areOperationsFromCurrentVersion: boolean = false,
): ResolvedVersionOperationsHashMap {
  const resolvedHashMap = { ...operationTypes.find(({ apiType: type }) => type === currentApiType)?.operations || {} }
  const { buildType, currentGroup, previousGroup } = ctx.config

  // Handle prefix group changelog case
  if (buildType === BUILD_TYPE.PREFIX_GROUPS_CHANGELOG) {
    if (!currentGroup || !previousGroup) {
      ctx.notifications.push({
        severity: MESSAGE_SEVERITY.Warning,
        message: `Build type is prefix group changelog, but one of the groups is not provided: currentGroup=${currentGroup}, previousGroup=${previousGroup}`,
      })
      return resolvedHashMap
    }

    const groupSlug = convertToSlug(areOperationsFromCurrentVersion ? currentGroup : previousGroup)
    const newHashMap: ResolvedVersionOperationsHashMap = {}

    // Process each operation
    for (const [operationId, dataHash] of Object.entries(resolvedHashMap)) {
      if (operationId.startsWith(groupSlug)) {
        const changedOperationId = operationId.substring(groupSlug.length)
        newHashMap[changedOperationId] = dataHash
        operationIdentityMap[changedOperationId] = operationId
      }
    }

    return newHashMap
  }

  // Handle path parameter normalization case
  const newHashMap: ResolvedVersionOperationsHashMap = {}
  for (const [operationId, dataHash] of Object.entries(resolvedHashMap)) {
    // Get operation metadata to normalize the path
    const operation = operationTypes.find(({ apiType: type }) => type === currentApiType)
      ?.operations_metadata?.[operationId]
    
    if (operation?.path && operation?.method) {
      const normalizedPath = normalizePath(operation.path)
      const normalizedId = `${operation.method.toLowerCase()}-${normalizedPath}`
      newHashMap[normalizedId] = dataHash
      operationIdentityMap[normalizedId] = operationId
    } else {
      newHashMap[operationId] = dataHash
      operationIdentityMap[operationId] = operationId
    }
  }

  return newHashMap
}

export function getOperationMetadata(operation: ResolvedOperation): OperationChangesMetadata {
  return {
    title: operation.title,
    tags: getOperationTags(operation),

    // api specific
    ...takeIfDefined({ method: operation.metadata?.method }),
    ...takeIfDefined({ path: operation.metadata?.path }),
    ...takeIfDefined({ type: operation.metadata?.type }),
  }
}

export function takeSubstringIf(condition: boolean, value: string, startIndex: number): string {
  if (!condition) {
    return value
  }

  return value.substring(startIndex)
}

/**
 * Normalizes a path by replacing path parameters with a placeholder
 * regardless of the parameter name
 * e.g. /users/{userId}/posts/{postId} -> /users/{param}/posts/{param}
 */
export function normalizePath(path: string): string {
  return path.replace(/\{[^}]+\}/g, '{param}')
}

/**
 * Gets a normalized operation identifier that is resilient to path parameter renaming
 */
export function getNormalizedOperationId(operationId: string, metadata?: { path?: string, method?: string }): string {
  // If no path/method metadata, return original ID
  if (!metadata?.path || !metadata?.method) {
    return operationId
  }

  // Create normalized ID from method and normalized path using existing normalizePath utility
  const normalizedPath = normalizePath(metadata.path)
  return `${metadata.method.toLowerCase()}-${normalizedPath}`
}
