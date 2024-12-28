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
import { API_V1, API_V2, API_V3, requestBlob, requestJson, requestVoid } from './requests'
import type {
  ApiAudience,
  ApiKind,
  BuildConfig,
  ResolvedDeprecatedOperations,
  ResolvedDocuments,
  ResolvedOperation,
  ResolvedReferences,
} from '@netcracker/qubership-apihub-api-processor'
import { optionalSearchParams } from './search-params'
import { getPackageRedirectDetails } from './redirects'
import { generatePath } from 'react-router-dom'
import type { ResolvedVersionDto } from '../types/packages'
import type { OperationDto, OperationsDto } from '../entities/operations'
import { isRestOperationDto } from '../entities/operations'
import type { ApiType } from '../entities/api-types'
import { API_TYPE_REST } from '../entities/api-types'

export async function getPackageVersionContent(
  packageKey: Key,
  versionKey: Key,
  includeOperations: boolean = false,
  authorization: string,
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
      {
        method: 'get',
        headers: { authorization },
      },
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
  authorization: string,
  limit = 100,
): Promise<OperationsDto | null> {
  try {
    const queryParams = optionalSearchParams({
      ids: { value: operationIds },
      includeData: { value: includeData },
      limit: { value: limit },
    })
    const packageId = encodeURIComponent(packageKey)
    const versionId = encodeURIComponent(versionKey)
    const apiType = operationsApiType.toLowerCase()

    const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/operations'
    return await requestJson<OperationsDto>(
      `${generatePath(pathPattern, { packageId, versionId, apiType })}?${queryParams}`,
      {
        headers: { authorization },
        method: 'get',
      },
      {
        basePath: API_V2,
        customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
      },
    )
  } catch (error) {
    return null
  }
}

export async function fetchDeprecatedItems(
  operationsApiType: ApiType,
  packageKey: Key,
  versionKey: Key,
  operationIds: string[] | undefined,
  authorization: string,
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
    {
      headers: { authorization },
      method: 'GET',
    },
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
  authorization: string,
  page: number,
  limit: number = 100,
): Promise<ResolvedDocuments | null> {
  const queryParams = optionalSearchParams({
    page: { value: page },
    limit: { value: limit },
  })

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const groupName = encodeURIComponent(filterByOperationGroup)

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/groups/:groupName/transformation/documents'
  return await requestJson<ResolvedDocuments>(
    `${generatePath(pathPattern, { packageId, versionId, apiType, groupName })}?${queryParams}`,
    {
      headers: { authorization },
      method: 'GET',
    },
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
  authorization: string
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
    authorization,
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
      headers: { authorization },
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
  authorization: string,
): Promise<Readonly<ResolvedReferences>> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(version)

  const pathPattern = '/packages/:packageId/versions/:versionId/references'
  return await requestJson<Readonly<ResolvedReferences>>(
    generatePath(pathPattern, { packageId, versionId }),
    {
      method: 'GET',
      headers: { authorization },
    },
    {
      basePath: API_V3,
      customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
    },
  )
}

export type PublishConfig = { publishId: Key; config: BuildConfig }

export async function startPackageVersionPublication(
  config: BuildConfig,
  authorization: string,
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
      headers: { authorization },
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
    data: value.data!,
    dataHash: value.dataHash,
    apiKind: value.apiKind as ApiKind,
    apiAudience: value.apiAudience as ApiAudience,
    deprecated: value.deprecated ?? false,
    title: value.title,
    metadata: metadata,
    apiType: API_TYPE_REST,
  }
}

export type ResolvedDeprecations = Readonly<ResolvedDeprecatedOperations>

export async function fetchExportTemplate(
  packageKey: Key,
  versionKey: Key,
  apiType: ApiType,
  groupName: string,
  authorization: string,
): Promise<[string, string]> {
  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/groups/:groupName/template'
  const response = await requestBlob(
    generatePath(pathPattern, { packageId, versionId, apiType, groupName }),
    {
      headers: { authorization },
      method: 'GET',
    },
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
