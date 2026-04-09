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

import { DocumentBuilder, DocumentDumper, ExportDocument, ExportFormat, VersionDocument } from '../../types'
import { FILE_FORMAT, FILE_FORMAT_HTML } from '../../consts'
import {
  createBundlingErrorHandler,
  createVersionInternalDocument,
  EXPORT_FORMAT_TO_FILE_FORMAT,
  getBundledFileDataWithDependencies,
  getDocumentTitle,
  getStringValue,
  isObject,
} from '../../utils'
import { dump } from '../../utils/apihubSpecificationExtensions'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { AsyncDocumentInfo } from './async.types'
import { OpenApiExtensionKey } from '@netcracker/qubership-apihub-api-unifier'
import { removeOasExtensions } from '../../utils/removeOasExtensions'
import { toExternalDocumentationObject, toTagObjects } from './async.utils'

const asyncApiDocumentMeta = (data: AsyncAPIV3.AsyncAPIObject): AsyncDocumentInfo => {
  if (!isObject(data)) {
    return { title: '', description: '', version: '', tags: [] }
  }

  const { title = '', version = '', description = '', externalDocs: _externalDocs, tags: _tags, ...otherInfo  } = data.info || {}

  return {
    title: getStringValue(title),
    description: getStringValue(description),
    version: getStringValue(version),
    info: Object.keys(otherInfo ).length ? otherInfo  : undefined,
    externalDocs: toExternalDocumentationObject(data),
    tags: toTagObjects(data),
  }
}

export const buildAsyncApiDocument: DocumentBuilder<AsyncAPIV3.AsyncAPIObject> = async (parsedFile, file, ctx): Promise<VersionDocument> => {
  const { fileId, slug = '', publish = true, ...fileMetadata } = file

  const {
    data,
    dependencies,
  } = await getBundledFileDataWithDependencies(fileId, ctx.parsedFileResolver, createBundlingErrorHandler(ctx, fileId))

  const bundledFileData = data as AsyncAPIV3.AsyncAPIObject

  const { description, title, version, info, externalDocs, tags } = asyncApiDocumentMeta(bundledFileData)
  const metadata = {
    ...fileMetadata,
    info,
    externalDocs,
    tags,
  }
  const { type, fileId: parsedFileId, source, errors } = parsedFile
  return {
    fileId: parsedFileId,
    type,
    format: FILE_FORMAT.JSON,
    data: bundledFileData,
    slug, // unique slug should be already generated
    filename: `${slug}.${FILE_FORMAT.JSON}`,
    title: title || getDocumentTitle(fileId),
    operationIds: [],
    dependencies,
    description,
    version,
    metadata,
    publish,
    source,
    errors: errors?.length ?? 0,
    versionInternalDocument: createVersionInternalDocument(slug),
  }
}

export const dumpAsyncApiDocument: DocumentDumper<AsyncAPIV3.AsyncAPIObject> = (document, format) => {
  return new Blob(...dump(document.data, format ?? FILE_FORMAT.JSON))
}

export function createAsyncExportDocument(
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
