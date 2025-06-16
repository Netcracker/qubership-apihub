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
  ExportVersionBuildConfig,
  HTML_EXPORT_GROUP_FORMAT,
  JSON_EXPORT_GROUP_FORMAT,
  OperationsGroupExportFormat,
  ResolvedVersionDocument,
  ZippableDocument,
} from '../types'
import { getDocumentTitle, getSplittedVersionKey } from '../utils'
import {
  createCommonStaticExportDocuments,
  createExportDocument,
  generateHtmlPage,
  createSingleFileExportName,
  generateIndexHtmlPage,
} from '../utils/export'
import { removeOasExtensions } from '../utils/removeOasExtensions'
import { OpenApiExtensionKey } from '@netcracker/qubership-apihub-api-unifier'
import { isRestDocument, isTextDocument } from '../apitypes'

function extractTypeAndSubtype(type: string): string {
  return type.split(';')[0]
}

async function prepareData(file: File): Promise<ZippableDocument['data']> {
  switch (extractTypeAndSubtype(file.type)) {
    // BE responds with 'text/plain' for all textual files and a more precise content-type in other cases
    // however, just in case, other processable types are also listed here
    case 'text/plain':
    case 'application/json':
    case 'application/yaml':
    case 'text/markdown':
      return await file.text()
    default:
    case 'application/octet-stream':
      return ''
  }
}

async function createTransformedDocument(
  document: ResolvedVersionDocument,
  file: File,
  format: OperationsGroupExportFormat,
  packageName: string,
  version: string,
  generatedHtmlExportDocuments: ZippableDocument[],
  templateResolver: _TemplateResolver,
  allowedOasExtensions?: OpenApiExtensionKey[],
): Promise<ZippableDocument> {
  const { fileId, type } = document

  const data = await prepareData(file)

  if (isRestDocument(document) && format === HTML_EXPORT_GROUP_FORMAT) {
    const htmlExportDocument = createExportDocument(
      `${getDocumentTitle(file.name)}.${HTML_EXPORT_GROUP_FORMAT}`,
      await generateHtmlPage(JSON.stringify(removeOasExtensions(JSON.parse(data), allowedOasExtensions), undefined, 2), getDocumentTitle(file.name), packageName, version, templateResolver, true),
    )
    generatedHtmlExportDocuments.push(htmlExportDocument)
    return htmlExportDocument
  }

  return {
    fileId,
    type,
    data: isRestDocument(document) ? removeOasExtensions(JSON.parse(data), allowedOasExtensions) : '',
    description: isTextDocument(document) ? data : '',
    publish: true,
    filename: isRestDocument(document) ? `${getDocumentTitle(fileId)}.${format}` : fileId,
    source: file,
  }
}

export class ExportVersionStrategy implements BuilderStrategy {
  async execute(config: ExportVersionBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { builderContext } = contexts
    const { versionDocumentsResolver, rawDocumentResolver, templateResolver, packageResolver } = builderContext(config)
    const { packageId, version: versionWithRevision, format = JSON_EXPORT_GROUP_FORMAT, allowedOasExtensions } = config
    const [version] = getSplittedVersionKey(versionWithRevision)
    const { name: packageName } = await packageResolver(packageId)

    const { documents } = await versionDocumentsResolver(
      versionWithRevision,
      packageId,
    ) ?? { documents: [] }

    const generatedHtmlExportDocuments: ZippableDocument[] = []
    const transformedDocuments = await Promise.all(documents.map(async document => {
      const file = await rawDocumentResolver(versionWithRevision, packageId, document.slug)
      return await createTransformedDocument(document, file, format, packageName, version, generatedHtmlExportDocuments, templateResolver, allowedOasExtensions)
    }))

    buildResult.exportDocuments.push(...transformedDocuments)

    if (format === HTML_EXPORT_GROUP_FORMAT && generatedHtmlExportDocuments.length > 0) {
      buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver))
      const readme = buildResult.exportDocuments.find(({ fileId }) => fileId.toLowerCase() === 'readme.md')?.description

      if (generatedHtmlExportDocuments.length > 1 || readme) {
        buildResult.exportDocuments.push(createExportDocument('index.html', await generateIndexHtmlPage(packageName, version, generatedHtmlExportDocuments, templateResolver, readme)))
      }
    }

    if (buildResult.exportDocuments.length > 1) {
      buildResult.exportFileName = `${packageId}_${version}.zip`
      return buildResult
    }

    buildResult.exportFileName = createSingleFileExportName(packageId, version, getDocumentTitle(buildResult.exportDocuments[0].fileId), format)
    return buildResult
  }
}
