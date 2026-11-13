import {
  BuilderStrategy,
  BuildResult,
  BuildTypeContexts,
  ExportDocument,
  ExportRestDocumentBuildConfig,
} from '../types'
import { getDocumentTitle, getSplittedVersionKey } from '../utils'
import {
  createCommonStaticExportDocuments,
  createSingleFileExportName,
  createUnknownExportDocument,
  generateIndexHtmlPage,
} from '../utils/export'
import { createRestExportDocument } from '../apitypes/rest/rest.document'
import { FILE_FORMAT_HTML } from '../consts'

export class ExportRestDocumentStrategy implements BuilderStrategy {
  async execute(config: ExportRestDocumentBuildConfig, buildResult: BuildResult, contexts: BuildTypeContexts): Promise<BuildResult> {
    const { builderContext } = contexts
    const { rawDocumentResolver, templateResolver, packageResolver } = builderContext(config)
    const { packageId, version: versionWithRevision, documentId, format, allowedOasExtensions } = config
    const [version] = getSplittedVersionKey(versionWithRevision)
    const generatedHtmlExportDocuments: ExportDocument[] = []
    const file = await rawDocumentResolver(
      versionWithRevision,
      packageId,
      documentId,
    )
    const { name: packageName } = await packageResolver(packageId)
    buildResult.exportDocuments.push(await createRestExportDocument(file.name, await file.text(), format, packageName, version, templateResolver, allowedOasExtensions, generatedHtmlExportDocuments))
    if (format === FILE_FORMAT_HTML) {
      buildResult.exportDocuments.push(...await createCommonStaticExportDocuments(packageName, version, templateResolver))
      buildResult.exportDocuments.push(createUnknownExportDocument('index.html', await generateIndexHtmlPage(packageName, version, generatedHtmlExportDocuments, templateResolver)))
      buildResult.exportFileName = createSingleFileExportName(packageId, version, getDocumentTitle(file.name), 'zip')
      return buildResult
    }

    buildResult.exportFileName = createSingleFileExportName(packageId, version, getDocumentTitle(file.name), format)

    return buildResult
  }
}
