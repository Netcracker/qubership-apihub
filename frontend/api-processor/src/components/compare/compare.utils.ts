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
  CompareOperationsPairContext,
  DIFF_TYPES,
  ImpactedOperationSummary,
  NormalizedOperationId,
  OperationChanges,
  OperationChangesMetadata,
  OperationId,
  OperationsApiType,
  OperationTypes,
  ResolvedOperation,
  ResolvedVersionDocument,
  VersionCache,
} from '../../types'
import { EMPTY_CHANGE_SUMMARY } from '../../consts'
import {
  calculateChangeSummary,
  calculateImpactedSummary,
  difference,
  intersection,
  removeFirstSlash,
  takeIfDefined,
} from '../../utils'
import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { reclassifyNoBwcBreakingChanges } from './bwc.validation'

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

export function getOperationTags(operation?: ResolvedOperation): string[] {
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

function dedupeTuples<T extends [object | undefined, object | undefined]>(
  tuples: T[],
): T[] {
  const UNDEF: object = {}
  const root = new WeakMap<object, WeakSet<object>>()
  const result: T[] = []

  for (const [a, b] of tuples) {
    const keyA = (a ?? UNDEF)
    const keyB = (b ?? UNDEF)

    let inner = root.get(keyA)
    if (!inner) {
      inner = new WeakSet()
      root.set(keyA, inner)
    }

    if (!inner.has(keyB)) {
      inner.add(keyB)
      result.push([a, b] as T)
    }
  }

  return result
}

function removeRedundantPartialPairs<T extends [object | undefined, object | undefined]>(
  tuples: T[],
): T[] {
  const completeAtPosition = [new Set<object>(), new Set<object>()] as const

  // First pass: identify all values that appear in complete pairs by position
  for (const [a, b] of tuples) {
    if (a !== undefined && b !== undefined) {
      completeAtPosition[0].add(a)
      completeAtPosition[1].add(b)
    }
  }

  // Second pass: filter out partial pairs that are consumed by a complete pair
  return tuples.filter(([a, b]) => {
    const isPartial = a === undefined || b === undefined
    if (!isPartial) return true // Keep all complete pairs
    
    // For partial pairs, only keep if there's no corresponding complete pair 
    // with the defined value at corresponding position
    return a === undefined 
      ? !completeAtPosition[1].has(b!)
      : !completeAtPosition[0].has(a)
  })
}

export function normalizeOperationIds(operations: ResolvedOperation[], apiBuilder: ApiBuilder, groupSlug: string): [(NormalizedOperationId | OperationId)[], Record<NormalizedOperationId | OperationId, ResolvedOperation>] {
  const normalizedOperationIdToOperation: Record<NormalizedOperationId | OperationId, ResolvedOperation> = {}
  operations.forEach(operation => {
    const normalizedOperationId = apiBuilder.createNormalizedOperationId?.(operation) ?? operation.operationId
    // '-' is a slugified slash in the middle of a normalizedOperationId that should also be removed for a proper matching during comparison
    normalizedOperationIdToOperation[takeSubstringIf(!!groupSlug, normalizedOperationId, groupSlug.length + '-'.length)] = operation
  })
  return [Object.keys(normalizedOperationIdToOperation), normalizedOperationIdToOperation]
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

export type OperationPair = {
  previous?: ResolvedOperation
  current?: ResolvedOperation
}

export type OperationsMap = Record<NormalizedOperationId, OperationPair>

export const createPairOperationsMap = (
  previousGroupSlug: string,
  currentGroupSlug: string,
  previousOperations: ResolvedOperation[],
  currentOperations: ResolvedOperation[],
  apiBuilder: ApiBuilder,
): OperationsMap => {
  const [prevNormalizedOperationIds, prevNormalizedIdToOperation] = normalizeOperationIds(previousOperations, apiBuilder, previousGroupSlug)
  const [currNormalizedOperationIds, currNormalizedIdToOperation] = normalizeOperationIds(currentOperations, apiBuilder, currentGroupSlug)

  const added: NormalizedOperationId[] = difference(currNormalizedOperationIds, prevNormalizedOperationIds)
  const removed: NormalizedOperationId[] = difference(prevNormalizedOperationIds, currNormalizedOperationIds)
  const potentiallyChanged: NormalizedOperationId[] = intersection(prevNormalizedOperationIds, currNormalizedOperationIds)

  const operationsMap: OperationsMap = {}
  added.forEach(id => operationsMap[id] = { current: currNormalizedIdToOperation[id] })
  removed.forEach(id => operationsMap[id] = { previous: prevNormalizedIdToOperation[id] })
  potentiallyChanged.forEach(id => operationsMap[id] = {
    previous: prevNormalizedIdToOperation[id],
    current: currNormalizedIdToOperation[id],
  })

  return operationsMap
}

export const calculatePairedDocs = async (
  operationPairs: OperationPair[],
  ctx: CompareOperationsPairContext,
): Promise<[ResolvedVersionDocument | undefined, ResolvedVersionDocument | undefined][]> => {

  const {
    apiType,
    versionDocumentsResolver,
    previousVersion,
    currentVersion,
    previousPackageId,
    currentPackageId,
  } = ctx

  const { documents: prevDocuments } = await versionDocumentsResolver(previousVersion, previousPackageId, apiType) ?? { documents: [] }
  const { documents: currDocuments } = await versionDocumentsResolver(currentVersion, currentPackageId, apiType) ?? { documents: [] }

  const pairedDocs: [ResolvedVersionDocument | undefined, ResolvedVersionDocument | undefined][] = []
  for (const { previous, current } of operationPairs) {
    const prevDoc = previous && prevDocuments.find(document => document.slug === previous.documentId)
    const currDoc = current && currDocuments.find(document => document.slug === current.documentId)
    pairedDocs.push([prevDoc, currDoc])
  }
  return removeRedundantPartialPairs(dedupeTuples(pairedDocs))
}

export const comparePairedDocs = async (
  operationsMap: OperationsMap,
  pairedDocs: [ResolvedVersionDocument | undefined, ResolvedVersionDocument | undefined][],
  apiBuilder: ApiBuilder,
  ctx: CompareOperationsPairContext,
): Promise<[OperationChanges[], Set<Diff>[], string[]]> => {
  const operationChanges: OperationChanges[] = []
  const uniqueDiffsForDocPairs: Set<Diff>[] = []
  const tags = new Set<string>()

  for (const [prevDoc, currDoc] of pairedDocs) {
    const {
      operationChanges: docsPairOperationChanges,
      tags: docsPairTags,
    } = await apiBuilder.compareDocuments!(operationsMap, prevDoc, currDoc, ctx)

    // We can remove duplicates for diffs coming from the same apiDiff call using simple identity
    uniqueDiffsForDocPairs.push(new Set(docsPairOperationChanges.flatMap(({ diffs }) => diffs ?? [])))

    operationChanges.push(...docsPairOperationChanges)
    docsPairTags.forEach(tag => tags.add(tag))
  }

  return [operationChanges, uniqueDiffsForDocPairs, Array.from(tags).sort()]
}

export function createOperationChange(
  apiType: OperationsApiType,
  operationDiffs: Diff[],
  previous?: ResolvedOperation,
  current?: ResolvedOperation,
  currentGroup?: string,
  previousGroup?: string,
): OperationChanges {
  const reclassifiedDiffs = reclassifyNoBwcBreakingChanges(operationDiffs, previous, current)
  const changeSummary = calculateChangeSummary(reclassifiedDiffs)
  const impactedSummary = calculateImpactedSummary([changeSummary])

  const currentOperationFields = current && {
    operationId: takeSubstringIf(!!currentGroup, current.operationId, removeFirstSlash(currentGroup ?? '').length),
    apiKind: current.apiKind,
    metadata: getOperationMetadata(current),
  }

  const previousOperationFields = previous && {
    previousOperationId: takeSubstringIf(!!previousGroup, previous.operationId, removeFirstSlash(previousGroup ?? '').length),
    previousApiKind: previous.apiKind,
    previousMetadata: getOperationMetadata(previous),
  }

  return {
    apiType,
    diffs: reclassifiedDiffs,
    changeSummary: changeSummary,
    impactedSummary: impactedSummary,
    ...currentOperationFields,
    ...previousOperationFields,
  }
}
