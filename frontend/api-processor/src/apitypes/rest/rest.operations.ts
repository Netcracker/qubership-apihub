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

import { OpenAPIV3 } from 'openapi-types'

import { buildRestOperation } from './rest.operation'
import { OperationsBuilder } from '../../types'
import {
  calculateOperationId,
  createBundlingErrorHandler,
  removeComponents,
} from '../../utils'
import type * as TYPE from './rest.types'
import { HASH_FLAG, INLINE_REFS_FLAG, NORMALIZE_OPTIONS, ORIGINS_SYMBOL } from '../../consts'
import { asyncFunction } from '../../utils/async'
import { logLongBuild, syncDebugPerformance } from '../../utils/logs'
import { normalize, RefErrorType } from '@netcracker/qubership-apihub-api-unifier'
import { extractOperationBasePath } from '@netcracker/qubership-apihub-api-diff'

export const buildRestOperations: OperationsBuilder<OpenAPIV3.Document> = async (document, ctx, debugCtx) => {
  const documentWithoutComponents = removeComponents(document.data)
  const bundlingErrorHandler = createBundlingErrorHandler(ctx, document.fileId)

  const { effectiveDocument, refsOnlyDocument } = syncDebugPerformance('[NormalizeDocument]', () => {
    const effectiveDocument = normalize(
      documentWithoutComponents,
      {
        ...NORMALIZE_OPTIONS,
        originsFlag: ORIGINS_SYMBOL,
        hashFlag: HASH_FLAG,
        source: document.data,
        onRefResolveError: (message: string, _path: PropertyKey[], _ref: string, errorType: RefErrorType) =>
          bundlingErrorHandler([{ message, errorType }]),
      },
    ) as OpenAPIV3.Document
    const refsOnlyDocument = normalize(
      documentWithoutComponents,
      {
        mergeAllOf: false,
        inlineRefsFlag: INLINE_REFS_FLAG,
        source: document.data,
      },
    ) as OpenAPIV3.Document
    return { effectiveDocument, refsOnlyDocument }
  },
    debugCtx,
  )

  const { paths, servers } = effectiveDocument

  const operations: TYPE.VersionRestOperation[] = []
  if (!paths) { return [] }

  const componentsHashMap = new Map<string, string>()
  for (const path of Object.keys(paths)) {
    // Validate path parameters: empty parameter names are not allowed
    if (path.includes('{}')) {
      throw new Error(`Invalid path '${path}': path parameter name could not be empty`)
    }

    const pathData = paths[path]
    if (typeof pathData !== 'object' || !pathData) { continue }

    for (const key of Object.keys(pathData)) {
      if (!Object.values(OpenAPIV3.HttpMethods).includes(key as OpenAPIV3.HttpMethods)) { continue }

      await asyncFunction(() => {
        const methodData = pathData[key as OpenAPIV3.HttpMethods]
        const basePath = extractOperationBasePath(methodData?.servers || pathData?.servers || servers || [])
        const operationId = calculateOperationId(basePath, key, path)

        syncDebugPerformance('[Operation]', (innerDebugCtx) =>
          logLongBuild(() => {
            const operation = buildRestOperation(
              operationId,
              path,
              <OpenAPIV3.HttpMethods>key,
              document,
              effectiveDocument,
              refsOnlyDocument,
              basePath,
              ctx.notifications,
              ctx.config,
              componentsHashMap,
              innerDebugCtx,
            )
            operations.push(operation)
          },
            `${ctx.config.packageId}/${ctx.config.version} ${operationId}`,
          ), debugCtx, [operationId])
      })
    }

  }
  return operations
}
