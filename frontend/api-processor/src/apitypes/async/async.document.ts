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

import { ASYNC_KIND_KEY } from './async.consts'
import type { AsyncDocumentInfo, AsyncApiDocument } from './async.types'
import {
  DocumentBuilder,
  DocumentDumper,
} from '../../types'
import { FILE_FORMAT } from '../../consts'
import {
  createBundlingErrorHandler,
  getBundledFileDataWithDependencies,
  getDocumentTitle,
} from '../../utils'
import { dump } from '../../utils/apihubSpecificationExtensions'

const asyncApiDocumentMeta = (data: AsyncApiDocument): AsyncDocumentInfo => {
  if (typeof data !== 'object' || !data) {
    return { title: '', description: '', version: '' }
  }

  const { title = '', version = '', description = '' } = data?.info || {}

  const getStringValue = (value: unknown): string => (typeof (<unknown>value) === 'string' ? <string>value : '')

  return {
    title: getStringValue(title),
    description: getStringValue(description),
    version: getStringValue(version),
  }
}

export const buildAsyncApiDocument: DocumentBuilder<AsyncApiDocument> = async (parsedFile, file, ctx) => {
  const { fileId, slug = '', publish = true, apiKind, ...fileMetadata } = file

  const {
    data,
    dependencies,
  } = await getBundledFileDataWithDependencies(fileId, ctx.parsedFileResolver, createBundlingErrorHandler(ctx, fileId))

  const bundledFileData = data as AsyncApiDocument

  const documentKind = bundledFileData?.info?.[ASYNC_KIND_KEY] || apiKind

  const { description, title, version } = asyncApiDocumentMeta(bundledFileData)
  const metadata = {
    ...fileMetadata,
  }

  return {
    fileId: parsedFile.fileId,
    type: parsedFile.type,
    format: FILE_FORMAT.JSON,
    apiKind: documentKind,
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
    source: parsedFile.source,
    errors: parsedFile.errors?.length ?? 0,
  }
}

export const dumpAsyncApiDocument: DocumentDumper<AsyncApiDocument> = (document, format) => {
  return new Blob(...dump(document.data, format ?? FILE_FORMAT.JSON))
}

