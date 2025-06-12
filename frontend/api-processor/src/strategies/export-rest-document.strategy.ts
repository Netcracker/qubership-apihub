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
  ExportRestDocumentBuildConfig,
  HTML_EXPORT_GROUP_FORMAT,
  OperationsGroupExportFormat,
  ZippableDocument,
} from '../types'
import { REST_DOCUMENT_TYPE } from '../apitypes'
import { getDocumentTitle, getSplittedVersionKey } from '../utils'
import { OpenApiExtensionKey } from '@netcracker/qubership-apihub-api-unifier'
import { removeOasExtensions } from '../utils/removeOasExtensions'
import {
  createCommonStaticExportDocuments,
  createExportDocument,
  createSingleFileExportName,
  generateHtmlPage,
} from '../utils/export'

async function createTransformedDocument(
  file: File,
  format: OperationsGroupExportFormat,
  packageName: string,
  version: string,
  templateResolver: _TemplateResolver,
  allowedOasExtensions?: OpenApiExtensionKey[],
): Promise<ZippableDocument> {
  const data = removeOasExtensions(JSON.parse(await file.text()), allowedOasExtensions)

  if (format === HTML_EXPORT_GROUP_FORMAT) {
    return createExportDocument(
      `${getDocumentTitle(file.name)}.${HTML_EXPORT_GROUP_FORMAT}`,
      await generateHtmlPage(JSON.stringify(data, undefined, 2), getDocumentTitle(file.name), packageName, version, templateResolver),
    )
  }

  return {
    data: data,
    fileId: file.name,
    type: REST_DOCUMENT_TYPE.OAS3, // todo one of REST_DOCUMENT_TYPE
    description: '',
    publish: true,
    filename: `${getDocumentTitle(file.name)}.${format}`,
    source: file,
  }
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

    buildResult.exportDocuments.push(await createTransformedDocument(file, format, packageName, version, templateResolver, allowedOasExtensions))

    if (format === HTML_EXPORT_GROUP_FORMAT) {
      buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver, buildResult.exportDocuments[0].fileId))
      buildResult.exportFileName = createSingleFileExportName(packageId, version, getDocumentTitle(file.name), 'zip')
      return buildResult
    }

    buildResult.exportFileName = createSingleFileExportName(packageId, version, getDocumentTitle(file.name), format)

    return buildResult
  }
}
