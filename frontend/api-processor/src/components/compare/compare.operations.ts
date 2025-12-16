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
  ComparisonDocument,
  ComparisonInternalDocument,
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
  createComparisonFileId, createComparisonInternalDocuments,
  createPairOperationsMap,
  getUniqueApiTypesFromVersions,
} from './compare.utils'
import {
  calculateApiAudienceTransitions,
  calculateChangeSummary,
  calculateDiffId,
  getSplittedVersionKey,
  removeFirstSlash,
  removeObjectDuplicates,
  SLUG_OPTIONS_OPERATION_ID,
  slugify,
} from '../../utils'
import { asyncDebugPerformance, DebugPerformanceContext, syncDebugPerformance } from '../../utils/logs'
import { validateApiProcessorVersion } from '../../validators'

export async function compareVersionsOperations(
  prev: VersionParams,
  curr: VersionParams,
  ctx: CompareContext,
  debugCtx?: DebugPerformanceContext,
): Promise<VersionsComparison> {
  const changes: OperationChanges[] = []
  const operationTypes: OperationType[] = []
  const comparisonDocuments: ComparisonDocument[] = []

  const { versionResolver } = ctx

  // resolve both versions
  const prevVersionData = prev && await versionResolver(...prev)
  const currVersionData = curr && await versionResolver(...curr)

  // validate api-processor version compatibility
  validateApiProcessorVersion(prevVersionData, 'Can\'t build the changelog if previous version was built using an outdated api-processor.')
  validateApiProcessorVersion(currVersionData, 'Can\'t build the changelog if current version was built using an outdated api-processor.')

  // compare operations of each type
  for (const apiType of getUniqueApiTypesFromVersions(prevVersionData, currVersionData)) {
    const [operationType, operationsChanges = [], operationsComparisonDocuments = []] = await asyncDebugPerformance(
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
    comparisonDocuments.push(...operationsComparisonDocuments)
  }

  const comparisonFileId = createComparisonFileId(prev, curr)
  const comparisonInternalDocuments = createComparisonInternalDocuments(comparisonDocuments, comparisonFileId)

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
    comparisonInternalDocuments,
  }
}

async function compareCurrentApiType(
  apiType: OperationsApiType,
  prev: VersionCache | null,
  curr: VersionCache | null,
  ctx: CompareContext,
  debugCtx?: DebugPerformanceContext,
): Promise<[OperationType, OperationChanges[], ComparisonDocument[]] | null> {
  const {
    versionOperationsResolver,
    rawDocumentResolver,
    config: { currentGroup = '', previousGroup = '' },
    normalizedSpecFragmentsHashCache,
  } = ctx
  const apiBuilder = ctx.apiBuilders.find((builder) => apiType === builder.apiType)
  if (!apiBuilder) { return null }

  const { version: prevVersion, packageId: prevPackageId } = prev ?? { version: '', packageId: '' }
  const { version: currVersion, packageId: currPackageId } = curr ?? { version: '', packageId: '' }

  const { operations: prevOperations = [] } = prev && await versionOperationsResolver(apiType, prevVersion, prevPackageId, undefined, false) || {}
  const { operations: currOperations = [] } = curr && await versionOperationsResolver(apiType, currVersion, currPackageId, undefined, false) || {}

  const previousGroupSlug = slugify(removeFirstSlash(previousGroup), SLUG_OPTIONS_OPERATION_ID)
  const currentGroupSlug = slugify(removeFirstSlash(currentGroup), SLUG_OPTIONS_OPERATION_ID)

  const prevOperationsWithPrefix = previousGroupSlug ? prevOperations.filter(operation => operation.operationId.startsWith(`${previousGroupSlug}`)) : prevOperations
  const currOperationsWithPrefix = currentGroupSlug ? currOperations.filter(operation => operation.operationId.startsWith(`${currentGroupSlug}`)) : currOperations

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
    normalizedSpecFragmentsHashCache: normalizedSpecFragmentsHashCache,
  }

  const operationsMap = createPairOperationsMap(previousGroupSlug, currentGroupSlug, prevOperationsWithPrefix, currOperationsWithPrefix, apiBuilder)
  const operationPairs = Object.values(operationsMap)
  const pairedDocs = await calculatePairedDocs(operationPairs, pairContext)
  const [operationChanges, uniqueDiffsForDocPairs, tags, comparisonDocuments] = await comparePairedDocs(operationsMap, pairedDocs, apiBuilder, pairContext)
  // Duplicates could happen in rare case when document for added/deleted operation was mapped to several documents in other version
  const uniqueOperationChanges = pairedDocs.length === 1 ? operationChanges
    : removeObjectDuplicates(
      operationChanges,
      (item) => `${item.apiType}:${item.operationId ?? ''}:${item.previousOperationId ?? ''}`,
    )

  // We only need to additionally deduplicate diffs if there are multiple document pairs
  // because diffs coming from the same apiDiff call are already deduplicated in comparePairedDocs
  // This is performance optimization for common case when there is only one document pair
  const uniqueDiffs = uniqueDiffsForDocPairs.length === 1 ? Array.from(uniqueDiffsForDocPairs[0])
    : removeObjectDuplicates(uniqueDiffsForDocPairs.flatMap(set => Array.from(set)), calculateDiffId)
  const changesSummary = calculateChangeSummary(uniqueDiffs)
  const numberOfImpactedOperations = calculateTotalImpactedSummary(
    uniqueOperationChanges.map(({ impactedSummary }) => impactedSummary),
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
      tags,
      apiAudienceTransitions,
    },
    uniqueOperationChanges,
    comparisonDocuments,
  ]
}
