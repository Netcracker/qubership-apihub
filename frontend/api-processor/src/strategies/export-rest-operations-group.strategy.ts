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

import { createRestExportDocument } from '../apitypes/rest/rest.document'
import { BUILD_TYPE, FILE_FORMAT_HTML, FILE_FORMAT_JSON, REST_API_TYPE } from '../consts'
import { BuildResult, BuildTypeContexts, ExportDocument, ExportRestOperationsGroupBuildConfig } from '../types'
import { EXPORT_FORMAT_TO_FILE_FORMAT, getSplittedVersionKey } from '../utils'
import { createCommonStaticExportDocuments, createUnknownExportDocument, generateIndexHtmlPage } from '../utils/export'
import { MergedDocumentGroupStrategy } from './merged-document-group.strategy'
import { ExportOperationsGroupStrategy } from './export-operations-group.strategy'

export class ExportRestOperationsGroupStrategy extends ExportOperationsGroupStrategy<ExportRestOperationsGroupBuildConfig> {
  protected readonly supportedApiType = REST_API_TYPE

  async exportMergedDocument(
    config: ExportRestOperationsGroupBuildConfig,
    buildResult: BuildResult,
    contexts: BuildTypeContexts,
  ): Promise<void> {
    const {
      packageId,
      version: versionWithRevision,
      format = FILE_FORMAT_JSON,
      allowedOasExtensions,
    } = config
    const [version] = getSplittedVersionKey(versionWithRevision)
    const { templateResolver, packageResolver } = contexts.builderContext(config)
    const { name: packageName } = await packageResolver(packageId)

    await new MergedDocumentGroupStrategy().execute(
      {
        ...config,
        buildType: BUILD_TYPE.MERGED_SPECIFICATION,
        format: EXPORT_FORMAT_TO_FILE_FORMAT.get(format)!,
      },
      buildResult,
      contexts,
    )

    if (!buildResult.merged) {
      throw Error('No merged result')
    }

    buildResult.exportDocuments.push(
      await createRestExportDocument(
        buildResult.merged.filename,
        JSON.stringify(buildResult.merged?.data),
        format,
        packageName,
        version,
        templateResolver,
        allowedOasExtensions,
      ),
    )

    if (format === FILE_FORMAT_HTML) {
      buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver))
    }
  }

  async exportReducedDocuments(
    config: ExportRestOperationsGroupBuildConfig,
    buildResult: BuildResult,
    contexts: BuildTypeContexts,
  ): Promise<void> {
    const { version, packageName, templateResolver } = await this.resolveReducedDocuments(config, buildResult, contexts)

    const generatedHtmlExportDocuments: ExportDocument[] = []
    const transformedDocuments = await Promise.all([...buildResult.documents.values()].map(async document => {
      return createRestExportDocument?.(
        document.filename,
        JSON.stringify(document.data),
        config.format,
        packageName,
        version,
        templateResolver,
        config.allowedOasExtensions,
        generatedHtmlExportDocuments,
      )
    }))

    buildResult.exportDocuments.push(...transformedDocuments)

    if (config.format === FILE_FORMAT_HTML) {
      buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver))

      buildResult.exportDocuments.push(
        createUnknownExportDocument(
          'index.html',
          await generateIndexHtmlPage(packageName, version, generatedHtmlExportDocuments, templateResolver),
        ),
      )
    }
  }
}
