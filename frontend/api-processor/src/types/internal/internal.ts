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

/**
 * What `files.ts` reads off a parse diagnostic when it turns one into a notification.
 *
 * Producers carry more — an AJV `ErrorObject`, an AsyncAPI diagnostic, a DDL issue — and keep their own type
 * through the `E` parameter. Both fields are optional because not every producer states a severity, and the
 * one that does is trusted only for a value `MESSAGE_SEVERITY` defines.
 */
export interface FileParseError {
  message?: string
  severity?: number
}

export interface TextFile<T = any, E extends FileParseError = FileParseError> extends FileBase {
  kind: typeof FILE_KIND.TEXT
  data: T
  errors?: E[]
}

export interface BinaryFile<E extends FileParseError = FileParseError> extends FileBase {
  kind: typeof FILE_KIND.BINARY
  errors?: E[]
}

export type SourceFile = TextFile | BinaryFile

export interface VersionFiles<T = VersionDocument> {
  files: T[]
}

export type VersionParams = [VersionId, PackageId] | null
