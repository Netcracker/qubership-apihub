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

import {
  ApiBuilder,
  BuildConfigFile,
  BuilderContext,
  DocumentDumper,
  FILE_KIND,
  SourceFile,
  VersionDocument,
  ZippableDocument,
} from '../types'
import {
  API_KIND_LABEL, API_KIND_SPECIFICATION_EXTENSION,
  APIHUB_API_COMPATIBILITY_KIND_BWC,
  ApihubApiCompatibilityKind,
  DOCUMENT_TYPE,
  FILE_FORMAT_UNKNOWN,
} from '../consts'
import { DocumentBuildError } from '../errors'
import {
  createVersionInternalDocument,
  getDocumentTitle,
  isObject,
  isString,
  rawToApiKind,
} from '../utils'
import { buildBinaryDocument, isTextDocument, unknownApiBuilder } from '../apitypes'

const consumeXApiKind = (file: BuildConfigFile): string | undefined => {
  const { xApiKind } = file
  delete file.xApiKind
  return xApiKind
}

export const buildErrorDocument = (file: BuildConfigFile, parsedFile?: SourceFile): VersionDocument => {
  consumeXApiKind(file)
  const { fileId, slug = '', publish = true, ...metadata } = file
  return {
    fileId: fileId,
    type: DOCUMENT_TYPE.UNKNOWN,
    format: FILE_FORMAT_UNKNOWN,
    data: '',
    slug,
    publish,
    // `fileId`, matching what unknown and binary documents already ship — a build may contain both flavours
    filename: fileId,
    title: getDocumentTitle(fileId),
    dependencies: [],
    description: '',
    operationIds: [],
    metadata,
    source: parsedFile?.source,
    versionInternalDocument: createVersionInternalDocument(slug),
  }
}

/**
 * Dump a document with the dumper of its api type, or as the bytes it was read from when it has no model.
 *
 * A file whose parser threw keeps its type and is published without a model, so the typed dumper has
 * nothing to print. Its original bytes are the troubleshooting artifact, and they ship unchanged. A text
 * document never has a model, keeps its text in `description`, and is dumped from there as before.
 */
export const dumpDocument = (
  document: ZippableDocument,
  { dumpDocument: dumpModel }: Pick<ApiBuilder, 'dumpDocument'>,
  format?: Parameters<DocumentDumper<unknown>>[1],
): Blob => (
  document.data === '' && document.source && !isTextDocument(document)
    ? document.source
    : dumpModel(document, format)
)

export interface BuildDocumentResult {
  document: VersionDocument
  builder?: ApiBuilder
}

export const buildDocument = async (parsedFile: SourceFile, file: BuildConfigFile, ctx: BuilderContext): Promise<BuildDocumentResult> => {
  const xApiKind = consumeXApiKind(file)

  if (parsedFile.kind === FILE_KIND.BINARY) {
    return { document: await buildBinaryDocument(parsedFile, file) }
  }

  const apiBuilder = ctx.apiBuilders.find(({ types }) => types.includes(parsedFile.type)) || unknownApiBuilder

  try {
    file.apiKind = calculateFileApiKind({ xApiKind, fileLabels: file.labels, versionLabels: ctx.versionLabels })

    const document = await apiBuilder.buildDocument(parsedFile, file, ctx)
    return { document, builder: apiBuilder }
  } catch (error) {
    const message = `Cannot process the "${file.slug}" document. ${error instanceof Error ? error.message : 'Unknown error'}`
    // keep the category the nested failure carried, otherwise it flattens into `build-document`
    throw error instanceof DocumentBuildError
      ? new DocumentBuildError(message, error.category)
      : new Error(message)
  }
}

const findApiKindInLabels = (labels: unknown): ApihubApiCompatibilityKind | undefined => {
  if (!Array.isArray(labels)) {
    return undefined
  }

  for (const label of labels) {
    if (!label || typeof label !== 'string') {
      continue
    }

    const match = new RegExp(`^${API_KIND_LABEL}:`).exec(label)
    if (match) {
      return rawToApiKind(label.slice(match[0].length).trim(), APIHUB_API_COMPATIBILITY_KIND_BWC)
    }
  }
  return undefined
}

interface FileApiKindSources {
  xApiKind: unknown
  fileLabels: unknown
  versionLabels: unknown
}

/**
 * The api kind of one file of a build config, from the strongest source to the weakest:
 *
 * - the file label `apihub/x-api-kind`
 * - `xApiKind` of the file
 * - the version label `apihub/x-api-kind`
 * - BWC, when none of them states one
 *
 * A per-file source beats a per-version one. Only the build config is read here: an api kind declared
 * inside the specification is resolved by the callers, and outranks this answer wherever they support it.
 */
export const calculateFileApiKind = ({ xApiKind, fileLabels, versionLabels }: FileApiKindSources): ApihubApiCompatibilityKind => {
  // Trimmed, because the label branch trims the value it extracts: the same text must mean the same
  // thing whichever source carries it. Nothing left after trimming means the config stated nothing
  const trimmedXApiKind = isString(xApiKind) ? xApiKind.trim() : ''
  const statedXApiKind = trimmedXApiKind
    ? rawToApiKind(trimmedXApiKind, APIHUB_API_COMPATIBILITY_KIND_BWC)
    : undefined

  return findApiKindInLabels(fileLabels) ??
    statedXApiKind ??
    findApiKindInLabels(versionLabels) ??
    APIHUB_API_COMPATIBILITY_KIND_BWC
}

export const getApiKindProperty = (
  obj: unknown,
  defaultApiKind?: ApihubApiCompatibilityKind,
): ApihubApiCompatibilityKind | undefined => {
  if (isObject(obj)) {
    const apiKindLike = obj?.[API_KIND_SPECIFICATION_EXTENSION]
    if (isString(apiKindLike)) {
      return rawToApiKind(apiKindLike, defaultApiKind)
    }
  }
  return defaultApiKind
}
