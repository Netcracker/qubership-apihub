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

import type {
  ApiAudience,
  ApiKind,
  BuildConfig,
  ResolvedDeprecatedOperations,
  ResolvedGroupDocuments,
  ResolvedOperation,
  ResolvedReferences,
  ResolvedVersionDocuments,
} from '@netcracker/qubership-apihub-api-processor'
import { generatePath } from 'react-router-dom'
import type { ApiType } from '../entities/api-types'
import type { OperationDto, OperationsDto } from '../entities/operations'
import { isRestOperationDto } from '../entities/operations'
import type { ResolvedVersionDto } from '../types/packages'
import { getPackageRedirectDetails } from './redirects'
import { API_V1, API_V2, API_V3, requestBlob, requestJson, requestVoid } from './requests'
import { optionalSearchParams } from './search-params'
import type { Key } from './types'
import type { DocumentsDto } from '../entities/documents'

export async function getPackageVersionContent(
  packageKey: Key,
  versionKey: Key,
  includeOperations: boolean = false,
): Promise<ResolvedVersionDto | null> {
  try {
    const queryParams = optionalSearchParams({
      includeOperations: { value: includeOperations },
    })

    const packageId = encodeURIComponent(packageKey)
    const versionId = encodeURIComponent(versionKey)

    const pathPattern = '/packages/:packageId/versions/:versionId'
    return await requestJson<ResolvedVersionDto>(
      `${generatePath(pathPattern, { packageId, versionId })}?${queryParams}`,
      { method: 'get' },
      {
        basePath: API_V2,
        customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
      },
    )
  } catch (error) {
    return null
  }
}

export async function fetchOperations(
  operationsApiType: ApiType,
  packageKey: Key,
  versionKey: Key,
  operationIds: string[] | undefined,
  includeData: boolean | undefined,
  page: number = 0,
  limit: number = 100,
): Promise<OperationsDto> {
  const queryParams = optionalSearchParams({
    ids: { value: operationIds },
    includeData: { value: includeData },
    page: { value: page },
    limit: { value: limit },
  })
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const apiType = operationsApiType.toLowerCase()

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/operations'
  return requestJson<OperationsDto>(
    `${generatePath(pathPattern, { packageId, versionId, apiType })}?${queryParams}`,
    { method: 'get' },
    {
      basePath: API_V2,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}

export async function fetchDeprecatedItems(
  operationsApiType: ApiType,
  packageKey: Key,
  versionKey: Key,
  operationIds: string[] | undefined,
): Promise<ResolvedDeprecations | null> {

  const queryParams = optionalSearchParams({
    ids: { value: operationIds },
    includeDeprecatedItems: { value: true },
  })

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const apiType = operationsApiType.toLowerCase()

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/deprecated'
  return await requestJson<ResolvedDeprecations>(
    `${generatePath(pathPattern, { packageId, versionId, apiType })}?${queryParams}`,
    { method: 'GET' },
    {
      basePath: API_V2,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}

export async function fetchVersionDocuments(
  apiType: ApiType,
  packageKey: Key,
  versionKey: Key,
  filterByOperationGroup: string,
  page: number,
  limit: number = 100,
): Promise<ResolvedGroupDocuments | null> {
  const queryParams = optionalSearchParams({
    page: { value: page },
    limit: { value: limit },
  })

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const groupName = encodeURIComponent(filterByOperationGroup)

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/groups/:groupName/transformation/documents'
  return await requestJson<ResolvedGroupDocuments>(
    `${generatePath(pathPattern, { packageId, versionId, apiType, groupName })}?${queryParams}`,
    { method: 'GET' },
    {
      basePath: API_V2,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}

export type ErrorMessage = string

export type SetPublicationDetailsOptions = {
  packageKey: Key
  publishKey: Key
  status: PublishStatus
  builderId: string
  abortController: AbortController | null
  data?: Blob
  errors?: ErrorMessage
}

export async function setPublicationDetails(options: SetPublicationDetailsOptions): Promise<void> {
  const {
    packageKey,
    publishKey,
    status,
    builderId,
    abortController,
    data,
    errors,
  } = options

  const formData = new FormData()
  formData.append('status', status)
  formData.append('builderId', builderId)
  errors && formData.append('errors', errors)
  data && formData.append('data', data, 'package.zip')

  const signal = abortController?.signal
  const packageId = encodeURIComponent(packageKey)
  const publishId = encodeURIComponent(publishKey)

  const pathPattern = '/packages/:packageId/publish/:publishId/status'
  return requestVoid(
    generatePath(pathPattern, { packageId, publishId }),
    {
      method: 'post',
      body: formData,
      signal: signal,
    },
    {
      basePath: API_V3,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}

export async function getVersionReferences(
  packageKey: Key,
  version: Key,
): Promise<Readonly<ResolvedReferences>> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(version)

  const pathPattern = '/packages/:packageId/versions/:versionId/references'
  return await requestJson<Readonly<ResolvedReferences>>(
    generatePath(pathPattern, { packageId, versionId }),
    { method: 'GET' },
    {
      basePath: API_V3,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}

export type PublishConfig = { publishId: Key; config: BuildConfig }

export async function startPackageVersionPublication(
  config: BuildConfig,
  builderId: string,
  sources?: Blob | null,
): Promise<PublishConfig> {
  const formData = new FormData()
  formData.append('clientBuild', 'true')
  formData.append('builderId', builderId)
  sources && formData.append('sources', sources, 'package.zip')

  const publishConfig = {
    ...config,
    sources: undefined,
  }

  formData.append('config', JSON.stringify(publishConfig))
  const packageId = encodeURIComponent(config.packageId)
  const pathPattern = '/packages/:packageId/publish'
  return await requestJson<PublishConfig>(
    `${generatePath(pathPattern, { packageId })}?clientBuild=true`,
    {
      method: 'POST',
      body: formData,
    },
    {
      basePath: API_V2,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}

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
  publishId: string
  status: PublishStatus
  message?: string
}

export function toVersionOperation(value: OperationDto): ResolvedOperation {
  const metadata = isRestOperationDto(value)
    ? {
      tags: value.tags,
      method: value.method,
      path: value.path,
    }
    : {
      tags: value.tags,
      method: value.method,
      type: value.type,
    }
  return {
    operationId: value.operationId,
    documentId: value.documentId,
    data: value.data!,
    apiKind: value.apiKind as ApiKind,
    apiAudience: value.apiAudience as ApiAudience,
    deprecated: value.deprecated ?? false,
    title: value.title,
    metadata: metadata,
    apiType: value.apiType,
  }
}

export type ResolvedDeprecations = Readonly<ResolvedDeprecatedOperations>

export async function fetchExportTemplate(
  packageKey: Key,
  versionKey: Key,
  apiType: ApiType,
  groupName: string,
): Promise<[string, string]> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const encodedGroupName = encodeURIComponent(groupName)

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/groups/:encodedGroupName/template'
  const response = await requestBlob(
    generatePath(pathPattern, { packageId, versionId, apiType, encodedGroupName }),
    { method: 'GET' },
    {
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
      basePath: API_V1,
    },
  )
  const data = await response.blob()

  const getFilename = (): string => response.headers
    .get('content-disposition')!
    .split('filename=')[1]
    .split(';')[0]

  return [await data.text(), getFilename()]
}

export async function getDocuments(
  packageKey: Key,
  versionKey: Key,
  apiType?: ApiType,
  signal?: AbortSignal,
): Promise<DocumentsDto> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const queryParams = optionalSearchParams({ apiType: { value: apiType } })
  const pathPattern = '/packages/:packageId/versions/:versionId/documents'
  return await requestJson<DocumentsDto>(
    `${generatePath(pathPattern, { packageId, versionId })}?${queryParams}`,
    { method: 'get' },
    {
      basePath: API_V2,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  )
}

// todo fix api-processor and ui types incompatibility. Only one getDocuments should be left
export async function getResolvedVersionDocuments(
  packageKey: Key,
  versionKey: Key,
  apiType?: ApiType,
  signal?: AbortSignal,
): Promise<ResolvedVersionDocuments> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const queryParams = optionalSearchParams({ apiType: { value: apiType } })
  const pathPattern = '/packages/:packageId/versions/:versionId/documents'
  return await requestJson<ResolvedVersionDocuments>(
    `${generatePath(pathPattern, { packageId, versionId })}?${queryParams}`,
    { method: 'get' },
    {
      basePath: API_V2,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
    signal,
  )
}
