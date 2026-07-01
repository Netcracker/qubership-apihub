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
import { compareVersions } from '../components'
import { applyBuilderVersionInfo } from '../validators'
import { getOperationsList } from '../utils'
import { buildFiles } from '../components/files'
import { createDuplicateOperationHandler, processOperationDocument } from '../components/operations'
import {
  createDuplicateMcpEntityHandler,
  processMcpDocument,
  validateMcpCapabilities,
  validateMcpInitRequired,
  validateMcpProtocolVersion,
} from '../components/mcp'
import { calculateHistoryForDeprecatedItems } from '../components/deprecated'
import { MCP_API_TYPE, REST_API_TYPE } from '../consts'

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
      const handleDuplicateMcp = createDuplicateMcpEntityHandler()

      for (const { file, document, builder } of buildFilesResult) {
        buildResult.documents.set(document.fileId, document)
        if (!builder || document.publish === false) { continue }

        if (builder.apiType === MCP_API_TYPE) {
          processMcpDocument(file, document, builder, buildResult, handleDuplicateMcp)
        } else {
          await processOperationDocument(document, builder, builderContextObject, buildResult, handleDuplicateOperation)
        }
      }

      // whole-set cross-check: needs all entities collected first (init and its tools/resources/prompts
      // may live in different files), mirroring how calculateHistoryForDeprecatedItems runs after the loop
      validateMcpInitRequired(buildResult.mcpEntities)
      validateMcpProtocolVersion(buildResult.documents)
      validateMcpCapabilities(buildResult.mcpEntities, buildResult.documents, buildResult.notifications)

      if (!builderContextObject.builderRunOptions.withoutDeprecatedDepth && previousVersionCache) {
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
      const compareResult = await compareVersions(
        [previousVersionCache.version, previousVersionPackageId || packageId],
        [version, packageId],
        compareContextObject,
      )
      buildResult.comparisons = compareResult.comparisons
      applyBuilderVersionInfo(config, compareResult)
    }

    return buildResult
  }
}
