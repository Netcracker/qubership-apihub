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

import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { OpenAPIV3 } from 'openapi-types'
import { ContestedDocumentPair } from '../../components/contested-operations'
import { OperationId } from '../../types'
import { calculateRestOperationId, isEmpty } from '../../utils'
import { contestedOperationDiffs, diffRestDocuments } from './rest.utils'

/**
 * Split the diffs of one comparison of a document pair between the operationIds both documents derive. An id the
 * documents describe alike gets an empty list; an id no walked operation derives is left out.
 *
 * Accepted blind spot: apiDiff's path mapping unifies two paths of one shape (`/{a}/{b}` and `/{c}/{d}`) and drops
 * one of them, so a difference under the dropped path reads as none.
 */
export function compareContestedOperations(pair: ContestedDocumentPair): Map<OperationId, Diff[]> {
  const diffsByOperationId = new Map<OperationId, Diff[]>(pair.operations.map(({ operationId }) => [operationId, []]))

  const { merged, operations } = diffRestDocuments(
    pair.anchorDocument.data as OpenAPIV3.Document,
    pair.otherDocument.data as OpenAPIV3.Document,
    pair.anchorDocument.apiKind,
    pair.otherDocument.apiKind,
  )
  if (isEmpty(operations)) return diffsByOperationId

  const foundOperationIds = new Set<OperationId>()
  for (const { path, method, operation, previousBasePath, currentBasePath } of operations) {
    const operationDiffs = contestedOperationDiffs(merged, path, method, operation)

    for (
      const operationId of new Set([
        calculateRestOperationId(previousBasePath, path, method),
        calculateRestOperationId(currentBasePath, path, method),
      ])
    ) {
      const contestedDiffs = diffsByOperationId.get(operationId)
      if (!contestedDiffs) continue
      contestedDiffs.push(...operationDiffs)
      foundOperationIds.add(operationId)
    }
  }

  const missingOperationIds = [...diffsByOperationId.keys()].filter(operationId => !foundOperationIds.has(operationId))
  missingOperationIds.forEach(operationId => diffsByOperationId.delete(operationId))

  return diffsByOperationId
}
