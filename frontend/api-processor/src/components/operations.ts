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

import type { ApiBuilder, BuilderContext, BuildResult, VersionDocument } from '../types'
import { DuplicateOperationHandler, setReportingDuplicate } from '../utils'
import { ASYNCAPI_API_TYPE, MESSAGE_SEVERITY } from '../consts'

export const createDuplicateOperationHandler = (buildResult: BuildResult): DuplicateOperationHandler => (existing, duplicate) => {
  if (duplicate.apiType === ASYNCAPI_API_TYPE) {
    throw new Error(
      `Duplicated operationId '${duplicate.operationId}' found in different documents: ` +
      `'${existing.documentId}' and '${duplicate.documentId}'`,
    )
  }
  buildResult.notifications.push({
    severity: MESSAGE_SEVERITY.Error,
    message: `Duplicated operationId '${duplicate.operationId}' found in different documents: ` +
      `'${existing.documentId}' and '${duplicate.documentId}'`,
    operationId: duplicate.operationId,
    fileId: duplicate.documentId,
  })
}

export async function processOperationDocument(
  document: VersionDocument,
  builder: ApiBuilder,
  ctx: BuilderContext,
  buildResult: BuildResult,
  onDuplicate?: DuplicateOperationHandler,
): Promise<void> {
  if (!builder.buildOperations) { return }
  const operations = await builder.buildOperations(document, ctx)
  document.operationIds = operations.map(({ operationId }) => operationId)
  for (const operation of operations) {
    setReportingDuplicate(buildResult.operations, operation.operationId, operation, onDuplicate)
  }
}
