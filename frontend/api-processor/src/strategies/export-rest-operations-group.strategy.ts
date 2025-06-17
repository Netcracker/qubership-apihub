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
  _TemplateResolver,
  BuilderStrategy,
  BuildResult,
  BuildTypeContexts,
  DocumentExporter,
  ExportDocument,
  ExportRestOperationsGroupBuildConfig,
  HTML_EXPORT_GROUP_FORMAT,
  JSON_EXPORT_GROUP_FORMAT,
  OperationsGroupExportFormat,
  TRANSFORMATION_KIND_MERGED,
  TRANSFORMATION_KIND_REDUCED,
} from '../types'
import { DocumentGroupStrategy } from './document-group.strategy'
import { MergedDocumentGroupStrategy } from './merged-document-group.strategy'
import { EXPORT_FORMAT_TO_FILE_FORMAT, getSplittedVersionKey } from '../utils'
import { OpenApiExtensionKey } from '@netcracker/qubership-apihub-api-unifier'
import { BUILD_TYPE } from '../consts'
import { createCommonStaticExportDocuments, createUnknownExportDocument, generateIndexHtmlPage } from '../utils/export'
import { createRestExportDocument } from '../apitypes/rest/rest.document'

export class ExportRestOperationsGroupStrategy implements BuilderStrategy {
  async execute(config: ExportRestOperationsGroupBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {

    switch (config.operationsSpecTransformation) {
      case TRANSFORMATION_KIND_MERGED:
        await exportMergedDocument(config, buildResult, contexts)
        return buildResult
      case TRANSFORMATION_KIND_REDUCED:
        await exportReducedDocuments(config, buildResult, contexts)
        return buildResult
    }
  }
}

async function exportMergedDocument(config: ExportRestOperationsGroupBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
  const {
    packageId,
    version: versionWithRevision,
    groupName,
    format = JSON_EXPORT_GROUP_FORMAT,
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

  if (format === HTML_EXPORT_GROUP_FORMAT) {
    buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver))
    buildResult.exportFileName = `${packageId}_${version}_${groupName}.zip`
    return buildResult
  }

  buildResult.exportFileName = `${packageId}_${version}_${groupName}.${format}`

  return buildResult
}

async function exportReducedDocuments(config: ExportRestOperationsGroupBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
  const {
    packageId,
    version: versionWithRevision,
    groupName,
    format = JSON_EXPORT_GROUP_FORMAT,
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
  const transformedDocuments = await Promise.all([...buildResult.documents.values()].map(async document => {
    return await createTransformedDocument(document.filename, JSON.stringify(document.data), format, packageName, version, templateResolver, createRestExportDocument, allowedOasExtensions, generatedHtmlExportDocuments)
  }))

  buildResult.exportDocuments.push(...transformedDocuments)

  if (format === HTML_EXPORT_GROUP_FORMAT) {
    buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver))

    if (generatedHtmlExportDocuments.length > 1) {
      buildResult.exportDocuments.push(createUnknownExportDocument('index.html', await generateIndexHtmlPage(packageName, version, generatedHtmlExportDocuments, templateResolver)))
    }
  }

  if (buildResult.exportDocuments.length > 1) {
    buildResult.exportFileName = `${packageId}_${version}_${groupName}.zip`
    return buildResult
  }

  buildResult.exportFileName = `${packageId}_${version}_${groupName}.${format}`
  return buildResult
}

async function createTransformedDocument(
  filename: string,
  data: string,
  format: OperationsGroupExportFormat,
  packageName: string,
  version: string,
  templateResolver: _TemplateResolver,
  createExportDocument: DocumentExporter,
  allowedOasExtensions?: OpenApiExtensionKey[],
  generatedHtmlExportDocuments?: ExportDocument[],
): Promise<ExportDocument> {
  return createExportDocument?.(filename, data, format, packageName, version, templateResolver, allowedOasExtensions, generatedHtmlExportDocuments)
}
