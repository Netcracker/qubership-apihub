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

import { BuildConfigFile, DocumentBuilder, DocumentDumper, SourceFile, VersionDocument } from '../../types'
import { createBundlingErrorHandler, getBundledFileDataWithDependencies, getDocumentTitle } from '../../utils'
import { FILE_FORMAT } from '../../consts'

export const buildUnknownDocument: DocumentBuilder<string> = async (parsedFile, file, ctx) => {
  const { fileId, slug = '', publish, ...metadata } = file
  const { type, format, source } = parsedFile

  let description = ''
  let dependencies: string[] = []
  let bundledFileData = undefined

  if (format === FILE_FORMAT.JSON || format === FILE_FORMAT.YAML) {
    description = parsedFile.data?.description || ''

    if (ctx.configuration?.bundleComponents) {
      const {
        data,
        dependencies: fileDependencies,
      } = await getBundledFileDataWithDependencies(fileId, ctx.parsedFileResolver, createBundlingErrorHandler(ctx, fileId))
      bundledFileData = data
      dependencies = fileDependencies
    }
  }

  return {
    fileId,
    type,
    format,
    data: bundledFileData || parsedFile.data || '',
    slug,
    publish,
    filename: fileId,
    title: getDocumentTitle(fileId),
    dependencies,
    description,
    operationIds: [],
    metadata,
    errors: parsedFile.errors?.length ?? 0,
    source,
  }
}

export const buildBinaryDocument: (parsedFile: SourceFile, file: BuildConfigFile) => Promise<VersionDocument> = async (parsedFile, file) => {
  const { fileId, slug = '', publish, ...metadata } = file
  const { type, format, source } = parsedFile

  return {
    data: '',
    fileId,
    type,
    format,
    slug,
    title: getDocumentTitle(fileId),
    dependencies: [],
    description: '',
    operationIds: [],
    publish,
    filename: fileId,
    metadata,
    source,
  }
}

export const dumpUnknownDocument: DocumentDumper<string> = (document) => {
  if (!document.source) {
    throw new Error(`Document with fileId = ${document.fileId} does not have source`)
  }
  return document.source
}
