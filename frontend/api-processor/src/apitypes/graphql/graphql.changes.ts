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
import { buildSchema } from 'graphql/utilities'
import { buildGraphQLDocument } from './graphql.document'
import {
  CompareOperationsPairContext,
  ComparisonDocument,
  DocumentsCompare,
  DocumentsCompareData,
  FILE_KIND,
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

export const compareDocuments: DocumentsCompare = async (
  operationsMap: OperationsMap,
  prevDoc: ResolvedVersionDocument | undefined,
  currDoc: ResolvedVersionDocument | undefined,
  ctx: CompareOperationsPairContext,
): Promise<DocumentsCompareData> => {
  const { apiType, rawDocumentResolver, previousVersion, currentVersion, previousPackageId, currentPackageId } = ctx
  const comparisonInternalDocumentId = createComparisonInternalDocumentId(prevDoc, currDoc, previousVersion, currentVersion)
  const prevFile = prevDoc && await rawDocumentResolver(previousVersion, previousPackageId, prevDoc.slug)
  const currFile = currDoc && await rawDocumentResolver(currentVersion, currentPackageId, currDoc.slug)
  const prevDocSchema = prevFile && buildSchema(await prevFile.text(), { noLocation: true })
  const currDocSchema = currFile && buildSchema(await currFile.text(), { noLocation: true })

  let prevDocData = prevDocSchema && (await buildGraphQLDocument({
    ...prevDoc,
    source: prevFile,
    kind: FILE_KIND.TEXT,
    data: prevDocSchema,
  }, prevDoc)).data
  let currDocData = currDocSchema && (await buildGraphQLDocument({
    ...currDoc,
    source: currFile,
    kind: FILE_KIND.TEXT,
    data: currDocSchema,
  }, currDoc)).data

  if (!prevDocData && currDocData) {
    prevDocData = getCopyWithEmptyOperations(currDocData)
  }
  if (prevDocData && !currDocData) {
    currDocData = getCopyWithEmptyOperations(prevDocData)
  }

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
