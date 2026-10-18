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

import { buildFromDdl } from '@netcracker/qubership-apihub-ddlapi/parser'
import type { Realm } from '@netcracker/qubership-apihub-ddlapi'
import { Diff } from '@netcracker/qubership-apihub-api-diff'
import {
  CompareContext,
  ComparisonDocument,
  DdlChanges,
  DdlComparison,
  DdlEntityDescriptor,
  DdlEntityId,
  PackageId,
  VersionParams,
} from '../../types'
import { DDL_CONTRACT_TYPE, REVISION_DELIMITER } from '../../consts'
import {
  calculateChangeSummary,
  calculateDiffId,
  getSplittedVersionKey,
  removeObjectDuplicates,
} from '../../utils'
import { collectTableDescriptors } from '../../apitypes/ddl/ddl.entities'
import { DDL_DOCUMENT_TYPE } from '../../apitypes/ddl/ddl.consts'
import {
  calculateTotalImpactedSummary,
  createChangeBase,
  createComparisonDocument,
  createComparisonFileId,
  createComparisonInternalDocumentId,
  createComparisonInternalDocuments,
  dedupeTuples,
  pairByKey,
  removeRedundantPartialPairs,
} from './compare.utils'

// One resolved DDL document of a version: its slug, the Realm built from its raw SQL, and the
// `ddlEntityId → descriptor` map for its tables. The same object reference is shared by all of
// the document's entityIds during pairing, so doc-pair dedupe (by reference) works.
interface DdlDocInfo {
  slug: string
  realm: Realm
  descriptors: Map<DdlEntityId, DdlEntityDescriptor>
}

// A document belongs to `packageId` when its `packageRef` is absent (own documents may carry none) or
// its leading packageId segment matches. `packageRef` is encoded as `packageId@version[@revision]`
// (REVISION_DELIMITER), so a non-empty value identifies the document's home package; foreign
// (reference-package) docs are handled by the dashboard/references path (Task 11) and resolving their
// raw SQL at THIS packageId would fail.
export function isOwnPackageDocument(packageRef: string | undefined, packageId: PackageId): boolean {
  if (!packageRef) { return true }
  return packageRef.split(REVISION_DELIMITER)[0] === packageId
}

async function resolveDdlDocInfos(params: VersionParams, ctx: CompareContext): Promise<DdlDocInfo[]> {
  if (!params) { return [] }
  const [version, packageId] = params
  // request only DDL documents via the `contractType` query param (OQ1: the host serves their raw .sql)
  const resolved = await ctx.versionDocumentsResolver(version, packageId, undefined, DDL_CONTRACT_TYPE)
  // `isOwnPackageDocument`: this package's OWN documents only — reference-package docs are handled by the
  // dashboard/references path (Task 11) and resolving their raw SQL at THIS packageId would fail.
  // TODO: the `type === ddl` check is a precaution in case the backend doesn't yet honor the
  // `contractType` query param — remove it once the backend filters by contract type server-side.
  const documents = (resolved?.documents ?? []).filter(
    document => isOwnPackageDocument(document.packageRef, packageId) && document.type === DDL_DOCUMENT_TYPE.DDL,
  )

  const docInfos: DdlDocInfo[] = []
  for (const document of documents) {
    const file = await ctx.rawDocumentResolver(version, packageId, document.slug)
    const realm = await buildFromDdl(await file.text())
    docInfos.push({
      slug: document.slug,
      realm,
      descriptors: collectTableDescriptors(realm),
    })
  }
  return docInfos
}

/** Index a version's documents by every table's `ddlEntityId` (same DocInfo reference reused per doc). */
function indexByEntityId(docInfos: DdlDocInfo[]): Record<DdlEntityId, DdlDocInfo> {
  const index: Record<DdlEntityId, DdlDocInfo> = {}
  for (const docInfo of docInfos) {
    for (const ddlEntityId of docInfo.descriptors.keys()) {
      index[ddlEntityId] = docInfo
    }
  }
  return index
}

/**
 * Whether entity `home` (its global `ddlEntityId` pairing) belongs to the doc pair `[prevDoc, currDoc]`.
 * A changed/moved entity (both sides defined) belongs only to its exact pair; a pure add/remove (one
 * side defined) belongs to whichever surviving pair carries its defined side — its partial doc pair was
 * absorbed by `removeRedundantPartialPairs`. This keeps a cross-file-moved table from being double-counted
 * as remove+add across the two pairs it touches.
 */
function belongsToPair(
  home: { previous?: DdlDocInfo; current?: DdlDocInfo },
  prevDoc: DdlDocInfo | undefined,
  currDoc: DdlDocInfo | undefined,
): boolean {
  const { previous, current } = home
  if (previous && current) { return previous === prevDoc && current === currDoc }
  if (current) { return current === currDoc }
  if (previous) { return previous === prevDoc }
  return false
}

function createDdlChange(
  ddlEntityId: DdlEntityId,
  diffs: Diff[],
  comparisonInternalDocumentId: string,
  previousDescriptor: DdlEntityDescriptor | undefined,
  currentDescriptor: DdlEntityDescriptor | undefined,
): DdlChanges {
  const currentFields = currentDescriptor && {
    ddlEntityId,
    metadata: currentDescriptor,
  }
  const previousFields = previousDescriptor && {
    previousDdlEntityId: ddlEntityId,
    previousMetadata: previousDescriptor,
  }
  return {
    ...createChangeBase(diffs, comparisonInternalDocumentId),
    ...currentFields,
    ...previousFields,
  }
}

/**
 * DDL changelog step (Task 9): the parallel-to-`compareVersionsOperations` orchestration for DDL.
 *
 * Resolves each version's DDL documents + raw SQL, builds Realms, pairs tables by `ddlEntityId`
 * **before** any `apiDiff` (so a table moved between `.sql` files lines up as a change, not remove+add),
 * derives the document/realm pairs via the reused `dedupeTuples`/`removeRedundantPartialPairs`, runs the
 * per-pair `compareDdlDocuments` hook, and emits `DdlChanges` keyed by `ddlEntityId` with per-contract
 * summaries (D12). The merged Realm of each pair becomes a shared comparison-internal document.
 */
export async function compareVersionsDdl(
  prev: VersionParams,
  curr: VersionParams,
  ctx: CompareContext,
): Promise<DdlComparison> {
  const { versionResolver } = ctx
  const prevVersionData = prev && await versionResolver(...prev)
  const currVersionData = curr && await versionResolver(...curr)

  const prevDocInfos = await resolveDdlDocInfos(prev, ctx)
  const currDocInfos = await resolveDdlDocInfos(curr, ctx)

  const apiBuilder = ctx.apiBuilders.find(builder => builder.apiType === DDL_CONTRACT_TYPE)

  const [currentVersion, currentRevision] = getSplittedVersionKey(currVersionData?.version)
  const [previousVersion, previousRevision] = getSplittedVersionKey(prevVersionData?.version)

  const envelope = {
    packageId: currVersionData?.packageId ?? '',
    version: currentVersion,
    revision: currentRevision,
    previousVersion,
    previousVersionRevision: previousRevision,
    previousVersionPackageId: prevVersionData?.packageId ?? '',
    fromCache: false,
  } as const

  // no DDL content in either version → nothing to compare; empty comparison
  const hasDdl = prevDocInfos.length > 0 || currDocInfos.length > 0
  if (!hasDdl) {
    return { ...envelope, contractsChangesSummary: {}, comparisonInternalDocuments: [] }
  }
  // DDL documents ARE present but the compare hook is missing — a registration/wiring bug. Fail loudly
  // rather than silently dropping the DDL changes this version actually has.
  if (!apiBuilder?.compareDdlDocuments) {
    throw new Error('DDL documents are present but no DDL compare hook (compareDdlDocuments) is registered')
  }

  const pairs = pairByKey(indexByEntityId(prevDocInfos), indexByEntityId(currDocInfos))
  // doc/realm pairs: dedupe identical doc pairs and drop partials absorbed by a complete pair (AD7).
  const realmPairs = removeRedundantPartialPairs(
    dedupeTuples(
      Object.values(pairs).map(
        ({ previous, current }): [DdlDocInfo | undefined, DdlDocInfo | undefined] => [previous, current],
      ),
    ),
  )

  const changes: DdlChanges[] = []
  const comparisonDocuments: ComparisonDocument[] = []
  const uniqueDiffsForPairs: Set<Diff>[] = []

  for (const [prevDoc, currDoc] of realmPairs) {
    const comparisonInternalDocumentId = createComparisonInternalDocumentId(
      previousVersion, envelope.previousVersionPackageId, prevDoc?.slug,
      currentVersion, envelope.packageId, currDoc?.slug,
    )

    const { changesByEntityId, mergedRealm } = apiBuilder.compareDdlDocuments(prevDoc?.realm, currDoc?.realm, {
      previousVersion,
      currentVersion,
      previousPackageId: envelope.previousVersionPackageId,
      currentPackageId: envelope.packageId,
      notifications: ctx.notifications,
      normalizedSpecFragmentsHashCache: ctx.normalizedSpecFragmentsHashCache,
    })

    const pairDiffs = new Set<Diff>()
    for (const [ddlEntityId, diffs] of changesByEntityId) {
      // only attribute an entity to its "home" doc pair (cross-file-move dedupe)
      if (!belongsToPair(pairs[ddlEntityId], prevDoc, currDoc)) { continue }
      diffs.forEach(diff => pairDiffs.add(diff))
      changes.push(createDdlChange(
        ddlEntityId,
        diffs,
        comparisonInternalDocumentId,
        prevDoc?.descriptors.get(ddlEntityId),
        currDoc?.descriptors.get(ddlEntityId),
      ))
    }
    if (pairDiffs.size) {
      comparisonDocuments.push(createComparisonDocument(comparisonInternalDocumentId, mergedRealm))
      uniqueDiffsForPairs.push(pairDiffs)
    }
  }

  // version-level summary dedup mirrors compareCurrentApiType (per-contract only — D12)
  const uniqueDiffs = uniqueDiffsForPairs.length === 1
    ? [...uniqueDiffsForPairs[0]]
    : removeObjectDuplicates(uniqueDiffsForPairs.flatMap(set => [...set]), calculateDiffId)
  const changesSummary = calculateChangeSummary(uniqueDiffs)
  const numberOfImpactedEntities = calculateTotalImpactedSummary(changes.map(({ impactedSummary }) => impactedSummary))

  const comparisonFileId = createComparisonFileId(prev, curr)
  const comparisonInternalDocuments = createComparisonInternalDocuments(comparisonDocuments, comparisonFileId)

  return {
    ...envelope,
    contractsChangesSummary: { [DDL_CONTRACT_TYPE]: { changesSummary, numberOfImpactedEntities } },
    ...changes.length ? { comparisonFileId, data: changes } : {},
    comparisonInternalDocuments,
  }
}
