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

import { FileId, OperationId } from '../external'
import { ApihubApiCompatibilityKind } from '../../consts'

export type PackageDocuments = {
  documents: PackageDocument[]
}

export interface PackageDocument {
  fileId: FileId
  filename: string

  slug: string
  type: string
  format: string

  title: string
  description: string
  version?: string

  operationIds: OperationId[]

  // items should be passthrough from buildConfig.files
  metadata?: Record<string, unknown>
  apiKind?: ApihubApiCompatibilityKind
}
