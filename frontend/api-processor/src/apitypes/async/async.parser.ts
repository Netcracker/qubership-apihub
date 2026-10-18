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

import { parse as  parseYaml} from 'yaml'

import { ASYNC_DOCUMENT_TYPE, ASYNC_FILE_FORMAT } from './async.consts'
import { FILE_KIND, TextFile } from '../../types'
import { getFileExtension } from '../../utils'
import { RecognizedFileParseError } from '../../errors'
import { v3 as AsyncAPIV3 } from '@asyncapi/parser/esm/spec-types'
import { validateAsyncApiDocument, ValidationError } from './async.validation'

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
        parse: (s) => parseYaml(s) as AsyncAPIV3.AsyncAPIObject,
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
    const message = `Failed to parse AsyncAPI file '${fileId}': ${error instanceof Error ? error.message : 'Unknown parse error'}`
    throw new RecognizedFileParseError(new Error(message, { cause: error }), ASYNC_DOCUMENT_TYPE.AAS3, formatInfo.format)
  }

  let errors: ValidationError[] | undefined
  try {
    errors = await validateAsyncApiDocument(sourceString)
  } catch (error) {
    throw new RecognizedFileParseError(error, ASYNC_DOCUMENT_TYPE.AAS3, formatInfo.format)
  }

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
