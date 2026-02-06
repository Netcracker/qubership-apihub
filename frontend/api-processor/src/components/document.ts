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

import { BuildConfigFile, BuilderContext, FILE_KIND, SourceFile, TextFile, VersionDocument } from '../types'
import {
  API_KIND_LABEL,
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  ApihubApiCompatibilityKind,
  DOCUMENT_TYPE,
  FILE_FORMAT_UNKNOWN,
} from '../consts'
import {
  createVersionInternalDocument,
  getDocumentTitle,
  getFileExtension,
  isObject,
  isString,
  rawToApiKind,
} from '../utils'
import { buildBinaryDocument, REST_KIND_KEY, unknownApiBuilder } from '../apitypes'

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
    versionInternalDocument: createVersionInternalDocument(slug),
  }
}

export const buildDocument = async (parsedFile: SourceFile, file: BuildConfigFile, ctx: BuilderContext): Promise<VersionDocument> => {

  if (parsedFile.kind === FILE_KIND.BINARY) {
    return await buildBinaryDocument(parsedFile, file)
  }

  const apiBuilder = ctx.apiBuilders.find(({ types }) => types.includes(parsedFile.type)) || unknownApiBuilder

  try {
    file.apiKind = calculateApiKindFromLabels(file.labels, ctx.versionLabels)

    return await apiBuilder.buildDocument(parsedFile, file, ctx)
  } catch (error) {
    throw new Error(`Cannot process the "${file.fileId}" document. ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const calculateApiKindFromLabels = (fileLabels: unknown, versionLabels: unknown): ApihubApiCompatibilityKind => {
  if (!Array.isArray(fileLabels) && !Array.isArray(versionLabels)) {
    return APIHUB_API_COMPATIBILITY_KIND_BWC
  }

  const labels = [
    ...(Array.isArray(fileLabels) ? fileLabels : []),
    ...(Array.isArray(versionLabels) ? versionLabels : []),
  ]

  for (const label of labels) {
    if (!label || typeof label !== 'string') {
      continue
    }

    const match = new RegExp(`${API_KIND_LABEL}:`).exec(label)
    if (match) {
      return rawToApiKind(label.slice(match[0].length).trim(), APIHUB_API_COMPATIBILITY_KIND_BWC)
    }
  }
  return APIHUB_API_COMPATIBILITY_KIND_BWC
}

export const getApiKindProperty = (obj: unknown, defaultApiKind?: ApihubApiCompatibilityKind): ApihubApiCompatibilityKind | undefined => {
  if (isObject(obj)) {
    const apiKindLike = obj?.[REST_KIND_KEY]
    if (isString(apiKindLike)) {
      return rawToApiKind(apiKindLike, defaultApiKind)
    }
  }
  return defaultApiKind
}
