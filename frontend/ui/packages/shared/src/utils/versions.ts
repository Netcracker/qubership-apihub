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

import type { Key } from './types'
import { API_V2, requestJson } from './requests'
import { generatePath } from 'react-router-dom'
import { getPackageRedirectDetails } from './redirects'
import type { PackageVersion, PackageVersions } from '../entities/versions'

export function getSplittedVersionKey(version: Key | undefined, latestRevision: boolean = true): {
  versionKey: Key
  revisionKey: Key
} {
  if (!version) {
    return { versionKey: '', revisionKey: '' }
  }

  const [versionKey, revisionKey] = version.split('@')
  return {
    versionKey: latestRevision ? versionKey : version,
    revisionKey: revisionKey,
  }
}

export async function getFullVersion(
  options: {
    packageKey: Key | undefined
    versionKey: Key | undefined
    enabled?: boolean
  },
  signal?: AbortSignal,
): Promise<VersionData> {
  const { packageKey, versionKey, enabled = true } = options
  const packageId = encodeURIComponent(packageKey ?? '')
  const versionId = encodeURIComponent(versionKey ?? '')

  let versionData = { version: '' }
  if (enabled && packageKey && versionKey) {
    const pathPattern = '/packages/:packageId/versions/:versionId'
    const versionDataDto = await requestJson<VersionDataDto>(
      generatePath(pathPattern, { packageId, versionId }),
      { method: 'get' },
      {
        basePath: API_V2,
        customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
      },
      signal,
    )
    versionData = toVersionData(versionDataDto)
  }

  return versionData
}

export function getVersionLabelsMap(versions: PackageVersions): Record<Key, string[]> {
  return Object.fromEntries<string[]>(
    versions.map(({ key, versionLabels }) => [
      getSplittedVersionKey(key).versionKey,
      versionLabels ?? [],
    ]),
  )
}

export function handleVersionsRevision(versions: ReadonlyArray<PackageVersion>): ReadonlyArray<PackageVersion> {
  return versions.map(handleVersionRevision)
}

function handleVersionRevision(version: PackageVersion): PackageVersion {
  const { key, latestRevision } = version
  const { versionKey } = getSplittedVersionKey(key, latestRevision)
  return {
    ...version,
    key: versionKey,
  }
}

type VersionDataDto = {
  version: Key
  notLatestRevision?: boolean
}

type VersionData = {
  version: Key
  latestRevision?: boolean
}

function toVersionData(value: VersionDataDto): VersionData {
  return {
    version: value.version,
    latestRevision: !value?.notLatestRevision,
  }
}
