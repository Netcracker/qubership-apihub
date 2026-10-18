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
