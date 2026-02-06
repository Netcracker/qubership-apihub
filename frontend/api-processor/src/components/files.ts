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

import type { BuildConfigFile, BuilderContext, BuildFileResult } from '../types'
import { buildDocument, buildErrorDocument } from './document'
import { MESSAGE_SEVERITY } from '../consts'
import { buildOperations } from './operations'
import { SLUG_OPTIONS_DOCUMENT_ID, slugify } from '../utils'
import { asyncDebugPerformance, DebugPerformanceContext } from '../utils/logs'

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

export const buildFile = async (file: BuildConfigFile, ctx: BuilderContext, debugCtx: DebugPerformanceContext): Promise<BuildFileResult> => {
  const data = await asyncDebugPerformance('[Parse]', () => ctx.parsedFileResolver(file.fileId), debugCtx)

  if (!data) {
    ctx.notifications.push({
      severity: MESSAGE_SEVERITY.Error,
      message: 'File was not parsed',
      fileId: file.fileId,
    })
    return {
      document: buildErrorDocument(file),
    }
  }

  const document = await asyncDebugPerformance(
    '[Document]',
    () => buildDocument(data, file, ctx),
    debugCtx,
    [data.type],
  )

  if (!document) {
    ctx.notifications.push({
      severity: MESSAGE_SEVERITY.Error,
      message: 'Cannot build document',
      fileId: file.fileId,
    })
    return {
      document: buildErrorDocument(file),
    }
  }

  if (file.publish === false) {
    return { document, operations: [] }
  }

  const operations = await asyncDebugPerformance(
    '[Operations]',
    (innterDebugCtx) => buildOperations(document, ctx, innterDebugCtx),
    debugCtx,
  )

  document.operationIds = operations?.map(({ operationId }) => operationId)
  return { document, operations }
}

export const buildFiles = async (files: BuildConfigFile[], ctx: BuilderContext, debugCtx?: DebugPerformanceContext): Promise<BuildFileResult[]> => {

  files = createFileSlugs(files, ctx.basePath)

  const tasks = []

  for (const file of files) {
    if (!file.fileId) { continue }
    tasks.push(
      asyncDebugPerformance(
        '[File]',
        (innerDebugCtx) => buildFile(file, ctx, innerDebugCtx),
        debugCtx,
        [file.fileId],
      ),
    )
  }

  const result = await Promise.all(tasks)

  // update publish status in documents
  const dependencies = result.reduce((r, curr) => [...r, ...curr.document.dependencies], [] as string[])
  for (const { document } of result) {
    if (!dependencies.includes(document.fileId) && document.publish === undefined) {
      document.publish = true
    }
  }

  return result
}
