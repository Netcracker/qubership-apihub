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

import { BuildConfigRef, CompareContext, CompareResult, DdlComparison, KIND_DASHBOARD, NotificationMessage, VersionParams, VersionsComparison } from '../../types'
import { compareVersionsOperations } from './compare.operations'
import { compareVersionsDdl } from './compare.ddl'
import { comparisonHasErrors, getSplittedVersionKey } from '../../utils'

/** Compare two versions: the dashboard references first, then the root pair's operations and its DDL. */
export async function compareVersions(
  prev: VersionParams,
  curr: VersionParams,
  ctx: CompareContext,
  rootNotifications: NotificationMessage[] = [],
): Promise<CompareResult> {
  // The pair's operation and DDL comparison share one array: a failure to resolve one side degrades both, so
  // both report it. A caller that resolved the baseline first passes in the array it reported to, keeping
  // that failure on the same pair. Either way the array exists before the reference walk, and the references
  // are `prev`'s and `curr`'s, so a failure to list them belongs to this pair.
  const rootCtx = ctx.forPair(rootNotifications)

  const { comparisons, ddlComparisons } = await compareVersionsReferences(prev, curr, rootCtx)

  const { previousVersionBuilderVersion, currentVersionBuilderVersion, ...comparison } = await compareVersionsOperations(prev, curr, rootCtx)
  comparisons.push(comparison)

  // DDL changelog runs as a parallel step (AD1), emitting its own sibling comparisons. Ref DDL is added by
  // compareVersionsReferences; here we add the root package's own.
  const rootDdlComparison = await compareVersionsDdl(prev, curr, rootCtx)
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

/**
 * Fatal. A dashboard's changelog is the **aggregate** of its references'
 * changelogs, so a reference known to be wrong makes every number in the aggregate wrong with nothing to say
 * which. That is the "is anything publishable left?" test reaching the opposite answer than usual: for a
 * version a bad document leaves the others useful; an aggregate has no unaffected part.
 *
 * Both origins count. A comparison reused from cache carries the flag the host holds and feeds the same
 * aggregate as one calculated here, so the argument does not distinguish them. The backend refuses to
 * reference an unsound version as well.
 */
function assertReferencesAreSound(comparisons: Array<VersionsComparison | DdlComparison>): void {
  const unsound = comparisons.filter(comparisonHasErrors)
  if (!unsound.length) { return }

  const references = [...new Set(unsound.map(({ packageId, version }) => `${packageId}/${version}`))].sort()
  throw new Error(
    `Cannot build a dashboard changelog: the comparison of ${references.join(', ')} has errors. ` +
    'A dashboard changelog is the aggregate of its references, so it cannot be built on one that is wrong.',
  )
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
    // Omit intermediate (nested) dashboard pairs: the backend stores a dashboard-pair row only when
    // that pair is built as a root. Leaf packages under this dashboard are separate entries in the
    // fully-flattened refsMap, so skipping here drops only the dashboard row, never its leaves. Both
    // sides describe the same package; `??` covers added-only / removed-only pairs.
    const kind = current?.kind ?? previous?.kind
    if (kind === KIND_DASHBOARD) {
      continue
    }
    if (previous && current) {
      const comparison = await ctx.versionComparisonResolver(current.version, current.refId, previous.version, previous.refId)
      // A placeholder answer is no answer: the host reads `noContent` the same way, refusing to call such
      // a row a valid comparison result.
      if (comparison && !comparison.noContent && Array.isArray(comparison.operationTypes)) {
        const [previousVersion, previousVersionRevision] = getSplittedVersionKey(previous.version)
        const [version, revision] = getSplittedVersionKey(current.version)

        const pair = {
          packageId: current.refId,
          version: version,
          revision: revision,
          previousVersionPackageId: previous.refId,
          previousVersion: previousVersion,
          previousVersionRevision: previousVersionRevision,
          hasErrors: comparison.hasErrors,
          fromCache: true,
          comparisonInternalDocuments: [],
          notifications: [],
        }
        comparisons.push({ ...pair, operationTypes: comparison.operationTypes })
        // The host's answer carries the pair's schema changes when it holds any (AD6), passed through as
        // `operationTypes` is. Nothing is recalculated on a hit.
        const contractsChangesSummary = comparison.contractsChangesSummary ?? {}
        if (Object.keys(contractsChangesSummary).length) {
          ddlComparisons.push({ ...pair, contractsChangesSummary })
        }
        continue
      }
    }
    const prevParams: VersionParams = previous ? [previous.version, previous.refId] : null
    const currParams: VersionParams = current ? [current.version, current.refId] : null
    // every referenced pair gets its own array, so a dashboard build never mixes two comparisons' messages
    const refNotifications: NotificationMessage[] = []
    const refCtx = ctx.forPair(refNotifications)
    // builder version info is only relevant for the root package; ref-packages report it at their own root level
    const { previousVersionBuilderVersion: _, currentVersionBuilderVersion: __, ...refComparison } = await compareVersionsOperations(prevParams, currParams, refCtx)
    comparisons.push(refComparison)

    const refDdlComparison = await compareVersionsDdl(prevParams, currParams, refCtx)
    if (Object.keys(refDdlComparison.contractsChangesSummary).length) {
      ddlComparisons.push(refDdlComparison)
    }
  }

  assertReferencesAreSound([...comparisons, ...ddlComparisons])

  return { comparisons, ddlComparisons }
}

