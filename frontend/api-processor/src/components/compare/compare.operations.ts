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
  ResolvedOperation,
  VersionCache,
  VersionParams,
  VersionsComparison,
} from '../../types'
import { MESSAGE_SEVERITY } from '../../consts'
import {
  calculateTotalImpactedSummary,
  getOperationMetadata,
  getOperationsHashMapByApiType,
  getOperationTags,
  getOperationTypesFromTwoVersions,
  getUniqueApiTypesFromVersions,
  OperationIdentityMap,
  takeSubstringIf,
  totalChanges,
} from './compare.utils'
import {
  calculateApiAudienceTransitions,
  calculateChangeSummary,
  calculateDiffId,
  calculateImpactedSummary,
  executeInBatches,
  getSplittedVersionKey,
  removeFirstSlash,
  removeObjectDuplicates,
  slugify,
} from '../../utils'
import { asyncFunction } from '../../utils/async'
import { asyncDebugPerformance, DebugPerformanceContext, logLongBuild, syncDebugPerformance } from '../../utils/logs'
import { validateBwcBreakingChanges } from './bwc.validation'

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
  const { batchSize, versionOperationsResolver } = ctx

  const tags = new Set<string>()

  const changedOperations = new Map<string, OperationChanges>()
  const apiBuilder = ctx.apiBuilders.find((builder) => apiType === builder.apiType)
  if (!apiBuilder) { return null }

  const [prevOperationTypesData, currOperationTypesData] = getOperationTypesFromTwoVersions(prev, curr)

  const changedIdToOriginal: OperationIdentityMap = {}
  const prevOperationHashMap = getOperationsHashMapByApiType(apiType, prevOperationTypesData, changedIdToOriginal, ctx)
  const currOperationHashMap = getOperationsHashMapByApiType(apiType, currOperationTypesData, changedIdToOriginal, ctx, true)

  const operationIds = new Set([...Object.keys(prevOperationHashMap), ...Object.keys(currOperationHashMap)])
  const operationsMapping: Record<string, Array<string>> = { added: [], removed: [], changed: [] }
  const apiAudienceTransitions: ApiAudienceTransition[] = []
  const pairedOperationIds: Array<string> = []

  for (const operationId of operationIds) {
    const v1OperationHash = prevOperationHashMap[operationId]
    const v2OperationHash = currOperationHashMap[operationId]
    if (v1OperationHash && v2OperationHash) {
      pairedOperationIds.push(changedIdToOriginal[operationId] || operationId)
      // operation not changed
      if (v1OperationHash === v2OperationHash) { continue }
      // operation changed
      operationsMapping.changed.push(changedIdToOriginal[operationId] || operationId)
    } else if (v1OperationHash) {
      // operation removed
      operationsMapping.removed.push(changedIdToOriginal[operationId] || operationId)
    } else if (v2OperationHash) {
      // operation added
      operationsMapping.added.push(changedIdToOriginal[operationId] || operationId)
    }
  }

  const { version: prevVersion, packageId: prevPackageId } = prev ?? { version: '', packageId: '' }
  const { version: currVersion, packageId: currPackageId } = curr ?? { version: '', packageId: '' }

  const { currentGroup, previousGroup } = ctx.config
  const currGroupSlug = slugify(removeFirstSlash(currentGroup || ''))
  const prevGroupSlug = slugify(removeFirstSlash(previousGroup || ''))

  const pairContext: CompareOperationsPairContext = {
    notifications: ctx.notifications,
    versionDeprecatedResolver: ctx.versionDeprecatedResolver,
    previousVersion: prevVersion,
    currentVersion: currVersion,
    previousPackageId: prevPackageId,
    currentPackageId: currPackageId,
  }

  const handleAddedOrRemovedOperations = async (
    version: string,
    packageId: string,
    operationIds: OperationId[],
    handleType: HandleType,
    innerDebugCtx?: DebugPerformanceContext,
  ): Promise<void> => {
    const { operations = [] } = await versionOperationsResolver(
      apiType,
      version,
      packageId,
      operationIds,
      true,
    ) || {}

    if (!operations?.length) {
      const errorMessage = `Cannot get operations for package ${packageId} and version ${version} (with ids=${operationIds.join(',')})`
      ctx.notifications.push({
        severity: MESSAGE_SEVERITY.Error,
        message: errorMessage,
      })
      throw new Error(errorMessage)
    }
    if (operations.length !== operationIds.length) {
      const notResolvedOperationIds = operationIds.filter(id => !operations.find(({ operationId }) => id === operationId))
      const errorMessage = `Some operations (${notResolvedOperationIds}) for package ${packageId} and version ${version} (with ids=${operationIds.join(',')})`
      ctx.notifications.push({
        severity: MESSAGE_SEVERITY.Error,
        message: errorMessage,
      })
      throw new Error(errorMessage)
    }

    for (const operation of operations) {
      const isOperationAdded = handleType === HANDLE_TYPE_FULLY_ADDED
      const [prevOperation, currOperation] = isOperationAdded ? [undefined, operation] : [operation, undefined]
      const operationDiffs = await asyncDebugPerformance(
        '[Operation]',
        async () => apiBuilder.compareOperationsData!(currOperation, prevOperation, pairContext),
        innerDebugCtx,
        [operation.operationId],
      )
      const changeSummary = calculateChangeSummary(operationDiffs)
      const impactedSummary = calculateImpactedSummary([changeSummary])

      const changedOperation = {
        apiType,
        operationId: operation.operationId,
        [isOperationAdded ? 'dataHash' : 'previousDataHash']: operation.dataHash,
        [isOperationAdded ? 'apiKind' : 'previousApiKind']: operation.apiKind,
        diffs: operationDiffs,
        changeSummary: changeSummary,
        impactedSummary: impactedSummary,
        metadata: getOperationMetadata(operation),
      }
      validateBwcBreakingChanges(changedOperation)
      changedOperations.set(operation.operationId, changedOperation)
      getOperationTags(operation).forEach(tag => tags.add(tag))
    }
  }

  // todo: convert from objects analysis to apihub-diff result analysis after the "info" section participates in the comparison of operations
  await asyncDebugPerformance('[ApiAudience]', async () => await executeInBatches(pairedOperationIds, async (operationsBatch) => {
    const { operations: prevOperationsWithoutData = [] } = await versionOperationsResolver(apiType, prevVersion, prevPackageId, operationsBatch, false) || {}
    const { operations: currOperationsWithoutData = [] } = await versionOperationsResolver(apiType, currVersion, currPackageId, operationsBatch, false) || {}

    const pairOperationsMap = createPairOperationsMap(currGroupSlug, prevGroupSlug, currOperationsWithoutData, prevOperationsWithoutData)
    Object.values(pairOperationsMap).forEach((pair) => {
      calculateApiAudienceTransitions(pair.current, pair.previous, apiAudienceTransitions)
    })
  }, batchSize), debugCtx)

  await asyncDebugPerformance('[Added]', async (innerDebugCtx) => await executeInBatches(operationsMapping.removed, async (operationsBatch) => {
    await handleAddedOrRemovedOperations(
      prevVersion!,
      prevPackageId!,
      operationsBatch,
      HANDLE_TYPE_FULLY_REMOVED,
      innerDebugCtx,
    )
  }, batchSize), debugCtx)

  await asyncDebugPerformance('[Removed]', async (innerDebugCtx) => await executeInBatches(operationsMapping.added, async (operationsBatch) => {
    await handleAddedOrRemovedOperations(
      currVersion!,
      currPackageId!,
      operationsBatch,
      HANDLE_TYPE_FULLY_ADDED,
      innerDebugCtx,
    )
  }, batchSize), debugCtx)

  if (!apiBuilder.compareOperationsData) { return null }

  await asyncDebugPerformance('[Changed]', async (innerDebugCtx) =>
    await executeInBatches(operationsMapping.changed, async (operationsBatch) => {
      const currentBatch = currentGroup ? operationsBatch.map(operationId => currGroupSlug + operationId.substring(currGroupSlug.length)) : operationsBatch
      const previousBatch = previousGroup ? operationsBatch.map(operationId => prevGroupSlug + operationId.substring(prevGroupSlug.length)) : operationsBatch

      const { operations: prevOperationsWithData = [] } = await versionOperationsResolver(apiType, prevVersion!, prevPackageId!, previousBatch) || {}
      const { operations: currOperationsWithData = [] } = await versionOperationsResolver(apiType, currVersion!, currPackageId!, currentBatch) || {}

      const operationsMap = createPairOperationsMap(currGroupSlug, prevGroupSlug, currOperationsWithData, prevOperationsWithData)

      // compare Operations Data
      for (const operationId of Object.keys(operationsMap)) {
        const operationsEntry = operationsMap[operationId]
        if (!operationsEntry.previous?.data) {
          ctx.notifications.push({
            severity: MESSAGE_SEVERITY.Error,
            message: `Cannot compare operations (${operationId}) of packages ${prevPackageId}/${prevVersion} and ${currPackageId}/${currVersion} - Previous operation data not found`,
          })
          continue
        }
        if (!operationsEntry.current?.data) {
          ctx.notifications.push({
            severity: MESSAGE_SEVERITY.Error,
            message: `Cannot compare operations (${operationId}) of packages ${prevPackageId}/${prevVersion} and ${currPackageId}/${currVersion} - Current operation data not found`,
          })
          continue
        }
        const operationDiffs = await asyncDebugPerformance(
          '[Operation]',
          async () => apiBuilder.compareOperationsData!(operationsEntry.current, operationsEntry.previous, pairContext),
          innerDebugCtx,
          [operationId],
        )
        const changeSummary = calculateChangeSummary(operationDiffs)
        const impactedSummary = calculateImpactedSummary([changeSummary])

        // skip if no changes
        if (totalChanges(changeSummary) && operationsEntry.previous) {
          const changedOperation = {
            apiType,
            operationId: takeSubstringIf(!!currGroupSlug, operationsEntry.current.operationId, removeFirstSlash(currentGroup ?? '').length),
            dataHash: operationsEntry.current.dataHash,
            previousDataHash: operationsEntry.previous.dataHash,
            apiKind: operationsEntry.current.apiKind,
            previousApiKind: operationsEntry.previous.apiKind,
            diffs: operationDiffs,
            changeSummary: changeSummary,
            impactedSummary: impactedSummary,
            metadata: {
              ...getOperationMetadata(operationsEntry.current),
              previousOperationMetadata: getOperationMetadata(operationsEntry.previous),
            },
          }
          validateBwcBreakingChanges(changedOperation)
          changedOperations.set(operationId, changedOperation)
          getOperationTags(operationsEntry.current).forEach(tag => tags.add(tag))
        }
      }
    }, batchSize),
    debugCtx,
  )

  const operationChanges = Array.from(changedOperations.values())

  const dedupedChanges = removeObjectDuplicates(operationChanges.flatMap(({ diffs }) => diffs), calculateDiffId)
  const changesSummary = calculateChangeSummary(dedupedChanges)
  const numberOfImpactedOperations = calculateTotalImpactedSummary(
    operationChanges.map(({ impactedSummary }) => impactedSummary),
  )

  return [
    {
      apiType,
      changesSummary,
      numberOfImpactedOperations,
      tags: [...tags.values()].sort(),
      apiAudienceTransitions,
    },
    operationChanges,
  ]
}

const HANDLE_TYPE_FULLY_ADDED = 'added'
const HANDLE_TYPE_FULLY_REMOVED = 'removed'

type HandleType = typeof HANDLE_TYPE_FULLY_ADDED | typeof HANDLE_TYPE_FULLY_REMOVED

const createPairOperationsMap = (currGroupSlug: string, prevGroupSlug: string, currentOperations: ResolvedOperation[], previousOperations: ResolvedOperation[]): Record<string, { previous?: ResolvedOperation; current: ResolvedOperation }> => {

  const operationsMap: Record<string, { previous?: ResolvedOperation; current: ResolvedOperation }> = {}

  for (const currentOperation of currentOperations) {
    operationsMap[takeSubstringIf(!!currGroupSlug, currentOperation.operationId, currGroupSlug.length)] = { current: currentOperation }
  }

  for (const previousOperation of previousOperations) {
    const prevOperationId = takeSubstringIf(!!prevGroupSlug, previousOperation.operationId, prevGroupSlug.length)
    const operationsMappingElement = operationsMap[prevOperationId]
    if (operationsMappingElement) {
      operationsMap[prevOperationId] = {
        ...operationsMappingElement,
        previous: previousOperation,
      }
    }
  }

  return operationsMap
}
