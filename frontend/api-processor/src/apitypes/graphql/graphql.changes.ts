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

import { VersionGraphQLOperation } from './graphql.types'
import { isEmpty, removeComponents, removeFirstSlash, slugify, takeIf } from '../../utils'
import {
  apiDiff,
  COMPARE_MODE_OPERATION,
  DEFAULT_DIFFS_AGGREGATED_META_KEY,
  Diff,
  DIFF_META_KEY,
} from '@netcracker/qubership-apihub-api-diff'
import { NORMALIZE_OPTIONS, ORIGINS_SYMBOL } from '../../consts'
import { GraphApiOperation, GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { buildSchema } from 'graphql/utilities'
import { buildGraphQLDocument } from './graphql.document'
import {
  CompareContext,
  FILE_KIND,
  NormalizedOperationId,
  OperationChanges,
  OperationsApiType,
  ResolvedOperation,
  ResolvedVersionDocument,
  WithAggregatedDiffs,
  WithDiffMetaRecord,
} from '../../types'
import { GRAPHQL_TYPE, GRAPHQL_TYPE_KEYS } from './graphql.consts'
import { createOperationChange, getOperationTags } from '../../components'

export const compareDocuments = async (apiType: OperationsApiType, operationsMap: Record<NormalizedOperationId, {
  previous?: ResolvedOperation
  current?: ResolvedOperation
}>, prevFile: File, currFile: File, currDoc: ResolvedVersionDocument, prevDoc: ResolvedVersionDocument, ctx: CompareContext): Promise<{
  operationChanges: OperationChanges[]
  tags: string[]
}> => {
  const prevDocSchema = buildSchema(await prevFile.text(), { noLocation: true })
  const currDocSchema = buildSchema(await currFile.text(), { noLocation: true })

  const prevDocData = (await buildGraphQLDocument({
    ...prevDoc,
    source: prevFile,
    kind: FILE_KIND.TEXT,
    data: prevDocSchema,
  }, prevDoc)).data
  const currDocData = (await buildGraphQLDocument({
    ...currDoc,
    source: currFile,
    kind: FILE_KIND.TEXT,
    data: currDocSchema,
  }, currDoc)).data

  const { merged, diffs } = apiDiff(
    prevDocData,
    currDocData,
    {
      ...NORMALIZE_OPTIONS,
      metaKey: DIFF_META_KEY,
      originsFlag: ORIGINS_SYMBOL,
      diffsAggregatedFlag: DEFAULT_DIFFS_AGGREGATED_META_KEY,
      // mode: COMPARE_MODE_OPERATION,
      normalizedResult: true,
    },
  ) as {merged: GraphApiSchema; diffs: Diff[]}

  if (isEmpty(diffs)) {
    return { operationChanges: [], tags: [] }
  }

  let operationDiffs: Diff[] = []

  const { currentGroup, previousGroup } = ctx.config
  const currGroupSlug = slugify(removeFirstSlash(currentGroup || ''))
  const prevGroupSlug = slugify(removeFirstSlash(previousGroup || ''))

  const tags = new Set<string>()
  const changedOperations: OperationChanges[] = []

  for (const type of GRAPHQL_TYPE_KEYS) {
    const operationsByType = merged[type]
    if (!operationsByType) { continue }

    for (const operationKey of Object.keys(operationsByType)) {
      const operationId = slugify(`${GRAPHQL_TYPE[type]}-${operationKey}`)
      const methodData = operationsByType[operationKey]

      const { current, previous } = operationsMap[operationId] ?? {}
      if (current && previous) {
        operationDiffs = [...(methodData as WithAggregatedDiffs<GraphApiOperation>)[DEFAULT_DIFFS_AGGREGATED_META_KEY]]
      } else if (current || previous) {
        for (const type of GRAPHQL_TYPE_KEYS) {
          const operationsByType = (merged[type] as WithDiffMetaRecord<Record<string, GraphApiOperation>>)?.[DIFF_META_KEY]
          if (!operationsByType) { continue }
          operationDiffs.push(...Object.values(operationsByType))
        }
        if (isEmpty(operationDiffs)) {
          throw new Error('should not happen')
        }
      }

      if (isEmpty(operationDiffs)) {
        continue
      }

      changedOperations.push(createOperationChange(apiType, operationDiffs, previous, current, currGroupSlug, prevGroupSlug, currentGroup, previousGroup))
      getOperationTags(current ?? previous).forEach(tag => tags.add(tag))
    }
  }

  return { operationChanges: changedOperations, tags: [...tags.values()] }
}

/** @deprecated */
export const graphqlOperationsCompare = async (current: VersionGraphQLOperation | undefined, previous: VersionGraphQLOperation | undefined): Promise<Diff[]> => {
  let previousOperation = removeComponents(previous?.data)
  let currentOperation = removeComponents(current?.data)
  if (!previousOperation && currentOperation) {
    previousOperation = getCopyWithEmptyOperations(currentOperation as GraphApiSchema)
  }

  if (previousOperation && !currentOperation) {
    currentOperation = getCopyWithEmptyOperations(previousOperation as GraphApiSchema)
  }

  //todo think about normalize options
  const { diffs } = apiDiff(
    previousOperation,
    currentOperation,
    {
      ...NORMALIZE_OPTIONS,
      mode: COMPARE_MODE_OPERATION,
      normalizedResult: true,
      beforeSource: previous?.data,
      afterSource: current?.data,
    },
  )
  return diffs
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
