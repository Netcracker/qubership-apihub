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
  OperationId,
  OperationsApiType,
  OperationType,
  ResolvedVersionDocument,
  VersionCache,
  VersionParams,
  VersionsComparison,
} from '../../types'
import {
  calculateTotalImpactedSummary,
  createPairOperationsMap,
  getUniqueApiTypesFromVersions,
  normalizeOperationIds,
} from './compare.utils'
import {
  calculateApiAudienceTransitions,
  calculateChangeSummary,
  calculateDiffId,
  difference,
  executeInBatches,
  getSplittedVersionKey,
  intersection,
  removeFirstSlash,
  removeObjectDuplicates,
  slugify,
} from '../../utils'
import { asyncDebugPerformance, DebugPerformanceContext } from '../../utils/logs'

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
  const { batchSize, versionOperationsResolver, versionDocumentsResolver, rawDocumentResolver } = ctx

  const apiBuilder = ctx.apiBuilders.find((builder) => apiType === builder.apiType)
  if (!apiBuilder) { return null }

  const { operations: prevOperations = [] } = await versionOperationsResolver(apiType, prev?.version ?? '', prev?.packageId ?? '', undefined, false) || {}
  const { operations: currOperations = [] } = await versionOperationsResolver(apiType, curr?.version ?? '', curr?.packageId ?? '', undefined, false) || {}

  const [prevOperationIds, prevNormalizedOperationIdToOriginal] = normalizeOperationIds(prevOperations, apiBuilder)
  const [currOperationIds, currNormalizedOperationIdToOriginal] = normalizeOperationIds(currOperations, apiBuilder)

  const added = difference(currOperationIds, prevOperationIds)
  const removed = difference(prevOperationIds, currOperationIds)
  const rest = intersection(prevOperationIds, currOperationIds)

  const { version: prevVersion, packageId: prevPackageId } = prev ?? { version: '', packageId: '' }
  const { version: currVersion, packageId: currPackageId } = curr ?? { version: '', packageId: '' }

  const { documents: prevDocuments } = await versionDocumentsResolver(prev?.version ?? '', prev?.packageId ?? '', apiType) ?? { documents: [] }
  const { documents: unfilteredCurrDocuments } = await versionDocumentsResolver(curr?.version ?? '', curr?.packageId ?? '', apiType) ?? { documents: [] }
  // todo this filters out files that are not in build config, but config.files is stored between tests and that breaks the '[Response] Should be non-breaking if response code changed in case' test
  // const currDocuments = ctx.config.files ? unfilteredCurrDocuments.filter(({fileId}) => ctx.config.files?.find((file) => file.fileId === fileId)) : unfilteredCurrDocuments
  const currDocuments = unfilteredCurrDocuments

  const pairedRestDocs: Map<ResolvedVersionDocument, ResolvedVersionDocument> = new Map()
  for (const normalizedOperationId of rest) {
    const prevOperationId = prevNormalizedOperationIdToOriginal[normalizedOperationId]
    const currOperationId = currNormalizedOperationIdToOriginal[normalizedOperationId]

    const prevDocumentId = prevOperations.find((operation) => operation.operationId === prevOperationId)?.documentId
    const currDocumentId = currOperations.find((operation) => operation.operationId === currOperationId)?.documentId
    const prevDoc = prevDocuments.find(document => document.slug === prevDocumentId)
    const currDoc = currDocuments.find(document => document.slug === currDocumentId)

    if (!prevDoc || !currDoc) {
      throw new Error('should not happen')
    }

    if (pairedRestDocs.get(prevDoc) === currDoc) {
      continue
    }
    pairedRestDocs.set(prevDoc, currDoc)
  }

  const pairedDocs: [ResolvedVersionDocument | undefined, ResolvedVersionDocument | undefined][] = [...pairedRestDocs.entries()]
  const qwe = [...new Set(added.map((normalizedOperationId) => {
    const operationId = currNormalizedOperationIdToOriginal[normalizedOperationId]
    const currDocumentId = currOperations.find((operation) => operation.operationId === operationId)?.documentId
    return currDocuments.find(document => document.slug === currDocumentId)
  }))]
  for (const currDoc of qwe) {
    pairedDocs.push([undefined, currDoc])
  }

  const asd = [...new Set(removed.map((normalizedOperationId) => {
    const operationId = prevNormalizedOperationIdToOriginal[normalizedOperationId]
    const prevDocumentId = prevOperations.find((operation) => operation.operationId === operationId)?.documentId
    return prevDocuments.find(document => document.slug === prevDocumentId)
  }))]
  for (const prevDoc of asd) {
    pairedDocs.push([prevDoc, undefined])
  }

  // todo > 1 is a hack for before\after files naming, docs matching approach is not yet defined
  // const pairedDocs = prevDocuments.map((prevDoc) => [prevDoc, currDocuments.length > 1 ? currDocuments.find(({ fileId }) => fileId === prevDoc.fileId) : currDocuments[0]])

  const { currentGroup, previousGroup } = ctx.config
  const currGroupSlug = slugify(removeFirstSlash(currentGroup || ''))
  const prevGroupSlug = slugify(removeFirstSlash(previousGroup || ''))

  const operationsMap = createPairOperationsMap(currGroupSlug, prevGroupSlug, currOperations, prevOperations, apiBuilder)

  const operationChanges: OperationChanges[] = []
  const tags: string[] = []

  for (const [prevDoc, currDoc] of pairedDocs) {
    const pairContext: CompareOperationsPairContext = {
      notifications: ctx.notifications,
      rawDocumentResolver,
      versionDeprecatedResolver: ctx.versionDeprecatedResolver,
      previousVersion: prevVersion,
      currentVersion: currVersion,
      previousPackageId: prevPackageId,
      currentPackageId: currPackageId,
      currentGroup: currentGroup,
      previousGroup: previousGroup,
    }

    const {
      operationChanges: docsPairOperationChanges,
      tags: docsPairTags,
    } = await apiBuilder.compareDocuments!(apiType, operationsMap, prevDoc, currDoc, pairContext)

    operationChanges.push(...docsPairOperationChanges)
    tags.push(...docsPairTags)
  }

  const dedupedChanges = removeObjectDuplicates(operationChanges.flatMap(({ diffs }) => diffs), calculateDiffId)
  const changesSummary = calculateChangeSummary(dedupedChanges)
  const numberOfImpactedOperations = calculateTotalImpactedSummary(
    operationChanges.map(({ impactedSummary }) => impactedSummary),
  )

  const pairedOperationIds =
    Object.entries(operationsMap)
      .filter(([, { previous, current }]) => previous && current)
      .map(([, { previous, current }]) => [previous?.operationId, current?.operationId] as [OperationId, OperationId])

  const apiAudienceTransitions: ApiAudienceTransition[] = []
  // todo: convert from objects analysis to apihub-diff result analysis after the "info" section participates in the comparison of operations
  await asyncDebugPerformance('[ApiAudience]', async () => await executeInBatches(pairedOperationIds, async (operationsBatch) => {
    const previousBatch = operationsBatch.map(([prevOperationId]) => prevOperationId)
    const currentBatch = operationsBatch.map(([, currOperationId]) => currOperationId)
    const { operations: currOperationsWithoutData = [] } = await versionOperationsResolver(apiType, currVersion, currPackageId, previousBatch, false) || {}
    const { operations: prevOperationsWithoutData = [] } = await versionOperationsResolver(apiType, prevVersion, prevPackageId, currentBatch, false) || {}

    const pairOperationsMap = createPairOperationsMap(currGroupSlug, prevGroupSlug, currOperationsWithoutData, prevOperationsWithoutData, apiBuilder)
    Object.values(pairOperationsMap).forEach((pair) => {
      calculateApiAudienceTransitions(pair.current, pair.previous, apiAudienceTransitions)
    })
  }, batchSize), debugCtx)

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
