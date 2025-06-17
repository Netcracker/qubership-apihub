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
  ExportRestDocumentBuildConfig,
  HTML_EXPORT_GROUP_FORMAT,
  OperationsGroupExportFormat,
} from '../types'
import { getDocumentTitle, getSplittedVersionKey } from '../utils'
import { OpenApiExtensionKey } from '@netcracker/qubership-apihub-api-unifier'
import { createCommonStaticExportDocuments, createSingleFileExportName } from '../utils/export'
import { createRestExportDocument } from '../apitypes/rest/rest.document'

async function createTransformedDocument(
  file: File,
  format: OperationsGroupExportFormat,
  packageName: string,
  version: string,
  templateResolver: _TemplateResolver,
  createExportDocument: DocumentExporter,
  allowedOasExtensions?: OpenApiExtensionKey[],
  generatedHtmlExportDocuments?: ExportDocument[],
): Promise<ExportDocument> {
  return createExportDocument?.(file.name, await file.text(), format, packageName, version, templateResolver, allowedOasExtensions, generatedHtmlExportDocuments)
}

export class ExportRestDocumentStrategy implements BuilderStrategy {
  async execute(config: ExportRestDocumentBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { builderContext } = contexts
    const { rawDocumentResolver, templateResolver, packageResolver } = builderContext(config)
    const { packageId, version: versionWithRevision, documentId, format, allowedOasExtensions } = config
    const [version] = getSplittedVersionKey(versionWithRevision)

    const file = await rawDocumentResolver(
      versionWithRevision,
      packageId,
      documentId,
    )
    const { name: packageName } = await packageResolver(packageId)

    buildResult.exportDocuments.push(await createTransformedDocument(file, format, packageName, version, templateResolver, createRestExportDocument, allowedOasExtensions))

    if (format === HTML_EXPORT_GROUP_FORMAT) {
      buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver, buildResult.exportDocuments[0].filename))
      buildResult.exportFileName = createSingleFileExportName(packageId, version, getDocumentTitle(file.name), 'zip')
      return buildResult
    }

    buildResult.exportFileName = createSingleFileExportName(packageId, version, getDocumentTitle(file.name), format)

    return buildResult
  }
}
