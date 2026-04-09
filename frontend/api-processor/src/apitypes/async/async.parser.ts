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
import type { Parser, ParseOutput, Diagnostic } from '@asyncapi/parser'

import { ASYNC_DOCUMENT_TYPE, ASYNC_FILE_FORMAT } from './async.consts'
import { FILE_KIND, TextFile } from '../../types'
import { getFileExtension } from '../../utils'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'

interface ValidationError {
  message: string
  path?: string
}

class AsyncApiValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AsyncApiValidationError'
  }
}

const ASYNCAPI_3_JSON_PATTERN = /\s*?"asyncapi"\s*?:\s*?"3\..+?"/
const ASYNCAPI_3_YAML_PATTERN = /\s*?'?"?asyncapi'?"?\s*?:\s*?\|?\s*'?"?3\..+?'?"?/

type FormatInfo = {
  format: typeof ASYNC_FILE_FORMAT[keyof typeof ASYNC_FILE_FORMAT]
  parse: (source: string) => AsyncAPIV3.AsyncAPIObject
}

function detectFormat(extension: string, sourceString: string): FormatInfo | undefined {
  if (extension === ASYNC_FILE_FORMAT.JSON || sourceString.trimStart().startsWith('{')) {
    if (ASYNCAPI_3_JSON_PATTERN.test(sourceString)) {
      return {
        format: ASYNC_FILE_FORMAT.JSON,
        parse: (s) => JSON.parse(s) as AsyncAPIV3.AsyncAPIObject,
      }
    }
  } else if (extension === ASYNC_FILE_FORMAT.YAML || extension === 'yml' || !extension) {
    if (ASYNCAPI_3_YAML_PATTERN.test(sourceString)) {
      return {
        format: ASYNC_FILE_FORMAT.YAML,
        parse: (s) => YAML.load(s) as AsyncAPIV3.AsyncAPIObject,
      }
    }
  }
  return undefined
}

export const parseAsyncApiFile = async (fileId: string, source: Blob): Promise<TextFile<AsyncAPIV3.AsyncAPIObject, ValidationError> | undefined> => {
  const sourceString = await source.text()
  const extension = getFileExtension(fileId)

  const formatInfo = detectFormat(extension, sourceString)
  if (!formatInfo) {
    return undefined
  }

  let data: AsyncAPIV3.AsyncAPIObject
  try {
    data = formatInfo.parse(sourceString)
  } catch (error) {
    throw new Error(`Failed to parse AsyncAPI file '${fileId}': ${error instanceof Error ? error.message : 'Unknown parse error'}`)
  }

  const errors = await validateAsyncApiDocument(sourceString)

  return {
    fileId,
    type: ASYNC_DOCUMENT_TYPE.AAS3,
    format: formatInfo.format,
    data,
    source,
    errors,
    kind: FILE_KIND.TEXT,
  }
}

let cachedParserClass: typeof Parser | undefined

async function getParserClass(): Promise<typeof Parser> {
  if (cachedParserClass) {
    return cachedParserClass
  }

  // Dynamic import — bundler will use appropriate version based on environment.
  // Browser builds will use @asyncapi/parser/browser automatically via vite alias.
  const parserModule = await import('@asyncapi/parser')

  // Handle different export formats (ESM named export vs default export)
  const ParserClass = (parserModule as { Parser?: typeof Parser; default?: typeof Parser }).Parser ||
    parserModule.default as typeof Parser

  if (!ParserClass) {
    throw new Error('AsyncAPI Parser class not found in module exports')
  }

  cachedParserClass = ParserClass
  return ParserClass
}

/**
 * Validates AsyncAPI document using official parser.
 * This provides spec validation while avoiding circular reference issues
 * by using the parser only for validation, not for the actual parsing.
 *
 * @throws AsyncApiValidationError when critical validation errors (severity 0) are found
 * @returns Non-critical diagnostics (warnings, info) to be collected as notifications
 */
async function validateAsyncApiDocument(sourceString: string): Promise<ValidationError[] | undefined> {
  try {
    const ParserClass = await getParserClass()
    const parser: Parser = new ParserClass()
    const { diagnostics }: ParseOutput = await parser.parse(sourceString)

    const criticalErrors: Diagnostic[] = diagnostics.filter(diagnostic => diagnostic.severity === 0)
    const nonCriticalDiagnostics: Diagnostic[] = diagnostics.filter(diagnostic => diagnostic.severity > 0)

    if (criticalErrors.length > 0) {
      const errorMessages = criticalErrors.map(err => {
        const location = err.range ? ` at line ${err.range.start.line}` : ''
        return `${err.message}${location}`
      }).join('; ')

      throw new AsyncApiValidationError(`AsyncAPI validation failed: ${errorMessages}`)
    }

    if (nonCriticalDiagnostics.length > 0) {
      return nonCriticalDiagnostics.map(diagnostic => ({
        message: diagnostic.message,
        path: diagnostic.range ? `Line ${diagnostic.range.start.line}` : undefined,
      }))
    }

    return undefined
  } catch (error) {
    if (error instanceof AsyncApiValidationError) {
      throw error
    }

    throw new Error(`AsyncAPI validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

