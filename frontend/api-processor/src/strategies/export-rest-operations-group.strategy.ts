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

import {
  BuilderStrategy,
  BuildResult,
  BuildTypeContexts,
  ExportDocument,
  ExportRestOperationsGroupBuildConfig,
  TRANSFORMATION_KIND_MERGED,
  TRANSFORMATION_KIND_REDUCED,
} from '../types'
import { DocumentGroupStrategy } from './document-group.strategy'
import { MergedDocumentGroupStrategy } from './merged-document-group.strategy'
import { EXPORT_FORMAT_TO_FILE_FORMAT, getSplittedVersionKey } from '../utils'
import { BUILD_TYPE, FILE_FORMAT_HTML, FILE_FORMAT_JSON } from '../consts'
import { createCommonStaticExportDocuments, createUnknownExportDocument, generateIndexHtmlPage } from '../utils/export'
import { createRestExportDocument } from '../apitypes/rest/rest.document'
import { isRestDocument } from '../apitypes'

export class ExportRestOperationsGroupStrategy implements BuilderStrategy {
  async execute(config: ExportRestOperationsGroupBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    switch (config.operationsSpecTransformation) {
      case TRANSFORMATION_KIND_MERGED:
        await exportMergedDocument(config, buildResult, contexts)
        break
      case TRANSFORMATION_KIND_REDUCED:
        await exportReducedDocuments(config, buildResult, contexts)
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
}

async function exportMergedDocument(config: ExportRestOperationsGroupBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<void> {
  const {
    packageId,
    version: versionWithRevision,
    format = FILE_FORMAT_JSON,
    allowedOasExtensions,
  } = config
  const [version] = getSplittedVersionKey(versionWithRevision)
  const { templateResolver, packageResolver } = contexts.builderContext(config)
  const { name: packageName } = await packageResolver(packageId)

  await new MergedDocumentGroupStrategy().execute({
    ...config,
    buildType: BUILD_TYPE.MERGED_SPECIFICATION,
    format: EXPORT_FORMAT_TO_FILE_FORMAT.get(format)!,
  }, buildResult, contexts)

  if (!buildResult.merged) {
    throw Error('No merged result')
  }

  buildResult.exportDocuments.push(await createRestExportDocument(buildResult.merged.filename, JSON.stringify(buildResult.merged?.data), format, packageName, version, templateResolver, allowedOasExtensions))

  if (format === FILE_FORMAT_HTML) {
    buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver, buildResult.exportDocuments[0].filename))
  }
}

async function exportReducedDocuments(config: ExportRestOperationsGroupBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<void> {
  const {
    packageId,
    version: versionWithRevision,
    format = FILE_FORMAT_JSON,
    allowedOasExtensions,
  } = config
  const [version] = getSplittedVersionKey(versionWithRevision)
  const { templateResolver, packageResolver } = contexts.builderContext(config)
  const { name: packageName } = await packageResolver(packageId)

  await new DocumentGroupStrategy().execute({
    ...config,
    buildType: BUILD_TYPE.REDUCED_SOURCE_SPECIFICATIONS,
    format: EXPORT_FORMAT_TO_FILE_FORMAT.get(format)!,
  }, buildResult, contexts)

  const generatedHtmlExportDocuments: ExportDocument[] = []
  const restDocuments = [...buildResult.documents.values()].filter(isRestDocument)
  const transformedDocuments = await Promise.all([...buildResult.documents.values()].map(async document => {
    return createRestExportDocument?.(document.filename, JSON.stringify(document.data), format, packageName, version, templateResolver, allowedOasExtensions, generatedHtmlExportDocuments, restDocuments.length > 1)
  }))

  buildResult.exportDocuments.push(...transformedDocuments)

  if (format === FILE_FORMAT_HTML) {
    const shouldAddIndexPage = generatedHtmlExportDocuments.length > 1
    buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver, shouldAddIndexPage ? 'index.html' : buildResult.exportDocuments[0].filename))

    if (shouldAddIndexPage) {
      buildResult.exportDocuments.push(createUnknownExportDocument('index.html', await generateIndexHtmlPage(packageName, version, generatedHtmlExportDocuments, templateResolver)))
    }
  }
}
