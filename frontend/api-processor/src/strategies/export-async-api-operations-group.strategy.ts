import { ExportAsyncApiOperationsGroupBuildConfig, ExportDocument, ExportFormat } from '../types'
import { ExportOperationsGroupStrategy } from './export-operations-group.strategy'
import { ASYNCAPI_API_TYPE, FILE_FORMAT_HTML } from '../consts'
import { OpenApiExtensionKey } from '@netcracker/qubership-apihub-api-unifier'
import { dump, EXPORT_FORMAT_TO_FILE_FORMAT, getDocumentTitle } from '../utils'
import { removeOasExtensions } from '../utils/removeOasExtensions'

export class ExportAsyncApiOperationsGroupStrategy extends ExportOperationsGroupStrategy<ExportAsyncApiOperationsGroupBuildConfig> {
  protected readonly supportedApiType = ASYNCAPI_API_TYPE

  protected createExportDocument(filename: string, data: string, format: ExportFormat): ExportDocument {
    return this.createAsyncExportDocument(filename, data, format)
  }

  private createAsyncExportDocument(
    filename: string,
    data: string,
    format: ExportFormat,
    allowedOasExtensions?: OpenApiExtensionKey[],
  ): ExportDocument {
    if (format === FILE_FORMAT_HTML) {
      throw new Error('HTML export is not supported for AsyncAPI documents')
    }

    const exportFilename = `${getDocumentTitle(filename)}.${format}`

    let parsed: object
    try {
      parsed = JSON.parse(data)
    } catch (e) {
      throw new Error(`Failed to parse document '${filename}': ${(e as Error).message}`)
    }

    const fileFormat = EXPORT_FORMAT_TO_FILE_FORMAT.get(format)
    if (!fileFormat) {
      throw new Error(`Unsupported export format: ${format}`)
    }

    const [[document], blobProperties] = dump(
      removeOasExtensions(parsed as Parameters<typeof removeOasExtensions>[0], allowedOasExtensions),
      fileFormat,
    )

    return {
      data: new Blob([document], blobProperties),
      filename: exportFilename,
    }
  }
}
