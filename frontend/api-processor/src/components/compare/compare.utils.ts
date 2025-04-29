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
  ApiBuilder,
  ChangeSummary,
  CompareContext,
  DIFF_TYPES,
  ImpactedOperationSummary,
  NormalizedOperationId,
  OperationChangesMetadata,
  OperationId,
  OperationsApiType,
  OperationTypes,
  ResolvedOperation,
  ResolvedVersionOperationsHashMap,
  VersionCache,
} from '../../types'
import { BUILD_TYPE, EMPTY_CHANGE_SUMMARY, MESSAGE_SEVERITY } from '../../consts'
import {
  convertToSlug,
  IGNORE_PATH_PARAM_UNIFIED_PLACEHOLDER,
  NormalizedPath,
  slugify,
  takeIfDefined,
} from '../../utils'
import { REST_API_TYPE } from '../../apitypes'
import { OpenAPIV3 } from 'openapi-types'

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
  apiBuilder: ApiBuilder,
  operations: ResolvedOperation[],
  ctx: CompareContext,
  areOperationsFromCurrentVersion: boolean = false,
): [ResolvedVersionOperationsHashMap, OperationIdentityMap] {
  const { buildType, currentGroup, previousGroup } = ctx.config
  const resolvedHashMap: ResolvedVersionOperationsHashMap = {}
  const normalizedToOriginalOperationIdMap: Record<NormalizedOperationId | OperationId, OperationId> = {}

  for (const operation of operations) {
    const { operationId, dataHash } = operation
    const normalizedOperationId = apiBuilder.createNormalizedOperationId?.(operation) ?? operationId
    resolvedHashMap[normalizedOperationId] = dataHash
    normalizedToOriginalOperationIdMap[normalizedOperationId] = operationId
  }

  if (buildType !== BUILD_TYPE.PREFIX_GROUPS_CHANGELOG) {
    return [resolvedHashMap, normalizedToOriginalOperationIdMap]
  }

  if (!currentGroup || !previousGroup) {
    ctx.notifications.push({
      severity: MESSAGE_SEVERITY.Warning,
      message: `Build type is prefix group changelog, but one of the groups is not provided: currentGroup=${currentGroup}, previousGroup=${previousGroup}`,
    })
    return [resolvedHashMap, normalizedToOriginalOperationIdMap]
  }

  const changedIdToOriginal: OperationIdentityMap = {}

  for (const [operationId, dataHash] of Object.entries(resolvedHashMap)) {
    Reflect.deleteProperty(resolvedHashMap, operationId)

    const groupSlug = convertToSlug(areOperationsFromCurrentVersion ? currentGroup : previousGroup)

    if (operationId.startsWith(groupSlug)) {
      const changedOperationId = operationId.substring(groupSlug.length)
      resolvedHashMap[changedOperationId] = dataHash
      changedIdToOriginal[changedOperationId] = normalizedToOriginalOperationIdMap[operationId]
    }
  }

  return [resolvedHashMap, changedIdToOriginal]
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
