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

import { useQuery } from '@tanstack/react-query'

import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import {
  DOCS_APIHUB_DOCUMENTS_QUERY_KEY,
  DOCS_APIHUB_VERSIONS_QUERY_KEY,
  docsRequestJson,
  useDocsBackendBasePath,
} from '../docsRequests'
import type { ApihubDocumentRelayDto, ApihubVersionRelayDto } from '../types'

type VersionsRelayDto = Readonly<{ versions: ReadonlyArray<ApihubVersionRelayDto> }>
type DocumentsRelayDto = Readonly<{ documents: ReadonlyArray<ApihubDocumentRelayDto> }>

/** Versions of an APIHUB package, relayed by the docs backend with the admin's credentials. */
export function useApihubVersionsRelay(packageId: Key | undefined): [ReadonlyArray<ApihubVersionRelayDto>, IsLoading, Error | null] {
  const basePath = useDocsBackendBasePath()
  const enabled = !!packageId

  const { data, isLoading, error } = useQuery<VersionsRelayDto, Error, ReadonlyArray<ApihubVersionRelayDto>>({
    queryKey: [DOCS_APIHUB_VERSIONS_QUERY_KEY, basePath, packageId],
    queryFn: () => docsRequestJson<VersionsRelayDto>(
      basePath,
      `/admin/apihub/packages/${encodeURIComponent(packageId!)}/versions`,
      { method: 'GET' },
    ),
    select: dto => dto?.versions ?? [],
    enabled: enabled,
  })

  return [data ?? [], isLoading && enabled, error]
}

/** Markdown documents of an APIHUB package version, relayed by the docs backend. */
export function useApihubDocumentsRelay(packageId: Key | undefined, version: string | undefined): [ReadonlyArray<ApihubDocumentRelayDto>, IsLoading, Error | null] {
  const basePath = useDocsBackendBasePath()
  const enabled = !!packageId && !!version

  const { data, isLoading, error } = useQuery<DocumentsRelayDto, Error, ReadonlyArray<ApihubDocumentRelayDto>>({
    queryKey: [DOCS_APIHUB_DOCUMENTS_QUERY_KEY, basePath, packageId, version],
    queryFn: () => docsRequestJson<DocumentsRelayDto>(
      basePath,
      `/admin/apihub/packages/${encodeURIComponent(packageId!)}/versions/${encodeURIComponent(version!)}/documents`,
      { method: 'GET' },
    ),
    select: dto => dto?.documents ?? [],
    enabled: enabled,
  })

  return [data ?? [], isLoading && enabled, error]
}
