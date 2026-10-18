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

import { TEXT_DOCUMENT_TYPE, TEXT_FILE_FORMAT } from './text.consts'
import { FILE_KIND, TextFile } from '../../types'
import { getFileExtension } from '../../utils'

export const parseTextFile = async (fileId: string, source: Blob): Promise<TextFile<string> | undefined> => {
  const sourceString = await source.text()
  const extension = getFileExtension(fileId)
  if (extension === TEXT_FILE_FORMAT.MD) {
    return {
      fileId,
      type: TEXT_DOCUMENT_TYPE.MARKDOWN,
      format: TEXT_FILE_FORMAT.MD,
      data: sourceString,
      source,
      kind: FILE_KIND.TEXT,
    }
  }
}
