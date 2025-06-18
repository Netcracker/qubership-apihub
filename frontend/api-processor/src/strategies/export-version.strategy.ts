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

import { BuilderStrategy, BuildResult, BuildTypeContexts, ExportDocument, ExportVersionBuildConfig } from '../types'
import { getDocumentTitle, getSplittedVersionKey } from '../utils'
import {
  createCommonStaticExportDocuments,
  createSingleFileExportName,
  createUnknownExportDocument,
  generateIndexHtmlPage,
} from '../utils/export'
import { isRestDocument, unknownApiBuilder } from '../apitypes'
import { FILE_FORMAT_HTML, FILE_FORMAT_JSON } from '../consts'

export class ExportVersionStrategy implements BuilderStrategy {
  async execute(config: ExportVersionBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    switch (config.format) {
      case FILE_FORMAT_HTML:
        await exportToHTML(config, buildResult, contexts)
        break
      default:
        await defaultExport(config, buildResult, contexts)
        break
    }

    const { packageId, version: versionWithRevision, format = FILE_FORMAT_JSON } = config
    const [version] = getSplittedVersionKey(versionWithRevision)
    if (buildResult.exportDocuments.length > 1) {
      buildResult.exportFileName = `${packageId}_${version}.zip`
      return buildResult
    }

    buildResult.exportFileName = createSingleFileExportName(packageId, version, getDocumentTitle(buildResult.exportDocuments[0].filename), format)
    return buildResult
  }
}

async function exportToHTML(config: ExportVersionBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<void> {
  const {
    versionDocumentsResolver,
    rawDocumentResolver,
    templateResolver,
    packageResolver,
    apiBuilders,
  } = contexts.builderContext(config)
  const { packageId, version: versionWithRevision, format, allowedOasExtensions } = config
  const [version] = getSplittedVersionKey(versionWithRevision)
  const { name: packageName } = await packageResolver(packageId)
  const { documents } = await versionDocumentsResolver(versionWithRevision, packageId) ?? { documents: [] }

  const generatedHtmlExportDocuments: ExportDocument[] = []
  const restDocuments = documents.filter(isRestDocument)
  const hasReadme = !!documents.find(({ filename }) => filename.toLowerCase() === 'readme.md')
  const shouldAddIndexPage = restDocuments.length > 1 || hasReadme
  const transformedDocuments = await Promise.all(documents.map(async document => {
    const { createExportDocument } = apiBuilders.find(({ types }) => types.includes(document.type)) || unknownApiBuilder
    const file = await rawDocumentResolver(versionWithRevision, packageId, document.slug)
    return await createExportDocument?.(file.name, await file.text(), format, packageName, version, templateResolver, allowedOasExtensions, generatedHtmlExportDocuments, shouldAddIndexPage) ?? createUnknownExportDocument(file.name, file)
  }))

  buildResult.exportDocuments.push(...transformedDocuments)

  if (generatedHtmlExportDocuments.length > 0) {
    buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver, shouldAddIndexPage ? 'index.html' : buildResult.exportDocuments[0].filename))
  }
  if (shouldAddIndexPage) {
    const readme = await buildResult.exportDocuments.find(({ filename }) => filename.toLowerCase() === 'readme.md')?.data.text()
    buildResult.exportDocuments.push(createUnknownExportDocument('index.html', await generateIndexHtmlPage(packageName, version, generatedHtmlExportDocuments, templateResolver, readme)))
  }
}

async function defaultExport(config: ExportVersionBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<void> {
  const {
    versionDocumentsResolver,
    rawDocumentResolver,
    templateResolver,
    packageResolver,
    apiBuilders,
  } = contexts.builderContext(config)
  const { packageId, version: versionWithRevision, format, allowedOasExtensions } = config
  const [version] = getSplittedVersionKey(versionWithRevision)
  const { name: packageName } = await packageResolver(packageId)
  const { documents } = await versionDocumentsResolver(versionWithRevision, packageId) ?? { documents: [] }

  const transformedDocuments = await Promise.all(documents.map(async document => {
    const { createExportDocument } = apiBuilders.find(({ types }) => types.includes(document.type)) || unknownApiBuilder
    const file = await rawDocumentResolver(versionWithRevision, packageId, document.slug)
    return await createExportDocument?.(file.name, await file.text(), format, packageName, version, templateResolver, allowedOasExtensions) ?? createUnknownExportDocument(file.name, file)
  }))

  buildResult.exportDocuments.push(...transformedDocuments)
}
