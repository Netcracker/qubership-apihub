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
  ExportVersionBuildConfig,
  HTML_EXPORT_GROUP_FORMAT,
  JSON_EXPORT_GROUP_FORMAT,
  OperationsGroupExportFormat,
} from '../types'
import { getDocumentTitle, getSplittedVersionKey } from '../utils'
import {
  createCommonStaticExportDocuments,
  createSingleFileExportName,
  createUnknownExportDocument,
  generateIndexHtmlPage,
} from '../utils/export'
import { OpenApiExtensionKey } from '@netcracker/qubership-apihub-api-unifier'
import { unknownApiBuilder } from '../apitypes'

async function createTransformedDocument(
  file: File,
  format: OperationsGroupExportFormat,
  packageName: string,
  version: string,
  templateResolver: _TemplateResolver,
  createExportDocument?: DocumentExporter,
  allowedOasExtensions?: OpenApiExtensionKey[],
  generatedHtmlExportDocuments?: ExportDocument[],
): Promise<ExportDocument> {
  return createExportDocument?.(file.name, await file.text(), format, packageName, version, templateResolver, allowedOasExtensions, generatedHtmlExportDocuments) ?? createUnknownExportDocument(file.name, file)
}

export class ExportVersionStrategy implements BuilderStrategy {
  async execute(config: ExportVersionBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { builderContext } = contexts
    const {
      versionDocumentsResolver,
      rawDocumentResolver,
      templateResolver,
      packageResolver,
      apiBuilders,
    } = builderContext(config)
    const { packageId, version: versionWithRevision, format = JSON_EXPORT_GROUP_FORMAT, allowedOasExtensions } = config
    const [version] = getSplittedVersionKey(versionWithRevision)
    const { name: packageName } = await packageResolver(packageId)

    const { documents } = await versionDocumentsResolver(
      versionWithRevision,
      packageId,
    ) ?? { documents: [] }

    const generatedHtmlExportDocuments: ExportDocument[] = []
    const transformedDocuments = await Promise.all(documents.map(async document => {
      const apiBuilder = apiBuilders.find(({ types }) => types.includes(document.type)) || unknownApiBuilder
      const file = await rawDocumentResolver(versionWithRevision, packageId, document.slug)
      return await createTransformedDocument(file, format, packageName, version, templateResolver, apiBuilder.createExportDocument, allowedOasExtensions, generatedHtmlExportDocuments)
    }))

    buildResult.exportDocuments.push(...transformedDocuments)

    if (format === HTML_EXPORT_GROUP_FORMAT && generatedHtmlExportDocuments.length > 0) {
      buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver))
      const readme = await buildResult.exportDocuments.find(({ filename }) => filename.toLowerCase() === 'readme.md')?.data.text()

      if (generatedHtmlExportDocuments.length > 1 || readme) {
        buildResult.exportDocuments.push(createUnknownExportDocument('index.html', await generateIndexHtmlPage(packageName, version, generatedHtmlExportDocuments, templateResolver, readme)))
      }
    }

    if (buildResult.exportDocuments.length > 1) {
      buildResult.exportFileName = `${packageId}_${version}.zip`
      return buildResult
    }

    buildResult.exportFileName = createSingleFileExportName(packageId, version, getDocumentTitle(buildResult.exportDocuments[0].filename), format)
    return buildResult
  }
}
