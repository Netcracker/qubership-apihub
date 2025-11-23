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

import YAML from 'js-yaml'

import { ASYNC_DOCUMENT_TYPE, ASYNC_FILE_FORMAT } from './async.consts'
import { FILE_KIND, TextFile } from '../../types'
import { getFileExtension } from '../../utils'
import { AsyncApiDocument } from './async.types'

export const parseAsyncApiFile = async (fileId: string, source: Blob): Promise<TextFile | undefined> => {
  const sourceString = await source.text()
  const extension = getFileExtension(fileId)

  // Detect AsyncAPI 3.0 documents
  const isAsyncApi3Json = /\s*?"asyncapi"\s*?:\s*?"3\..+?"/g.test(sourceString)
  const isAsyncApi3Yaml = /\s*?'?"?asyncapi'?"?\s*?:\s*?\|?\s*'?"?3\..+?'?"?/g.test(sourceString)

  if (extension === ASYNC_FILE_FORMAT.JSON || sourceString.trimStart().startsWith('{')) {
    if (isAsyncApi3Json) {
      const data = JSON.parse(sourceString) as AsyncApiDocument
      const errors = await validateAsyncApiDocument(sourceString)

      return {
        fileId,
        type: ASYNC_DOCUMENT_TYPE.AAS3,
        format: ASYNC_FILE_FORMAT.JSON,
        data,
        source,
        errors,
        kind: FILE_KIND.TEXT,
      }
    }
  } else if (([ASYNC_FILE_FORMAT.YAML, 'yml'] as string[]).includes(extension) || !extension) {
    if (isAsyncApi3Yaml) {
      const data = YAML.load(sourceString) as AsyncApiDocument
      const errors = await validateAsyncApiDocument(sourceString)

      return {
        fileId,
        type: ASYNC_DOCUMENT_TYPE.AAS3,
        format: ASYNC_FILE_FORMAT.YAML,
        data,
        source,
        errors,
        kind: FILE_KIND.TEXT,
      }
    }
  }

  return undefined
}

/**
 * Validates AsyncAPI document using official parser
 * This provides spec validation while avoiding circular reference issues
 * by using the parser only for validation, not for the actual parsing
 */
async function validateAsyncApiDocument(sourceString: string): Promise<any[] | undefined> {
  try {
    // Dynamic import - bundler will use appropriate version based on environment
    // Browser builds will use @asyncapi/parser/browser automatically
    const { Parser } = await import('@asyncapi/parser')
    const parser = new Parser()
    const { document, diagnostics } = await parser.parse(sourceString)

    // Check for critical validation errors
    const errors = diagnostics.filter(d => d.severity === 0) // 0 = error severity

    if (errors.length > 0) {
      // Convert diagnostics to error format
      return errors.map(err => ({
        message: err.message,
        path: err.range ? `Line ${err.range.start.line}` : undefined,
      }))
    }

    return undefined
  } catch (error) {
    // If validation fails, return the error
    // TODO: better raise JS error to fail the build
    return [{
      message: error instanceof Error ? error.message : 'AsyncAPI validation failed',
    }]
  }
}

