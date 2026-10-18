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
