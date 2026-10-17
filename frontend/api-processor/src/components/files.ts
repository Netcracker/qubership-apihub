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

import type { BuildConfigFile, BuilderContext, BuildFileResult, FileParseError, SourceFile, VersionDocument } from '../types'
import { buildDocument, buildErrorDocument } from './document'
import { MESSAGE_CATEGORY, MESSAGE_SEVERITY } from '../consts'
import { REST_DOCUMENT_TYPE } from '../apitypes/rest/rest.consts'
import { MessageSeverity } from '../types/package/notifications'
import { DocumentBuildError } from '../errors'
import { FILE_KIND } from '../types'
import { isNotEmpty, replaceInPlace, SLUG_OPTIONS_DOCUMENT_ID, slugify } from '../utils'

export const createFileSlugs = (files: BuildConfigFile[], basePath: string): BuildConfigFile[] => {
  const { fs, slugs } = files.reduce(({ fs, slugs }, file) => {
    if (file.slug && !slugs.includes(file.slug)) {
      return { fs, slugs: [...slugs, file.slug] }
    } else {
      return { fs: [...fs, file], slugs }
    }
  }, { fs: [], slugs: [] } as { fs: BuildConfigFile[]; slugs: string[] })

  for (const file of fs) {
    const filename = file.fileId.substring(basePath.length).trim()
    const name = filename.substring(filename.startsWith('.') ? 1 : 0).replace(/\.[^/.]+$/, '')
    file.slug = slugify(name, SLUG_OPTIONS_DOCUMENT_ID, slugs)
    slugs.push(file.slug)
  }

  return files
}

export const buildFile = async (configFile: BuildConfigFile, ctx: BuilderContext): Promise<BuildFileResult> => {
  // Built on a copy: the entry belongs to the build config, which outlives the build and is handed over
  // again by an incremental rebuild, so nothing the build writes may be left on it
  const file = { ...configFile }
  const data = await ctx.parsedFileResolver(file.fileId)

  if (!data) {
    ctx.notifications.push({
      category: MESSAGE_CATEGORY.FileNotParsed,
      severity: MESSAGE_SEVERITY.Error,
      message: 'File was not parsed',
      documentId: file.slug,
    })
    return {
      file,
      document: buildErrorDocument(file),
    }
  }

  try {
    const result = await buildDocument(data, file, ctx)
    return { file, document: result.document, builder: result.builder, parsedFile: data }
  } catch (error) {
    ctx.notifications.push({
      category: error instanceof DocumentBuildError ? error.category : MESSAGE_CATEGORY.BuildDocument,
      severity: MESSAGE_SEVERITY.Error,
      message: error instanceof Error ? error.message : 'Cannot build document',
      documentId: file.slug,
    })
    // the placeholder keeps the parsed bytes, binary fallbacks included; the files the throw interrupted are
    // not on it, so their parse complaints go unreported
    return { file, document: buildErrorDocument(file, data), parsedFile: data }
  }
}

/**
 * Report the parse problems of the files this document bundled, against this document's slug.
 *
 * A `$ref`-ed file never becomes a document, so it has no slug to own the message, and `parseFile` caches by
 * `fileId` and would report it once. Reporting here flags every document that pulled the file in.
 *
 * Runs only once `buildFiles` has settled `publish`, and only for a document that will be published: an
 * unpublished one has no slug in `documents.json` for the message to name.
 */
async function reportDependencyParseErrors(document: VersionDocument, ctx: BuilderContext): Promise<void> {
  for (const dependency of document.dependencies ?? []) {
    const parsed = await ctx.parsedFileResolver(dependency)
    if (parsed) { reportParseErrors(parsed, false, document, ctx) }
  }
}

/**
 * Report the parse problems of the document's own file, once the version knows the document is published.
 *
 * An unpublished file is a `$ref` target like any other: the documents that bundle it already report its
 * problems and name it. A second message under its own slug would name a document `documents.json` does not
 * contain.
 */
function reportOwnParseErrors(document: VersionDocument, own: SourceFile, ctx: BuilderContext): void {
  reportParseErrors(own, true, document, ctx)
}

function reportParseErrors(file: SourceFile, isOwn: boolean, document: VersionDocument, ctx: BuilderContext): void {
  for (const error of file.errors ?? []) {
    ctx.notifications.push({
      // a parser that threw leaves a binary fallback; one that returned complaints leaves a text file
      category: file.kind === FILE_KIND.BINARY ? MESSAGE_CATEGORY.ParseFile : MESSAGE_CATEGORY.InvalidTextFile,
      severity: parseErrorSeverity(file, error),
      message: parseErrorMessage(file, isOwn, error?.message),
      documentId: document.slug,
    })
  }
}

/**
 * Take the severity the parser stated, and fall back per api type when it stated none.
 *
 * One constant was wrong for each type in a different way. REST complaints are AJV metaschema noise on
 * documents that parse and build, MCP complaints leave the document unusable, and AsyncAPI carries its own
 * severity. A parser that threw leaves a binary fallback, and that is an Error whatever produced it.
 */
function parseErrorSeverity(file: SourceFile, error: FileParseError | undefined): MessageSeverity {
  if (file.kind === FILE_KIND.BINARY) { return MESSAGE_SEVERITY.Error }
  // only a value the contract defines: the consumer rejects the whole archive over an unknown severity
  if (KNOWN_SEVERITIES.has(error?.severity as number)) { return error!.severity as MessageSeverity }
  return REST_DOCUMENT_TYPES.has(file.type) ? MESSAGE_SEVERITY.Warning : MESSAGE_SEVERITY.Error
}

const KNOWN_SEVERITIES = new Set<number>(Object.values(MESSAGE_SEVERITY))

const REST_DOCUMENT_TYPES = new Set<string>(Object.values(REST_DOCUMENT_TYPE))

// Name the offending `fileId` in the text when the file is a dependency: the message hangs on a different
// document, and the path is what the reader opens. It never goes into `documentId`.
function parseErrorMessage(file: SourceFile, isOwn: boolean, detail: string | undefined): string {
  const reason = detail ? ` ${detail}` : ''
  if (file.kind === FILE_KIND.BINARY) {
    return isOwn
      ? `Cannot parse file ${file.fileId}.${reason}`
      : `Cannot parse file '${file.fileId}' referenced from this document.${reason}`
  }
  return isOwn
    ? `Invalid ${file.type} file.${reason}`
    : `Invalid ${file.type} file '${file.fileId}' referenced from this document.${reason}`
}

export const buildFiles = async (files: BuildConfigFile[], ctx: BuilderContext): Promise<BuildFileResult[]> => {

  files = createFileSlugs(files, ctx.basePath)

  const tasks = []

  for (const file of files) {
    if (!file.fileId) { continue }
    tasks.push(
      buildFile(file, ctx),
    )
  }

  // every file settles before a failure is rethrown: a file still building would otherwise report into the
  // list after the failure had been taken, so what the failure carries would depend on timing
  const settled = await Promise.allSettled(tasks)
  const failure = settled.find((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected')
  const result = settled
    .filter((outcome): outcome is PromiseFulfilledResult<BuildFileResult> => outcome.status === 'fulfilled')
    .map(({ value }) => value)

  // the files that built report their parse problems even when another file failed, so the failure carries them
  await reportParseProblems(result, ctx)
  if (failure) { throw failure.reason }

  return result
}

/**
 * Settle which documents the version publishes and report the parse problems of the published ones.
 */
async function reportParseProblems(result: BuildFileResult[], ctx: BuilderContext): Promise<void> {
  // A file reached only through a `$ref` is not a document of its own: it publishes when the config asks for
  // it, or when its parser threw, because that is the file the publisher opens and its bytes go with it.
  const dependencies = new Set(result.flatMap(({ document }) => document.dependencies))
  for (const { document } of result) {
    if (document.publish !== undefined || !dependencies.has(document.fileId)) {
      document.publish = document.publish ?? true
      continue
    }
    const parsed = await ctx.parsedFileResolver(document.fileId)
    document.publish = parsed?.kind === FILE_KIND.BINARY && isNotEmpty(parsed.errors ?? [])
  }

  // `publish` is settled here, and only a published document has a slug in `documents.json` for a message to
  // name. Its own and its dependencies' parse problems are reported now; anything raised against a document
  // the version will not publish is dropped: the file is not part of the version, so its problems cost the
  // version nothing and must not refuse its release. A file reached through a `$ref` is a different case —
  // `reportDependencyParseErrors` reports it against every document that bundles it, naming the file.
  const unpublished = new Set(result.filter(({ document }) => !document.publish).map(({ document }) => document.slug))
  replaceInPlace(ctx.notifications,
    ctx.notifications.filter(({ documentId }) => !documentId || !unpublished.has(documentId)))

  for (const { document, parsedFile } of result) {
    if (!document.publish) { continue }
    await reportDependencyParseErrors(document, ctx)
    if (parsedFile) { reportOwnParseErrors(document, parsedFile, ctx) }
  }
}
