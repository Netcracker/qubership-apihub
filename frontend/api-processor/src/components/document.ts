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

import { BuildConfigFile, BuilderContext, SourceFile, FILE_KIND, TextFile, VersionDocument } from '../types'
import { API_KIND, API_KIND_LABEL, DOCUMENT_TYPE, FILE_FORMAT_UNKNOWN } from '../consts'
import { getDocumentTitle, getFileExtension, rawToApiKind } from '../utils'
import { buildBinaryDocument, unknownApiBuilder } from '../apitypes'

export const buildErrorDocument = (file: BuildConfigFile, parsedFile?: TextFile): VersionDocument => {
  const { fileId, slug = '', publish = true, ...metadata } = file
  return {
    fileId: fileId,
    type: DOCUMENT_TYPE.UNKNOWN,
    format: FILE_FORMAT_UNKNOWN,
    data: '',
    slug,
    publish,
    filename: `${slug}.${getFileExtension(fileId)}`,
    title: getDocumentTitle(fileId),
    dependencies: [],
    description: '',
    operationIds: [],
    metadata,
    source: parsedFile?.source,
  }
}

export const buildDocument = async (parsedFile: SourceFile, file: BuildConfigFile, ctx: BuilderContext): Promise<VersionDocument> => {

  if (parsedFile.kind === FILE_KIND.BINARY) {
    return await buildBinaryDocument(parsedFile, file)
  }

  const apiBuilder = ctx.apiBuilders.find(({ types }) => types.includes(parsedFile.type)) || unknownApiBuilder

  try {
    const labels = [
      ...(Array.isArray(file.labels) ? file.labels : []),
      ...(Array.isArray(ctx.versionLabels) ? ctx.versionLabels : []),
    ]
    file.apiKind = findApiKindLabel(labels)

    return await apiBuilder.buildDocument(parsedFile, file, ctx)
  } catch (error) {
    throw new Error(`Cannot process the "${file.fileId}" document. ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

const findApiKindLabel = (labels: unknown[]): string => {
  if (!Array.isArray(labels)) {
    return API_KIND.BWC
  }

  for (const label of labels) {
    if (!label || typeof label !== 'string') {
      continue
    }

    const match = new RegExp(`${API_KIND_LABEL}:`).exec(label)
    if (match) {
      return rawToApiKind(label.slice(match[0].length).trim())
    }
  }
  return API_KIND.BWC
}
