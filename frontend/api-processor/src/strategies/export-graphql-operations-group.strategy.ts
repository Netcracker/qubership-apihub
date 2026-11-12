import { ExportDocument, ExportFormat, ExportGraphQLOperationsGroupBuildConfig } from '../types'
import { ExportOperationsGroupStrategy } from './export-operations-group.strategy'
import { GRAPHQL_API_TYPE } from '../consts'
import { getDocumentTitle } from '../utils'

export class ExportGraphQlOperationsGroupStrategy extends ExportOperationsGroupStrategy<ExportGraphQLOperationsGroupBuildConfig> {
  protected readonly supportedApiType = GRAPHQL_API_TYPE

  protected createExportDocument(filename: string, data: string, format: ExportFormat): Promise<ExportDocument> {
    return this.createGraphQLExportDocument(filename, data, format)
  }

  private async createGraphQLExportDocument(
    filename: string,
    data: string,
    format: ExportFormat,
  ): Promise<ExportDocument> {
    if (format !== GRAPHQL_API_TYPE) {
      throw new Error('Unsupported format type')
    }
    const exportFilename = `${getDocumentTitle(filename)}.${GRAPHQL_API_TYPE}`

    return {
      data: new Blob([data], { type: 'application/graphql' }),
      filename: exportFilename,
    }
  }
}
