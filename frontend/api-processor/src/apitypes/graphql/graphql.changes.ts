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

import { calculateGraphqlOperationId, isEmpty, takeIf } from '../../utils'
import { parseGraphQLDocument } from './graphql.document'
import {
  aggregateDiffsWithRollup,
  apiDiff,
  Diff,
  DIFF_META_KEY,
  DIFFS_AGGREGATED_META_KEY,
} from '@netcracker/qubership-apihub-api-diff'
import {
  AFTER_VALUE_NORMALIZED_PROPERTY,
  BEFORE_VALUE_NORMALIZED_PROPERTY,
  NORMALIZE_OPTIONS,
  ORIGINS_SYMBOL,
} from '../../consts'
import { GraphApiOperation, GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import {
  CompareOperationsPairContext,
  ComparisonDocument,
  DocumentsCompare,
  DocumentsCompareData,
  OperationChanges,
  ResolvedVersionDocument,
  WithAggregatedDiffs,
  WithDiffMetaRecord,
} from '../../types'
import { GRAPHQL_TYPE, GRAPHQL_TYPE_KEYS } from './graphql.consts'
import {
  createComparisonDocument,
  createComparisonInternalDocumentId,
  createOperationChange,
  getOperationTags,
  OperationsMap,
} from '../../components'
import { createGraphqlApiKindValueAt } from '../../components/compare/graphql.api-kind'
import { apiKindReclassificationRule, CUSTOM_SCOPE_ELEMENT_API_KIND } from '../../components/compare/custom-scope'

export const compareDocuments: DocumentsCompare = async (
  operationsMap: OperationsMap,
  prevDoc: ResolvedVersionDocument | undefined,
  currDoc: ResolvedVersionDocument | undefined,
  ctx: CompareOperationsPairContext,
): Promise<DocumentsCompareData> => {
  const {
    apiType,
    rawDocumentResolver,
    previousVersion,
    currentVersion,
    previousPackageId,
    currentPackageId,
  } = ctx
  const comparisonInternalDocumentId = createComparisonInternalDocumentId(previousVersion, previousPackageId, prevDoc?.slug, currentVersion, currentPackageId, currDoc?.slug)
  const prevFile = prevDoc && await rawDocumentResolver(previousVersion, previousPackageId, prevDoc.slug)
  const currFile = currDoc && await rawDocumentResolver(currentVersion, currentPackageId, currDoc.slug)

  let prevDocData = prevFile && prevDoc && parseGraphQLDocument(await prevFile.text(), prevDoc.type, prevDoc.format)
  let currDocData = currFile && currDoc && parseGraphQLDocument(await currFile.text(), currDoc.type, currDoc.format)

  if (!prevDocData && currDocData) {
    prevDocData = getCopyWithEmptyOperations(currDocData)
  }
  if (prevDocData && !currDocData) {
    currDocData = getCopyWithEmptyOperations(prevDocData)
  }

  // Both documents carry the api kind their own build resolved from labels and `xApiKind`
  const currDocumentApiKind = currDoc?.apiKind
  const prevDocumentApiKind = prevDoc?.apiKind

  const { merged, diffs } = apiDiff(
    prevDocData,
    currDocData,
    {
      ...NORMALIZE_OPTIONS,
      metaKey: DIFF_META_KEY,
      originsFlag: ORIGINS_SYMBOL,
      normalizedResult: true,
      afterValueNormalizedProperty: AFTER_VALUE_NORMALIZED_PROPERTY,
      beforeValueNormalizedProperty: BEFORE_VALUE_NORMALIZED_PROPERTY,
      customScopeElementProviders: [{
        name: CUSTOM_SCOPE_ELEMENT_API_KIND,
        valueAt: createGraphqlApiKindValueAt(prevDocumentApiKind, currDocumentApiKind),
      }],
      reclassificationRules: [apiKindReclassificationRule],
    },
  ) as { merged: GraphApiSchema; diffs: Diff[] }

  if (isEmpty(diffs)) {
    return { operationChanges: [], tags: new Set() }
  }

  aggregateDiffsWithRollup(merged, DIFF_META_KEY, DIFFS_AGGREGATED_META_KEY)

  const { currentGroup, previousGroup } = ctx

  const tags = new Set<string>()
  const operationChanges: OperationChanges[] = []
  for (const type of GRAPHQL_TYPE_KEYS) {
    const operationsByType = merged[type]
    if (!operationsByType) { continue }

    for (const operationKey of Object.keys(operationsByType)) {
      const operationId = calculateGraphqlOperationId(GRAPHQL_TYPE[type], operationKey)
      const methodData = operationsByType[operationKey]

      const { current, previous } = operationsMap[operationId] ?? {}
      if (!current && !previous) {
        throw new Error(`Can't find the ${operationId} operation from documents pair ${prevDoc?.fileId} and ${currDoc?.fileId}`)
      }
      const operationChanged = Boolean(current && previous)
      const operationAddedOrRemoved = !operationChanged

      let operationDiffs: Diff[] = []
      if (operationChanged) {
        operationDiffs = [...(methodData as WithAggregatedDiffs<GraphApiOperation>)[DIFFS_AGGREGATED_META_KEY] ?? []]
      }
      if (operationAddedOrRemoved) {
        const operationAddedOrRemovedDiff = (merged[type] as WithDiffMetaRecord<Record<string, GraphApiOperation>>)[DIFF_META_KEY]?.[operationKey]
        operationAddedOrRemovedDiff && operationDiffs.push(operationAddedOrRemovedDiff)
      }

      if (isEmpty(operationDiffs)) {
        continue
      }

      operationChanges.push(createOperationChange(apiType, operationDiffs, comparisonInternalDocumentId, previous, current, currentGroup, previousGroup))
      getOperationTags(current ?? previous).forEach(tag => tags.add(tag))
    }
  }

  let comparisonDocument: ComparisonDocument | undefined
  if (operationChanges.length) {
    comparisonDocument = createComparisonDocument(comparisonInternalDocumentId, merged)
  }

  return {
    operationChanges,
    tags,
    ...(comparisonDocument) ? { comparisonDocument } : {},
  }
}

function getCopyWithEmptyOperations(template: GraphApiSchema): GraphApiSchema {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { queries, mutations, subscriptions, ...rest } = template
  return {
    ...takeIf({ queries: {} }, !!queries),
    ...takeIf({ mutations: {} }, !!mutations),
    ...takeIf({ subscriptions: {} }, !!subscriptions),
    ...rest,
  }
}
