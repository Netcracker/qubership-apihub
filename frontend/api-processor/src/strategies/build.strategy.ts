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

import { BuildConfig, BuilderStrategy, BuildResult, BuildTypeContexts, VersionCache } from '../types'
import { compareVersions } from '../components/compare'
import { DuplicateOperationHandler, getOperationsList, setDocument } from '../utils'
import { buildFiles } from '../components/files'
import { calculateHistoryForDeprecatedItems } from '../components/deprecated'
import { ASYNCAPI_API_TYPE, MESSAGE_SEVERITY, REST_API_TYPE } from '../consts'

/**
 * Handles duplicate operationIds found across different documents during build.
 * - AsyncAPI: throws an error, since duplicate operationIds across documents are not allowed.
 * - REST: adds an error notification (non-fatal), since existing published specs may already have duplicates.
 */
const createDuplicateOperationHandler = (buildResult: BuildResult): DuplicateOperationHandler => (existing, duplicate) => {
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

export class BuildStrategy implements BuilderStrategy {
  async execute(config: BuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const {
      previousVersionPackageId,
      packageId,
      version,
      previousVersion,
      files,
      refs,
    } = config

    const { builderContext, compareContext } = contexts
    const builderContextObject = builderContext(config)
    const compareContextObject = compareContext(config)

    let previousVersionCache: VersionCache | null = null
    if (previousVersion) {
      previousVersionCache = await compareContextObject.versionResolver(previousVersion, previousVersionPackageId || packageId)
    }

    if (!files?.length && !refs?.length) {
      throw new Error('Incorrect config: No files and refs')
    }

    if (files?.length) {
      const buildFilesResult = await buildFiles(files, builderContextObject)
      const handleDuplicateOperation = createDuplicateOperationHandler(buildResult)
      for (const { document, operations = [] } of buildFilesResult) {
        setDocument(buildResult, document, operations, handleDuplicateOperation)
      }

      if (!builderContextObject.builderRunOptions.withoutDeprecatedDepth && previousVersionCache) {
        // add deprecated depth
        await calculateHistoryForDeprecatedItems(
          REST_API_TYPE,
          getOperationsList(buildResult),
          previousVersionCache!.version,
          previousVersionPackageId || packageId,
          builderContextObject,
        )
      }
    }

    if (!builderContextObject.builderRunOptions.withoutChangelog && previousVersionCache) {
      buildResult.comparisons = await compareVersions(
        [previousVersionCache.version, previousVersionPackageId || packageId],
        [version, packageId],
        compareContextObject,
      )
    }

    return buildResult
  }
}
