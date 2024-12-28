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

import type { BuildType } from '@netcracker/qubership-apihub-api-processor'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { PublishMeta, PublishMetaDto } from '@netcracker/qubership-apihub-ui-shared/entities/publish-meta'

export type PackageVersionConfigDto = Readonly<{
  sources?: string
  version: Key
  previousVersion?: Key
  previousVersionPackageId?: Key
  status: VersionStatus
  groupName?: string
  apiType?: ApiType
  buildType?: BuildType
  metadata?: PublishMetaDto
  files?: VersionFilesDto
  refs?: VersionRefsDto
}>

type VersionFileDto = {
  fileId: Key
  publish?: boolean
  labels: string[]
  commitId?: string
  xApiKind?: string
}

type VersionFilesDto = ReadonlyArray<VersionFileDto>

type VersionRefDto = {
  refId: Key
  version: Key
  parentRefId?: Key
  parentVersion?: Key
  excluded?: boolean
}

type VersionRefsDto = ReadonlyArray<VersionRefDto>

export type PackageVersionConfig = Readonly<{
  version: Key
  previousVersion?: Key
  previousVersionPackageKey?: Key
  status: VersionStatus
  groupName?: string
  apiType?: ApiType
  buildType?: BuildType
  metaData?: PublishMeta
  files?: VersionFiles
  refs?: VersionRefs
}>

type VersionFile = {
  fileKey: Key
  publish?: boolean
  labels: string[]
  commitKey?: string
  xApiKind?: string
}

export type VersionFiles = ReadonlyArray<VersionFile>

type VersionRef = {
  refKey: Key
  version: Key
  parentRefKey?: Key
  parentVersion?: Key
  excluded?: boolean
}

type VersionRefs = ReadonlyArray<VersionRef>

export function toPackageVersionConfig(value: PackageVersionConfigDto): PackageVersionConfig {
  const { previousVersionPackageId, metadata, files, refs } = value
  return {
    ...value,
    previousVersionPackageKey: previousVersionPackageId,
    metaData: {
      ...metadata,
      commitKey: metadata?.commitId,
    },
    files: files?.map(toVersionFile),
    refs: refs?.map(toVersionRef),
  }
}

function toVersionFile(value: VersionFileDto): VersionFile {
  const { fileId, commitId } = value
  return {
    ...value,
    fileKey: fileId,
    commitKey: commitId,
  }
}

function toVersionRef(value: VersionRefDto): VersionRef {
  const { refId, parentRefId } = value
  return {
    ...value,
    refKey: refId,
    parentRefKey: parentRefId,
  }
}
