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

import { BuildConfigRef, CompareContext, CompareResult, DdlComparison, VersionParams, VersionsComparison } from '../../types'
import { compareVersionsOperations } from './compare.operations'
import { compareVersionsDdl } from './compare.ddl'
import { getSplittedVersionKey } from '../../utils'

export async function compareVersions(
  prev: VersionParams,
  curr: VersionParams,
  ctx: CompareContext,
): Promise<CompareResult> {
  const { comparisons, ddlComparisons } = await compareVersionsReferences(prev, curr, ctx)
  const { previousVersionBuilderVersion, currentVersionBuilderVersion, ...comparison } = await compareVersionsOperations(prev, curr, ctx)
  comparisons.push(comparison)

  // DDL changelog runs as a parallel step (AD1), emitting its own sibling comparisons. Ref DDL is added
  // by compareVersionsReferences (cache-miss only — D15); here we add the root package's DDL comparison.
  const rootDdlComparison = await compareVersionsDdl(prev, curr, ctx)
  if (Object.keys(rootDdlComparison.contractsChangesSummary).length) {
    ddlComparisons.push(rootDdlComparison)
  }

  return {
    comparisons,
    ddlComparisons,
    previousVersionBuilderVersion,
    currentVersionBuilderVersion,
  }
}

export async function compareVersionsReferences(
  prev: VersionParams,
  curr: VersionParams,
  ctx: CompareContext,
): Promise<{ comparisons: VersionsComparison[]; ddlComparisons: DdlComparison[] }> {
  const comparisons: VersionsComparison[] = []
  const ddlComparisons: DdlComparison[] = []

  const currentVersionRefs = curr && await ctx.versionReferencesResolver(...curr) || []
  const previousVersionRefs = prev && await ctx.versionReferencesResolver(...prev) || []

  const refsMap = new Map<string, { [key: string]: BuildConfigRef }>()

  // map refs by refId
  for (const previous of previousVersionRefs) {
    refsMap.set(previous.refId, { previous })
  }
  for (const current of currentVersionRefs) {
    const mapping = refsMap.get(current.refId)
    refsMap.set(current.refId, { ...mapping, current })
  }

  for (const { current, previous } of refsMap.values()) {
    if (previous && current) {
      const comparison = await ctx.versionComparisonResolver(current.version, current.refId, previous.version, previous.refId)
      if (comparison && Array.isArray(comparison.operationTypes)) {
        const [previousVersion, previousVersionRevision] = getSplittedVersionKey(previous.version)
        const [version, revision] = getSplittedVersionKey(current.version)

        comparisons.push({
          ...comparison,
          packageId: current.refId,
          version: version,
          revision: revision,
          previousVersionPackageId: previous.refId,
          previousVersion: previousVersion,
          previousVersionRevision: previousVersionRevision,
          fromCache: true,
          comparisonInternalDocuments: [],
        })
        // D15: on a cache hit the cached ref comparison carries no DDL section; api-processor trusts the
        // host to have invalidated/rebuilt it. We do NOT recompute DDL here — accept under-reporting until
        // the host refreshes the cache. DDL for refs is computed on the cache-miss path below only.
        continue
      }
    }
    const prevParams: VersionParams = previous ? [previous.version, previous.refId] : null
    const currParams: VersionParams = current ? [current.version, current.refId] : null
    // builder version info is only relevant for the root package; ref-packages report it at their own root level
    const { previousVersionBuilderVersion: _, currentVersionBuilderVersion: __, ...refComparison } = await compareVersionsOperations(prevParams, currParams, ctx)
    comparisons.push(refComparison)

    // cache miss: also compute this ref's DDL comparison so a DDL-bearing dashboard aggregates it (Task 11)
    const refDdlComparison = await compareVersionsDdl(prevParams, currParams, ctx)
    if (Object.keys(refDdlComparison.contractsChangesSummary).length) {
      ddlComparisons.push(refDdlComparison)
    }
  }

  return { comparisons, ddlComparisons }
}

