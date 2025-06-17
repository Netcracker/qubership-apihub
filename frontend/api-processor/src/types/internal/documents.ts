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

import { FileId, KeyOfConstType, OperationId } from '../external'
import { FILE_FORMAT } from '../../consts'

export interface VersionDocuments {
  documents: VersionDocument[]
}


export interface ExportDocument {
  data: Blob
  filename: string
}

export interface ZippableDocument<T = any> {
  fileId: FileId
  type: string
  data: T
  description: string
  source?: Blob

  filename: string
  publish?: boolean
}

// todo is there's a need to convert everything to VersionDocument, even if it is for export? (looks like yes cos buildBinaryDocument and buildUnknownDocument already use it) (nope)
export interface VersionDocument<T = any> extends ZippableDocument<T> {
  format: FileFormat
  slug: string
  title: string
  description: string
  version?: string
  filename: string
  dependencies: string[]
  operationIds: OperationId[]
  metadata: Record<string, unknown>
  errors?: number
  /*
  {
    labels?: string[]
    commitId?: string
    repositoryUrl?: string
    // other properties
  }
  */
  publish?: boolean
  source?: Blob
  apiKind?: string
}

export type FileFormat = KeyOfConstType<typeof FILE_FORMAT>
