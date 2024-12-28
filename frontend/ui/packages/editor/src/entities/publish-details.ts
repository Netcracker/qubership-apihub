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

import type { Key, VersionKey } from './keys'
import type { JSZipObject } from 'jszip'
import JSZip from 'jszip'
import type { BuildConfigRef, FileSourceMap, VersionStatus } from '@netcracker/qubership-apihub-api-processor'
import { requestBlob } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

export type PublishKey = Key
export type PackageKey = Key
export const NONE_PUBLISH_STATUS = 'none'
export const RUNNING_PUBLISH_STATUS = 'running'
export const COMPLETE_PUBLISH_STATUS = 'complete'
export const ERROR_PUBLISH_STATUS = 'error'
export type PublishStatus =
  | typeof NONE_PUBLISH_STATUS // technical status
  | typeof RUNNING_PUBLISH_STATUS
  | typeof COMPLETE_PUBLISH_STATUS
  | typeof ERROR_PUBLISH_STATUS

export type PublishDetails = PublishDetailsDto

export type PublishDetailsDto = {
  publishId: PublishKey
  status: PublishStatus
  message?: string
}

export type PublishOptions = {
  packageId: PackageKey
  projectId: Key
  version: VersionKey
  previousVersion: VersionKey
  previousVersionPackageId?: PackageKey
  status: VersionStatus
  createdBy: Key
  refs: BuildConfigRef[]
  files: {
    fileId: Key
    publish: boolean
    labels: string[]
    blobId?: string
  }[]
  metadata: {
    versionLabels: string[]
    branchName: string
    repositoryUrl: string
    commitId?: string
  }
  sources?: FileSourceMap
}

export async function fetchAllFiles(
  projectKey: Key,
  branchKey: Key,
  authorization: string,
): Promise<FileSourceMap> {
  try {
    const data = await fetchAllFilesBlob(projectKey, branchKey, authorization) as Blob

    return getSourcesFromZip(data)
  } catch (error) {
    return {}
  }
}

export async function getSourcesFromZip(data: Blob): Promise<FileSourceMap> {
  const zip = new JSZip()
  const result: FileSourceMap = {}
  const fileMap: Map<string, JSZipObject> = new Map()

  const jsZip = await zip.loadAsync(data)
  jsZip.forEach((relativePath, file) => fileMap.set(relativePath, file))

  for (const [key, value] of fileMap) {
    result[key] = await value.async('blob')
  }

  return result
}

export async function fetchAllFilesBlob(
  projectKey: Key,
  branchKey: Key,
  authorization: string,
): Promise<Blob | null> {
  try {
    return await (await requestBlob(
      `/api/v1/projects/${encodeURIComponent(projectKey)}/branches/${encodeURIComponent(branchKey)}/allfiles`,
      {
        headers: { authorization },
        method: 'GET',
      },
    )).blob()
  } catch (error) {
    return null
  }
}
