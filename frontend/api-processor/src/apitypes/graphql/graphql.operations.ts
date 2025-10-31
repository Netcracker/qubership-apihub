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

import type { VersionGraphQLOperation } from './graphql.types'
import { removeComponents, slugify } from '../../utils'
import type { OperationsBuilder } from '../../types'
import { GRAPHQL_TYPE, GRAPHQL_TYPE_KEYS } from './graphql.consts'
import { INLINE_REFS_FLAG, NORMALIZE_OPTIONS, ORIGINS_SYMBOL } from '../../consts'
import { GraphApiSchema } from '@netcracker/qubership-apihub-graphapi'
import { buildGraphQLOperation } from './graphql.operation'
import { asyncFunction } from '../../utils/async'
import { logLongBuild, syncDebugPerformance } from '../../utils/logs'
import { normalize } from '@netcracker/qubership-apihub-api-unifier'

export const buildGraphQLOperations: OperationsBuilder<GraphApiSchema> = async (document, ctx, debugCtx) => {
  const { notifications } = ctx

  const documentWithoutComponents = removeComponents(document.data) as GraphApiSchema

  const { effectiveDocument, refsOnlyDocument } = syncDebugPerformance('[NormalizeDocument]', () => {
    const effectiveDocument = normalize(
      documentWithoutComponents,
      {
        ...NORMALIZE_OPTIONS,
        originsFlag: ORIGINS_SYMBOL,
        source: document.data,
      },
    ) as GraphApiSchema
    const refsOnlyDocument = normalize(
      documentWithoutComponents,
      {
        mergeAllOf: false,
        inlineRefsFlag: INLINE_REFS_FLAG,
        source: document.data,
      },
    ) as GraphApiSchema
    return { effectiveDocument, refsOnlyDocument }
  },
    debugCtx,
  )


  const { queries, mutations, subscriptions } = documentWithoutComponents
  const operations: VersionGraphQLOperation[] = []
  if (!queries && !mutations && !subscriptions) {
    return []
  }

  for (const type of GRAPHQL_TYPE_KEYS) {
    const operationsByType = documentWithoutComponents[type]
    if (typeof operationsByType !== 'object' || !operationsByType) { continue }

    for (const operationKey of Object.keys(operationsByType)) {
      await asyncFunction(async () => {
        const operationId = slugify(`${GRAPHQL_TYPE[type]}-${operationKey}`)

        syncDebugPerformance('[Operation]', (innerDebugCtx) =>
          logLongBuild(() => {
            const operation: VersionGraphQLOperation = buildGraphQLOperation(
              operationId,
              type,
              operationKey,
              document,
              effectiveDocument,
              refsOnlyDocument,
              notifications,
              ctx.config,
              innerDebugCtx,
            )
            operations.push(operation)
          }, `${ctx.config.packageId}/${ctx.config.version} ${operationId}`,
        ),debugCtx, [operationId])
      })
    }
  }
  return operations
}
