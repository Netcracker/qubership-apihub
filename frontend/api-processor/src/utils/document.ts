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
  _ParsedFileResolver,
  ApiDocument,
  BuilderContext,
  ExportFormat,
  FILE_KIND,
  FileFormat,
  FileId,
  MessageCategory,
  MessageSeverity,
  NotificationMessage,
  OperationsApiType,
  PackageDocument,
  ResolvedGroupDocument,
  VALIDATION_RULES_SEVERITY_LEVEL_ERROR,
  ValidationRulesSeverityLevel,
  VersionDocument,
  VersionInternalDocument,
} from '../types'
import { bundle, Resolver } from 'api-ref-bundler'
import {
  ASYNCAPI_API_TYPE,
  FILE_FORMAT_GRAPHQL,
  FILE_FORMAT_HTML,
  FILE_FORMAT_JSON,
  FILE_FORMAT_YAML,
  GRAPHQL_API_TYPE,
  MESSAGE_CATEGORY,
  MESSAGE_SEVERITY,
  REST_API_TYPE,
  SERIALIZE_SYMBOL_STRING_MAPPING,
} from '../consts'
import { isNotEmpty } from './arrays'
import { RefErrorType, RefErrorTypes, serialize } from '@netcracker/qubership-apihub-api-unifier'

const REST_FILE_FORMATS = [FILE_FORMAT_YAML, FILE_FORMAT_JSON] as const
type RestFileFormat = typeof REST_FILE_FORMATS[number]

const GRAPHQL_FILE_FORMATS = [FILE_FORMAT_GRAPHQL] as const
type GraphQlFileFormat = typeof GRAPHQL_FILE_FORMATS[number]

const ASYNCAPI_FILE_FORMATS = [FILE_FORMAT_YAML, FILE_FORMAT_JSON] as const
type AsyncApiFileFormat = typeof ASYNCAPI_FILE_FORMATS[number]

export const EXPORT_FORMAT_TO_FILE_FORMAT = new Map<ExportFormat, RestFileFormat>([
  [FILE_FORMAT_YAML, FILE_FORMAT_YAML],
  [FILE_FORMAT_JSON, FILE_FORMAT_JSON],
  [FILE_FORMAT_HTML, FILE_FORMAT_JSON],
])

export const EXPORT_GRAPHQL_FORMAT_TO_FILE_FORMAT = new Map<ExportFormat, GraphQlFileFormat>([
  [FILE_FORMAT_GRAPHQL, FILE_FORMAT_GRAPHQL],
])

export const EXPORT_ASYNCAPI_FORMAT_TO_FILE_FORMAT = new Map<ExportFormat, AsyncApiFileFormat>([
  [FILE_FORMAT_YAML, FILE_FORMAT_YAML],
  [FILE_FORMAT_JSON, FILE_FORMAT_JSON],
])

export const EXPORT_API_TYPE_FORMATS = new Map<OperationsApiType, Map<ExportFormat, RestFileFormat | GraphQlFileFormat | AsyncApiFileFormat>>([
  [REST_API_TYPE, EXPORT_FORMAT_TO_FILE_FORMAT],
  [GRAPHQL_API_TYPE, EXPORT_GRAPHQL_FORMAT_TO_FILE_FORMAT],
  [ASYNCAPI_API_TYPE, EXPORT_ASYNCAPI_FORMAT_TO_FILE_FORMAT],
])

export function toVersionDocument(document: ResolvedGroupDocument, fileFormat: FileFormat): VersionDocument {
  return {
    data: document.data,
    version: document.version,
    operationIds: document.includedOperationIds ?? [],
    title: document.title,
    filename: `${getDocumentTitle(document.filename)}.${fileFormat}`,
    fileId: document.fileId,
    slug: document.slug,
    type: document.type,
    format: fileFormat,
    dependencies: [],
    description: '',
    metadata: {},
    versionInternalDocument: createVersionInternalDocument(document.slug),
  }
}

export function toPackageDocument(document: VersionDocument, hasErrors = false): PackageDocument {
  return {
    ...hasErrors ? { hasErrors } : {},
    fileId: document.fileId,
    slug: document.slug,
    filename: document.filename,
    type: document.type,
    format: document.format,
    title: document.title,
    description: document.description,
    operationIds: document.operationIds,
    metadata: document.metadata,
    version: document.version,
    apiKind: document.apiKind,
  }
}

/**
 * Keep the entry whose `documentId` sorts first when two claim a key. Shared by operation, MCP- and
 * DDL-entity indexing.
 *
 * Processing order is `config.files` order, so without the tie-break the same files published in a different
 * order publish a different entity. Neither claimant is more correct; the winner must not depend on the config.
 */
export function setReportingDuplicate<K, V extends { documentId: string }>(
  map: Map<K, V>,
  key: K,
  value: V,
): void {
  const existing = map.get(key)
  if (existing !== undefined) {
    // strict: slugs are unique per version, so an equal documentId means the same document is being
    // re-processed (incremental rebuild) and must refresh its own entry rather than keep the stale one
    if (existing.documentId < value.documentId) { return }
  }
  map.set(key, value)
}

/**
 * Report one item a document could not build: an operation, a DDL table, an MCP entity.
 *
 * The item is left out of the document's content and the build continues. `notifications` is optional
 * because the entity builders are also reachable from paths that pass no stream.
 */
export function reportItemBuildFailure(
  notifications: NotificationMessage[] | undefined,
  category: MessageCategory,
  documentId: string,
  message: string,
): void {
  notifications?.push({ category, severity: MESSAGE_SEVERITY.Error, message, documentId })
}

export const findSharedPath = (fileIds: string[]): string => {
  if (!fileIds.length) { return '' }
  const sorted = fileIds.concat().sort()
  const first = sorted[0].split('/')
  const last = sorted[sorted.length - 1].split('/')

  let i = 0
  while (i < first.length - 1 && first[i] === last[i]) { i++ }
  return first.slice(0, i).join('/') + (i ? '/' : '')
}

export const getFileExtension = (fileId: string): string => {
  return (/[^\\/]\.([^.\\/]+)$/.exec(fileId.toLowerCase()) || ['']).pop() || ''
}

export const getDocumentTitle = (fileId: string): string => {
  // get file name and remove extension
  const cutDot = fileId.startsWith('.') ? 1 : 0
  return fileId.substring(cutDot).split('/').pop()!.replace(/\.[^/.]+$/, '')
}

export interface BundlingError {
  message: string
  errorType: RefErrorType
}

// One category per reference problem: they come from the same site but are different diagnostics,
// and a consumer filtering by category must be able to tell them apart
const REF_ERROR_CATEGORY: Record<RefErrorType, MessageCategory> = {
  [RefErrorTypes.RICH_REF_NOT_ALLOWED]: MESSAGE_CATEGORY.RefHasSiblings,
  [RefErrorTypes.REF_NOT_ALLOWED]: MESSAGE_CATEGORY.RefNotAllowed,
  [RefErrorTypes.REF_NOT_FOUND]: MESSAGE_CATEGORY.RefNotFound,
  [RefErrorTypes.REF_NOT_VALID_FORMAT]: MESSAGE_CATEGORY.RefNotValidFormat,
}

/**
 * Severity by kind of reference problem, not one constant for all of them.
 *
 * A `$ref` with sibling keys, or one in a position the schema disallows, resolves anyway, so it stays
 * `Warning` whatever the caller asks for. A missing or malformed target leaves the document incomplete, and
 * `validationRulesSeverity.brokenRefs` says what that costs: `error` for an ordinary publication, so the
 * version cannot ship as a release; `warning` while migrating, so an already-published version carrying a
 * broken reference stays rebuildable.
 */
const refErrorSeverity = (errorType: RefErrorType, brokenRefs: ValidationRulesSeverityLevel | undefined): MessageSeverity => {
  if (errorType === RefErrorTypes.RICH_REF_NOT_ALLOWED || errorType === RefErrorTypes.REF_NOT_ALLOWED) {
    return MESSAGE_SEVERITY.Warning
  }
  return brokenRefs === VALIDATION_RULES_SEVERITY_LEVEL_ERROR ? MESSAGE_SEVERITY.Error : MESSAGE_SEVERITY.Warning
}

export const createBundlingErrorHandler = (ctx: BuilderContext, documentId: string) => (errors: BundlingError[]): void => {
  const { brokenRefs } = ctx.config.validationRulesSeverity ?? {}
  for (const error of errors) {
    ctx.notifications.push({
      category: REF_ERROR_CATEGORY[error.errorType],
      severity: refErrorSeverity(error.errorType, brokenRefs),
      message: error.message,
      documentId: documentId,
    })
  }
}

export const getBundledFileDataWithDependencies = async (
  fileId: FileId,
  parsedFileResolver: _ParsedFileResolver,
  onError: (errors: BundlingError[]) => void,
): Promise<{ data: any; dependencies: string[] }> => {
  const dependencies: string[] = []
  const errors: BundlingError[] = []

  const resolver: Resolver = async (filepath: string) => {
    const data = await parsedFileResolver(filepath)

    if (data === null) {
      // can't throw the error here because it will be suppressed: https://github.com/udamir/api-ref-bundler/blob/0.4.0/src/resolver.ts#L33
      errors.push({
        message: `Unable to resolve the file "${filepath}" because it does not exist.`,
        errorType: RefErrorTypes.REF_NOT_FOUND,
      })
      return {}
    }

    // recorded before the format check: a file whose parser threw arrives as a binary fallback carrying the
    // parse error, and dropping it here would report only the unresolvable `$ref`, never the reason
    if (filepath !== fileId) {
      dependencies.push(filepath)
    }

    if (data.kind !== FILE_KIND.TEXT) {
      // can't throw the error here because it will be suppressed: https://github.com/udamir/api-ref-bundler/blob/0.4.0/src/resolver.ts#L33
      errors.push({
        message: `Unable to resolve the file "${filepath}" because it is not a valid text file.`,
        errorType: RefErrorTypes.REF_NOT_VALID_FORMAT,
      })
      return {}
    }

    return data.data
  }

  const bundledFileData = await bundle(fileId, resolver)

  if (isNotEmpty(errors)) {
    onError(errors)
  }

  return { data: bundledFileData, dependencies: dependencies }
}

export function capitalize(string: string): string {
  if (!string) {
    return ''
  }

  return string.charAt(0).toUpperCase() + string.slice(1)
}

export function serializeDocument(normalizedDocument: ApiDocument): string {
  return serialize(normalizedDocument, SERIALIZE_SYMBOL_STRING_MAPPING)
}

export const createVersionInternalDocument = (internalDocumentId: string): VersionInternalDocument => {
  return {
    versionDocumentId: internalDocumentId,
  }
}
