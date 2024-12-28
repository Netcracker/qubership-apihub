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

import { DocumentBuilder, DocumentDumper } from '../../types'
import { TEXT_DOCUMENT_TYPE } from './text.consts'

export const buildTextDocument: DocumentBuilder<string> = async (parsedFile, file) => {
  const { fileId, slug = '', publish = true, ...metadata } = file
  return {
    fileId,
    type: TEXT_DOCUMENT_TYPE.MARKDOWN,
    format: parsedFile.format,
    data: '',
    slug,
    publish,
    filename: fileId,
    title: fileId.split('/').pop()!.replace(/\.[^/.]+$/, ''),
    dependencies: [],
    description: parsedFile.data,
    operationIds: [],
    metadata,
    source: parsedFile.source,
  }
}

export const dumpTextDocument: DocumentDumper<string> = (document) => {
  return new Blob([document.description], { type: 'text/plain' })
}
