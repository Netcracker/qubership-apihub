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

import { expose } from 'comlink'
import type {
  BuildConfig,
  BuildType,
  FileId,
  FileSourceMap,
  OperationsGroupExportFormat,
  VersionsComparisonDto,
  VersionStatus,
} from '@netcracker/qubership-apihub-api-processor'
import { BUILD_TYPE, PackageVersionBuilder, VERSION_STATUS } from '@netcracker/qubership-apihub-api-processor'
import type { BuilderOptions } from './package-version-builder'
import {
  packageVersionResolver,
  templateResolver,
  versionDeprecatedResolver,
  versionDocumentsResolver,
  versionOperationsResolver,
  versionReferencesResolver,
} from '@netcracker/qubership-apihub-ui-shared/utils/builder-resolvers'
import type { PublishOptions } from './usePublishPackageVersion'
import { generatePath } from 'react-router-dom'
import { portalRequestBlob, portalRequestJson } from '@apihub/utils/requests'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import { getPackageRedirectDetails } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { PublishDetails, PublishStatus } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  NONE_PUBLISH_STATUS,
  RUNNING_PUBLISH_STATUS,
  setPublicationDetails,
  startPackageVersionPublication,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { API_V3, NotFoundError } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { packToZip } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

/*
For using worker in proxy mode you need to change common apihub-shared import
to specific directory ('@netcracker/qubership-apihub-ui-shared/utils' for example)
*/

export type Filename = string

async function exportOperations(options: ExportOperationsOptions): Promise<[Blob, Filename]> {
  const {
    packageKey,
    versionKey,
    apiType,
    groupName,
    format,
    buildType,
    authorization,
  } = options

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const name = encodeURIComponent(groupName)

  const searchParams = optionalSearchParams({
    format: { value: format },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/export/groups/:name/buildType/:buildType'
  const response = await portalRequestBlob(
    `${generatePath(pathPattern, { packageId, versionId, apiType, name, buildType })}?${searchParams}`,
    {
      method: 'GET',
      headers: { authorization },
    }, {
    basePath: API_V3,
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  },
  )

  const getFilename = (): string => response.headers
    .get('content-disposition')!
    .split('filename=')[1]
    .split(';')[0]
    .replace(/@\d+\./, '.')

  return [await response.blob(), getFilename()]
}

type TransformDocumentOptions = ExportOperationsOptions & {
  builderId: string
  reCalculate?: boolean
}

async function startDocumentTransformation(options: TransformDocumentOptions): Promise<TransformDocumentResponse> {
  const {
    packageKey,
    versionKey,
    apiType,
    groupName,
    authorization,
    builderId,
    buildType,
    format,
    reCalculate = true,
  } = options

  const packageId = encodeURIComponent(packageKey)
  const versionId = encodeURIComponent(versionKey)
  const name = encodeURIComponent(groupName)

  const searchParams = optionalSearchParams({
    builderId: { value: builderId },
    format: { value: format },
    reCalculate: { value: reCalculate },
    clientBuild: { value: true },
  })

  const pathPattern = '/packages/:packageId/versions/:versionId/:apiType/build/groups/:name/buildType/:buildType'
  return await portalRequestJson<TransformDocumentResponse>(
    `${generatePath(pathPattern, { packageId, versionId, apiType, name, buildType })}?${searchParams}`,
    {
      method: 'POST',
      headers: { authorization },
    }, {
    basePath: API_V3,
    customRedirectHandler: (response) => getPackageRedirectDetails(response, pathPattern),
  },
  )
}

function isDocumentsTransformationCompletedSuccessfully(
  value: TransformDocumentResponse,
): boolean {
  return !value
}

function isDocumentsTransformationRunningOrFailed(
  value: TransformDocumentResponse,
): value is DocumentsTransformationStatusResponse {
  return !!(value as DocumentsTransformationStatusResponse)?.status
}

function isDocumentsTransformationCreatedSuccessfully(
  value: TransformDocumentResponse,
): value is DocumentsTransformationSuccessfulCreationResponse {
  return !!(value as DocumentsTransformationSuccessfulCreationResponse)?.buildId
}

type TransformDocumentResponse =
  null
  | DocumentsTransformationSuccessfulCreationResponse
  | DocumentsTransformationStatusResponse

type DocumentsTransformationSuccessfulCreationResponse = {
  buildId: string
} & Partial<{
  packageId: string
  groupName: string
  version: string
  previousVersion: string
  previousVersionPackageId: string
  status: VersionStatus
  buildType: BuildType
  createdBy: string
  format: OperationsGroupExportFormat
}>

type DocumentsTransformationStatusResponse = {
  status?: Exclude<PublishStatus, 'none' | 'complete'>
  message?: string
}

const RETRY_DOCUMENT_TRANSFORMATION_INTERVAL = 5000
const SET_PUBLICATION_DETAILS_INTERVAL = 15000

async function handleNotFound(transformDocumentOptions: TransformDocumentOptions): Promise<void> {
  const { packageKey, authorization, builderId } = transformDocumentOptions
  const result = await startDocumentTransformation(transformDocumentOptions)

  if (isDocumentsTransformationCompletedSuccessfully(result)) { // handle 200
    return
  }

  if (isDocumentsTransformationRunningOrFailed(result)) { // handle 202
    const { status, message } = result
    if (status === RUNNING_PUBLISH_STATUS) {
      // Wait for 200
      setTimeout(() => handleNotFound(transformDocumentOptions), RETRY_DOCUMENT_TRANSFORMATION_INTERVAL)
      return
    }
    if (status === ERROR_PUBLISH_STATUS) {
      throw new Error(message)
    }
  }

  if (isDocumentsTransformationCreatedSuccessfully(result)) { // handle 201
    const builderResolvers = {
      fileResolver: async () => null,
      versionResolver: await packageVersionResolver(authorization),
      versionReferencesResolver: await versionReferencesResolver(authorization),
      versionOperationsResolver: await versionOperationsResolver(authorization),
      versionDeprecatedResolver: await versionDeprecatedResolver(authorization),
      versionDocumentsResolver: await versionDocumentsResolver(authorization),
      templateResolver: await templateResolver(authorization),
    }
    const builder = new PackageVersionBuilder(
      { ...result as BuildConfig },
      { resolvers: builderResolvers },
    )

    const abortController = new AbortController()
    const intervalId = setInterval(() => {
      setPublicationDetails({
        packageKey: packageKey,
        publishKey: result.buildId,
        status: RUNNING_PUBLISH_STATUS,
        authorization: authorization,
        builderId: builderId,
        abortController: abortController,
      })
    }, SET_PUBLICATION_DETAILS_INTERVAL)

    try {
      await builder.run()
      const data = await builder?.createVersionPackage({ type: 'blob' })
      await setPublicationDetails({
        packageKey: packageKey,
        publishKey: result.buildId,
        status: COMPLETE_PUBLISH_STATUS,
        authorization: authorization,
        builderId: builderId,
        abortController: null,
        data: data,
      })
    } catch (error) {
      await setPublicationDetails({
        packageKey: packageKey,
        publishKey: result.buildId,
        status: ERROR_PUBLISH_STATUS,
        authorization: authorization,
        builderId: builderId,
        abortController: null,
        errors: `${error instanceof Error ? error.message : error}`,
      })
      throw error
    } finally {
      clearInterval(intervalId)
      abortController.abort()
    }
  }
}

function toFileSourceMap(files: File[]): FileSourceMap {
  const fileSources: FileSourceMap = {}
  for (const file of files) {
    fileSources[file.name] = file
  }
  return fileSources
}

type ExportOperationsOptions = {
  packageKey: Key
  versionKey: Key
  groupName: string
  apiType: ApiType
  buildType: BuildType
  format: OperationsGroupExportFormat
  authorization: string
}

export type PackageVersionBuilderWorker = {
  exportOperations: (options: ExportOperationsOptions) => Promise<[Blob, Filename]>
  buildChangelogPackage: (options: BuilderOptions) => Promise<[VersionsComparisonDto[], Blob]>
  buildGroupChangelogPackage: (options: BuilderOptions) => Promise<[VersionsComparisonDto[], Blob]>
  publishPackage: (
    options: PublishOptions,
    authorization: string,
  ) => Promise<PublishDetails>
}

const worker: PackageVersionBuilderWorker = {
  exportOperations: async (options) => {
    try {
      return await exportOperations(options)
    } catch (error) {
      if (error instanceof NotFoundError) {
        const builderId = crypto.randomUUID()
        await handleNotFound({ ...options, builderId })
        return await exportOperations(options)
      }
      throw error
    }
  },
  buildChangelogPackage: async ({ authorization, packageKey, versionKey, previousPackageKey, previousVersionKey }) => {
    const builderResolvers = {
      fileResolver: async () => null,
      versionResolver: await packageVersionResolver(authorization),
      versionReferencesResolver: await versionReferencesResolver(authorization),
      versionOperationsResolver: await versionOperationsResolver(authorization),
      versionDeprecatedResolver: await versionDeprecatedResolver(authorization),
    }
    const builder = new PackageVersionBuilder(
      {
        packageId: packageKey,
        version: versionKey,
        previousVersion: previousVersionKey,
        previousVersionPackageId: previousPackageKey,
        status: VERSION_STATUS.NONE,
        buildType: BUILD_TYPE.CHANGELOG,
      },
      {
        resolvers: builderResolvers,
      },
    )

    await builder.run()

    return [builder.buildResult.comparisons, await builder.createVersionPackage({ type: 'blob' })]
  },
  buildGroupChangelogPackage: async ({ authorization, packageKey, versionKey, currentGroup, previousGroup }) => {
    const builderResolvers = {
      fileResolver: async () => null,
      versionResolver: await packageVersionResolver(authorization),
      versionReferencesResolver: await versionReferencesResolver(authorization),
      versionOperationsResolver: await versionOperationsResolver(authorization),
      versionDeprecatedResolver: await versionDeprecatedResolver(authorization),
    }
    const builder = new PackageVersionBuilder(
      {
        packageId: packageKey,
        version: versionKey,
        currentGroup: currentGroup,
        previousGroup: previousGroup,
        status: 'draft',
        buildType: BUILD_TYPE.PREFIX_GROUPS_CHANGELOG,
      },
      {
        resolvers: builderResolvers,
      },
    )

    await builder.run()

    return [builder.buildResult.comparisons, await builder.createVersionPackage({ type: 'blob' })]
  },
  publishPackage: async (options, authorization): Promise<PublishDetails> => {
    const { packageId, sources } = options
    const builderId = crypto.randomUUID()
    const sourcesZip = sources && await packToZip(sources)
    const {
      publishId,
      config: buildConfig,
    } = await startPackageVersionPublication(options, authorization, builderId, sourcesZip)

    const fileSources = sources && toFileSourceMap(sources)

    const builder = new PackageVersionBuilder(buildConfig, {
      resolvers: {
        fileResolver: async (fileId: FileId) => fileSources?.[fileId] ?? null,
        versionResolver: await packageVersionResolver(authorization),
        versionReferencesResolver: await versionReferencesResolver(authorization),
        versionOperationsResolver: await versionOperationsResolver(authorization),
        versionDeprecatedResolver: await versionDeprecatedResolver(authorization),
      },
    }, fileSources)

    const abortController = new AbortController()
    const intervalId = setInterval(() => {
      setPublicationDetails({
        packageKey: packageId,
        publishKey: publishId,
        status: RUNNING_PUBLISH_STATUS,
        authorization: authorization,
        builderId: builderId,
        abortController: abortController,
      })
    }, 15000)

    const stopSendingRunningStatus = (): void => {
      clearInterval(intervalId)
      abortController.abort()
    }

    await builder.run()

    let publicationStatus: PublishStatus = NONE_PUBLISH_STATUS
    let message = ''

    try {
      const data = await builder?.createVersionPackage({ type: 'blob' })
      stopSendingRunningStatus()

      publicationStatus = COMPLETE_PUBLISH_STATUS
      message = 'Published successfully'
      await setPublicationDetails({
        packageKey: packageId,
        publishKey: publishId,
        status: publicationStatus,
        authorization: authorization,
        builderId: builderId,
        abortController: null,
        data: data,
      })
    } catch (error) {
      stopSendingRunningStatus()

      publicationStatus = ERROR_PUBLISH_STATUS
      message = 'Publication failed'
      await setPublicationDetails({
        packageKey: packageId,
        publishKey: publishId,
        status: publicationStatus,
        authorization: authorization,
        builderId: builderId,
        abortController: null,
        errors: `${error}`,
      })
    }

    return {
      publishId: publishId,
      status: publicationStatus,
      message: message,
    }
  },
}

expose(worker)
