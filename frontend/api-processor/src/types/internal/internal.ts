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

import { PackageId, VersionId } from '../external'

import { FileFormat, VersionDocument } from './documents'

export const FILE_KIND = {
  BINARY: 'binary',
  TEXT: 'text',
} as const

interface FileBase {
  fileId: string
  type: string
  format: FileFormat
  source: Blob
}

// TODO: review usages of errors from ajv and @asyncapi/parser
// add corresponding tests for notifications
export interface TextFile<T = any, E = any> extends FileBase {
  kind: typeof FILE_KIND.TEXT
  data: T
  errors?: E[]
}

export interface BinaryFile extends FileBase {
  kind: typeof FILE_KIND.BINARY
}

export type SourceFile = TextFile | BinaryFile

export interface VersionFiles<T = VersionDocument> {
  files: T[]
}

export type VersionParams = [VersionId, PackageId] | null
