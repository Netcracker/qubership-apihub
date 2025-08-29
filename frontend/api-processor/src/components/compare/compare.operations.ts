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
  ApiAudienceTransition,
  CompareContext,
  CompareOperationsPairContext,
  OperationChanges,
  OperationsApiType,
  OperationType,
  VersionCache,
  VersionParams,
  VersionsComparison,
} from '../../types'
import {
  calculatePairedDocs,
  calculateTotalImpactedSummary,
  comparePairedDocs,
  createPairOperationsMap,
  getUniqueApiTypesFromVersions,
} from './compare.utils'
import {
  calculateApiAudienceTransitions,
  calculateChangeSummary,
  calculateDiffId,
  convertToSlug,
  getSplittedVersionKey,
  removeObjectDuplicates,
} from '../../utils'
import { asyncDebugPerformance, DebugPerformanceContext, syncDebugPerformance } from '../../utils/logs'

export async function compareVersionsOperations(
  prev: VersionParams,
  curr: VersionParams,
  ctx: CompareContext,
  debugCtx?: DebugPerformanceContext,
): Promise<VersionsComparison> {
  const changes: OperationChanges[] = []
  const operationTypes: OperationType[] = []

  const { versionResolver } = ctx

  // resolve all version with operation hashes
  const prevVersionData = prev && (await versionResolver(...prev) ?? { version: prev?.[0], packageId: prev?.[1] })
  const currVersionData = curr && (await versionResolver(...curr) ?? { version: curr?.[0], packageId: curr?.[1] })

  // compare operations of each type
  for (const apiType of getUniqueApiTypesFromVersions(prevVersionData, currVersionData)) {
    const [operationType, operationsChanges = []] = await asyncDebugPerformance(
      '[ApiType]',
      (innerDebugCtx) => compareCurrentApiType(apiType, prevVersionData, currVersionData, ctx, innerDebugCtx) ?? [],
      debugCtx,
      [apiType],
    ) ?? []

    if (!operationType) {
      continue
    }

    operationTypes.push(operationType)
    changes.push(...operationsChanges)
  }

  const comparisonFileId = [...prev || [], ...curr || []].filter(Boolean).join('_')

  const [currentVersion, currentRevision] = getSplittedVersionKey(currVersionData?.version)
  const [previousVersion, previousRevision] = getSplittedVersionKey(prevVersionData?.version)

  return {
    packageId: currVersionData?.packageId ?? '',
    version: currentVersion,
    revision: currentRevision,
    previousVersion: previousVersion,
    previousVersionRevision: previousRevision,
    previousVersionPackageId: prevVersionData?.packageId ?? '',
    operationTypes,
    fromCache: false,
    ...changes.length ? {
      comparisonFileId,
      data: changes,
    } : {},
  }
}

async function compareCurrentApiType(
  apiType: OperationsApiType,
  prev: VersionCache | null,
  curr: VersionCache | null,
  ctx: CompareContext,
  debugCtx?: DebugPerformanceContext,
): Promise<[OperationType, OperationChanges[]] | null> {
  const {
    versionOperationsResolver,
    rawDocumentResolver,
    config: { currentGroup = '', previousGroup = '' },
  } = ctx
  const apiBuilder = ctx.apiBuilders.find((builder) => apiType === builder.apiType)
  if (!apiBuilder) { return null }

  const { version: prevVersion, packageId: prevPackageId } = prev ?? { version: '', packageId: '' }
  const { version: currVersion, packageId: currPackageId } = curr ?? { version: '', packageId: '' }

  const { operations: prevOperations = [] } = await versionOperationsResolver(apiType, prevVersion, prevPackageId, undefined, false) || {}
  const { operations: currOperations = [] } = await versionOperationsResolver(apiType, currVersion, currPackageId, undefined, false) || {}

  const previousGroupSlug = convertToSlug(previousGroup)
  const currentGroupSlug = convertToSlug(currentGroup)

  const prevOperationsWithPrefix = previousGroupSlug ? prevOperations.filter(operation => operation.operationId.startsWith(`${previousGroupSlug}-`)) : prevOperations
  const currOperationsWithPrefix = currentGroupSlug ? currOperations.filter(operation => operation.operationId.startsWith(`${currentGroupSlug}-`)) : currOperations

  const pairContext: CompareOperationsPairContext = {
    apiType: apiType,
    notifications: ctx.notifications,
    rawDocumentResolver,
    versionDeprecatedResolver: ctx.versionDeprecatedResolver,
    versionDocumentsResolver: ctx.versionDocumentsResolver,
    previousVersion: prevVersion,
    currentVersion: currVersion,
    currentPackageId: currPackageId,
    previousPackageId: prevPackageId,
    previousGroup: previousGroup,
    currentGroup: currentGroup,
    previousGroupSlug: previousGroupSlug,
    currentGroupSlug: currentGroupSlug,
  }

  const operationsMap = createPairOperationsMap(previousGroupSlug, currentGroupSlug, prevOperationsWithPrefix, currOperationsWithPrefix, apiBuilder)
  const operationPairs = Object.values(operationsMap)
  const pairedDocs = await calculatePairedDocs(operationPairs, pairContext)
  const [operationChanges, tags] = await comparePairedDocs(operationsMap, pairedDocs, apiBuilder, pairContext)

  const dedupedChanges = removeObjectDuplicates(operationChanges.flatMap(({ diffs }) => diffs), calculateDiffId)
  const changesSummary = calculateChangeSummary(dedupedChanges)
  const numberOfImpactedOperations = calculateTotalImpactedSummary(
    operationChanges.map(({ impactedSummary }) => impactedSummary),
  )

  const apiAudienceTransitions: ApiAudienceTransition[] = []
  // todo: convert from objects analysis to apihub-diff result analysis after the "info" section participates in the comparison of operations
  syncDebugPerformance('[ApiAudience]',
    () => operationPairs.forEach((pair) => calculateApiAudienceTransitions(pair, apiAudienceTransitions)),
    debugCtx,
  )

  return [
    {
      apiType,
      changesSummary,
      numberOfImpactedOperations,
      tags: tags.sort(),
      apiAudienceTransitions,
    },
    operationChanges,
  ]
}
