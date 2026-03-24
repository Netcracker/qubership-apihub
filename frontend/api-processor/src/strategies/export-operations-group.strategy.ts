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

import { BUILD_TYPE, FILE_FORMAT_JSON } from '../consts'
import {
  _TemplateResolver,
  BuilderStrategy,
  BuildResult,
  BuildTypeContexts,
  ExportOperationsGroupBuildConfig,
  OperationsApiType,
  TRANSFORMATION_KIND_MERGED,
  TRANSFORMATION_KIND_REDUCED,
} from '../types'
import { EXPORT_API_TYPE_FORMATS, getSplittedVersionKey } from '../utils'
import { DocumentGroupStrategy } from './document-group.strategy'

export interface ReducedDocumentsContext {
  version: string
  packageName: string
  templateResolver: _TemplateResolver
}

export abstract class ExportOperationsGroupStrategy<T extends ExportOperationsGroupBuildConfig> implements BuilderStrategy {
  protected abstract readonly supportedApiType: OperationsApiType

  async execute(
    config: T,
    buildResult: BuildResult,
    contexts: BuildTypeContexts,
  ): Promise<BuildResult> {
    const { apiType } = config
    if (apiType !== this.supportedApiType) {
      throw new Error(`This strategy is only supported for ${this.supportedApiType} apiType`)
    }

    switch (config.operationsSpecTransformation) {
      case TRANSFORMATION_KIND_MERGED:
        await this.exportMergedDocument(config, buildResult, contexts)
        break
      case TRANSFORMATION_KIND_REDUCED:
        await this.exportReducedDocuments(config, buildResult, contexts)
        break
    }

    const { packageId, version: versionWithRevision, format = FILE_FORMAT_JSON, groupName } = config
    const [version] = getSplittedVersionKey(versionWithRevision)
    if (buildResult.exportDocuments.length > 1) {
      buildResult.exportFileName = `${packageId}_${version}_${groupName}.zip`
      return buildResult
    }

    buildResult.exportFileName = `${packageId}_${version}_${groupName}.${format}`
    return buildResult
  }

  protected abstract exportMergedDocument(
    config: T,
    buildResult: BuildResult,
    contexts: BuildTypeContexts,
  ): Promise<void>

  protected abstract exportReducedDocuments(
    config: T,
    buildResult: BuildResult,
    contexts: BuildTypeContexts,
  ): Promise<void>

  protected async resolveReducedDocuments(
    config: T,
    buildResult: BuildResult,
    contexts: BuildTypeContexts,
  ): Promise<ReducedDocumentsContext> {
    const { packageId, version: versionWithRevision, apiType } = config
    const [version] = getSplittedVersionKey(versionWithRevision)
    const { templateResolver, packageResolver } = contexts.builderContext(config)
    const { name: packageName } = await packageResolver(packageId)

    const availableFormatsForApiType = EXPORT_API_TYPE_FORMATS.get(apiType)
    const documentFormat = availableFormatsForApiType?.get(config.format)
    if (!documentFormat) {
      throw new Error(`Export format is not supported: ${config.format}`)
    }

    await new DocumentGroupStrategy().execute(
      { ...config, buildType: BUILD_TYPE.REDUCED_SOURCE_SPECIFICATIONS, format: documentFormat },
      buildResult,
      contexts,
    )

    return { version, packageName, templateResolver }
  }
}
