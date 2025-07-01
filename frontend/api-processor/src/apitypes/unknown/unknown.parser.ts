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

import { DOCUMENT_TYPE, FILE_FORMAT, SUPPORTED_FILE_FORMATS } from '../../consts'
import { BinaryFile, FILE_KIND, FileFormat, TextFile } from '../../types/internal'
import { getFileExtension } from '../../utils'

export const parseUnknownFile = async (fileId: string, source: Blob): Promise<TextFile | undefined> => {
  const sourceString = await source.text()
  const extension = getFileExtension(fileId)
  if (extension === FILE_FORMAT.JSON || (!extension && sourceString.trimStart().startsWith('{'))) {
    return {
      fileId,
      type: DOCUMENT_TYPE.UNKNOWN,
      format: FILE_FORMAT.JSON,
      data: JSON.parse(sourceString),
      source,
      kind: FILE_KIND.TEXT,
    }
  }
  if (extension === FILE_FORMAT.YAML || extension === FILE_FORMAT.YML) {
    return {
      fileId,
      type: DOCUMENT_TYPE.UNKNOWN,
      format: FILE_FORMAT.YAML,
      data: YAML.load(sourceString),
      source,
      kind: FILE_KIND.TEXT,
    }
  }
}

export const unknownParsedFile = (fileId: string, source: Blob): BinaryFile => {
  const extension = getFileExtension(fileId)
  const format = (SUPPORTED_FILE_FORMATS as string[]).includes(extension) ? extension as FileFormat : FILE_FORMAT.UNKNOWN
  return { fileId, type: DOCUMENT_TYPE.UNKNOWN, format: format, source, kind: FILE_KIND.BINARY }
}
