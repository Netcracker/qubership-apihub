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
  ExportVersionBuildConfig,
  ResolvedVersionDocument,
  SHAREABILITY_STATUS_UNKNOWN,
  ShareabilityStatus,
} from '../types'
import { getDocumentTitle, getFileExtension, getSplittedVersionKey } from '../utils'
import {
  createCommonStaticExportDocuments,
  createSingleFileExportName,
  createUnknownExportDocument,
  generateIndexHtmlPage,
} from '../utils/export'
import { isAsyncApiDocument, isRestDocument, unknownApiBuilder } from '../apitypes'
import { FILE_FORMAT_HTML, FILE_FORMAT_JSON } from '../consts'

export class ExportVersionStrategy implements BuilderStrategy {
  async execute(config: ExportVersionBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { versionDocumentsResolver } = contexts.builderContext(config)
    const { packageId, version: versionWithRevision } = config
    const { documents } = await versionDocumentsResolver(versionWithRevision, packageId) ?? { documents: [] }

    const documentsToExport = filterDocumentsByShareabilityStatus(documents, config)

    switch (config.format) {
      case FILE_FORMAT_HTML:
        await exportToHTML(config, buildResult, contexts, documentsToExport)
        break
      default:
        await defaultExport(config, buildResult, contexts, documentsToExport)
        break
    }

    const { format = FILE_FORMAT_JSON } = config
    const [version] = getSplittedVersionKey(versionWithRevision)
    if (buildResult.exportDocuments.length > 1) {
      buildResult.exportFileName = `${packageId}_${version}.zip`
      return buildResult
    }

    const isSingleNonRestDocument = documentsToExport.length === 1 && !isRestDocument(documentsToExport[0])
    const singleExportDocument = buildResult.exportDocuments[0]
    const singleExportDocumentExtension = isSingleNonRestDocument
      ? getFileExtension(singleExportDocument.filename)
      : format

    buildResult.exportFileName = createSingleFileExportName(
      packageId,
      version,
      getDocumentTitle(singleExportDocument.filename),
      singleExportDocumentExtension,
    )
    return buildResult
  }
}

async function exportToHTML(
  config: ExportVersionBuildConfig,
  buildResult: BuildResult,
  contexts: BuildTypeContexts,
  documentsToExport: ReadonlyArray<ResolvedVersionDocument>,
): Promise<void> {
  const { packageResolver, templateResolver } = contexts.builderContext(config)
  const { packageId, version: versionWithRevision } = config
  const [version] = getSplittedVersionKey(versionWithRevision)
  const { name: packageName } = await packageResolver(packageId)

  const generatedHtmlExportDocuments: ExportDocument[] = []
  const restDocuments = documentsToExport.filter(isRestDocument)
  const shouldAddIndexPage = restDocuments.length > 0
  const transformedDocuments = await transformDocuments(config, contexts, documentsToExport, version, packageName, {
    generatedHtmlExportDocuments,
    shouldAddIndexPage,
  })

  buildResult.exportDocuments.push(...transformedDocuments)

  if (generatedHtmlExportDocuments.length > 0) {
    buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver))
  }
  if (shouldAddIndexPage) {
    const readme = await buildResult.exportDocuments.find(({ filename }) => filename.toLowerCase() === 'readme.md')?.data.text()
    buildResult.exportDocuments.push(createUnknownExportDocument('index.html', await generateIndexHtmlPage(packageName, version, generatedHtmlExportDocuments, templateResolver, readme)))
  }
}

async function defaultExport(
  config: ExportVersionBuildConfig,
  buildResult: BuildResult,
  contexts: BuildTypeContexts,
  documentsToExport: ReadonlyArray<ResolvedVersionDocument>,
): Promise<void> {
  const { packageResolver } = contexts.builderContext(config)
  const { packageId, version: versionWithRevision } = config
  const [version] = getSplittedVersionKey(versionWithRevision)
  const { name: packageName } = await packageResolver(packageId)

  const transformedDocuments = await transformDocuments(config, contexts, documentsToExport, version, packageName)

  buildResult.exportDocuments.push(...transformedDocuments)
}

type HtmlExportOptions = {
  generatedHtmlExportDocuments: ExportDocument[]
  shouldAddIndexPage: boolean
}

async function transformDocuments(
  config: ExportVersionBuildConfig,
  contexts: BuildTypeContexts,
  documentsToExport: ReadonlyArray<ResolvedVersionDocument>,
  version: string,
  packageName: string,
  htmlExportOptions?: HtmlExportOptions,
): Promise<ExportDocument[]> {
  const { rawDocumentResolver, templateResolver, apiBuilders } = contexts.builderContext(config)
  const { version: versionWithRevision, packageId, format, allowedOasExtensions } = config

  return await Promise.all(
    documentsToExport.map(async document => {
      const { createExportDocument } = apiBuilders.find(({ types }) => types.includes(document.type)) || unknownApiBuilder
      const file = await rawDocumentResolver(versionWithRevision, packageId, document.slug)

      // TODO: Temporary workaround: AsyncAPI documents currently lack per-format export options, so force JSON output.
      const filename = isAsyncApiDocument(document) ? `${getDocumentTitle(file.name)}.${FILE_FORMAT_JSON}` : file.name

      return (
        (await createExportDocument?.(
          filename,
          await file.text(),
          format,
          packageName,
          version,
          templateResolver,
          allowedOasExtensions,
          htmlExportOptions?.generatedHtmlExportDocuments,
          htmlExportOptions?.shouldAddIndexPage,
        )) ??
        createUnknownExportDocument(filename, file)
      )
    }),
  )
}

function filterDocumentsByShareabilityStatus(
  documents: ReadonlyArray<ResolvedVersionDocument>,
  config: ExportVersionBuildConfig,
): ReadonlyArray<ResolvedVersionDocument> {
  const { allowedShareabilityStatuses } = config

  if (!allowedShareabilityStatuses || allowedShareabilityStatuses.length === 0) {
    return documents
  }
  const allowedSet = new Set<ShareabilityStatus>(allowedShareabilityStatuses)

  return documents.filter(doc => allowedSet.has(doc.shareabilityStatus ?? SHAREABILITY_STATUS_UNKNOWN))
}
