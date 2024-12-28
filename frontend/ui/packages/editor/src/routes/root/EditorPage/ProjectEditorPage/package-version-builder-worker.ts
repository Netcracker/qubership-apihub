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
import type { BuildConfig, BuildResult, VersionsComparisonDto } from '@netcracker/qubership-apihub-api-processor'
import { PackageVersionBuilder } from '@netcracker/qubership-apihub-api-processor'

import type { BuilderOptions } from './package-version-builder'
import { safeStringify } from '@stoplight/yaml'
import { VersionDocumentsCachingService } from '@apihub/services/VersionDocumentsCachingService'

import {
  packageVersionResolver,
  versionDeprecatedResolver,
  versionOperationsResolver,
  versionReferencesResolver,
} from '@netcracker/qubership-apihub-ui-shared/utils/builder-resolvers'
import type { FileKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { FileData } from '@apihub/entities/project-files'
import type { PublishDetails, PublishOptions, PublishStatus } from '@apihub/entities/publish-details'
import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  fetchAllFilesBlob,
  NONE_PUBLISH_STATUS,
} from '@apihub/entities/publish-details'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'
import { getFileFormat } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import {
  RUNNING_PUBLISH_STATUS,
  setPublicationDetails,
  startPackageVersionPublication,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import { NONE_CHANGE_TYPE } from '@apihub/entities/branches'
import { fetchFileContent } from '@apihub/utils/resolvers'

/*
For using worker in proxy mode you need to change common apihub-shared import
to specific directory ('@netcracker/qubership-apihub-ui-shared/utils' for example)
*/
export type PackageVersionBuilderWorker = {
  init: (options: BuilderOptions) => Promise<void>
  getBranchCache: () => Promise<BranchCache>
  checkBwc: (options: BuilderOptions) => Promise<VersionsComparisonDto[]>
  dereference: (
    fileKey: FileKey,
    options: BuilderOptions,
  ) => Promise<FileData>
  updateCache: (
    options: BuilderOptions,
    fileKey?: FileKey,
  ) => Promise<BranchCache>
  publishPackage: (
    options: PublishOptions,
    authorization: string,
  ) => Promise<PublishDetails>
}

type BranchCache = Record<FileKey, FileData | undefined>

const BUILDER_WORKER_CACHING_SERVICE_TAG = 'builder-worker'

let builder: PackageVersionBuilder | undefined

function getBuilderCache(): Promise<BranchCache> {
  const branchCache: BranchCache = {}
  if (!builder) {
    return Promise.reject('No builder initialized')
  }

  builder.buildResult.documents
    .forEach(({ fileId }) => {
      branchCache[fileId] = getFileDataFromCache(fileId)
    })

  return Promise.resolve(branchCache)
}

function getFileDataFromCache(fileKey: string): FileData {
  const cachingService =
    VersionDocumentsCachingService.getInstance(BUILDER_WORKER_CACHING_SERVICE_TAG)

  const updatedDocument = builder!.buildResult.documents.get(fileKey)!
  const {
    fileId, type, title, data, dependencies,
  } = cachingService.eitherThisOrCache(updatedDocument)

  const fileSource = builder?.parsedFiles.get(fileId)?.source
  const content = data && isNotEmpty(Object.keys(data)) ? safeStringify(data) : data

  return {
    content: content,
    type: type as SpecType,
    title: title,
    format: getFileFormat(fileId),
    refFileKeys: dependencies,
    source: fileSource,
  }
}

const worker: PackageVersionBuilderWorker = {
  init: async (options: BuilderOptions): Promise<void> => {
    await initializeBuilder(options)
  },
  getBranchCache: (): Promise<BranchCache> => {
    return getBuilderCache()
  },
  checkBwc: async (options: BuilderOptions): Promise<VersionsComparisonDto[]> => {
    if (!builder) {
      await initializeBuilder(options)
    } else {
      await builder.update(
        toPackageVersionBuilderConfig(options),
        [],
      )
    }

    return builder!.comparisons.filter(
      comparison => comparison.operationTypes.some(({ changesSummary }) => changesSummary && changesSummary.breaking > 0),
    )
  },
  dereference: async (fileKey, options): Promise<FileData> => {
    if (!builder) {
      await initializeBuilder(options)
    } else if (fileKey) {
      await builder.update(
        builder.config,
        [fileKey],
        {
          withoutChangelog: true,
          withoutDeprecatedDepth: true,
        },
      )
    }

    return getFileDataFromCache(fileKey)
  },
  updateCache: async (options, fileKey): Promise<BranchCache> => {
    if (!builder) {
      await initializeBuilder(options)
    } else if (fileKey) {
      await builder.update(
        toPackageVersionBuilderConfig(options),
        [fileKey],
        {
          withoutChangelog: true,
          withoutDeprecatedDepth: true,
        },
      )
    }

    if (!fileKey) {
      return await getBuilderCache()
    }

    const updatedFileBranchCache: BranchCache = {}
    updatedFileBranchCache[fileKey] = getFileDataFromCache(fileKey)
    return updatedFileBranchCache
  },
  publishPackage: async (options, authorization): Promise<PublishDetails> => {
    const { packageId: packageKey } = options
    const builderId = crypto.randomUUID()
    const sources = await fetchAllFilesBlob(options.projectId, options.metadata.branchName, authorization)
    const {
      publishId,
      config: buildConfig,
    } = await startPackageVersionPublication(options, authorization, builderId, sources)

    const abortController = new AbortController()
    const intervalId = setInterval(() => {
      setPublicationDetails({
        packageKey: packageKey,
        publishKey: publishId,
        status: RUNNING_PUBLISH_STATUS,
        authorization: authorization,
        builderId: builderId,
        abortController: abortController,
      })
    }, 15000)

    await builder!.update(buildConfig)

    let publicationStatus: PublishStatus = NONE_PUBLISH_STATUS
    let message = ''

    try {
      const data = await builder?.createVersionPackage({ type: 'blob' })
      publicationStatus = COMPLETE_PUBLISH_STATUS
      message = 'Published successfully'
      await setPublicationDetails({
        packageKey: packageKey,
        publishKey: publishId,
        status: publicationStatus,
        authorization: authorization,
        builderId: builderId,
        abortController: null,
        data: data,
      })
    } catch (error) {
      publicationStatus = ERROR_PUBLISH_STATUS
      message = 'Publication failed'
      await setPublicationDetails({
        packageKey: packageKey,
        publishKey: publishId,
        status: publicationStatus,
        authorization: authorization,
        builderId: builderId,
        abortController: null,
        errors: `${error}`,
      })
    } finally {
      clearInterval(intervalId)
      abortController.abort()
    }

    return {
      publishId: publishId,
      status: publicationStatus,
      message: message,
    }
  },
}

async function initializeBuilder(options: BuilderOptions): Promise<BuildResult> {
  const { packageKey, authorization, branchName } = options
  const { files, sources: fileSources } = options

  if (files && fileSources) {
    for (const file of files) {
      if (file.changeType !== NONE_CHANGE_TYPE) {
        delete fileSources[file.key]
      }
    }
  }

  builder = new PackageVersionBuilder(toPackageVersionBuilderConfig(options), {
    configuration: {
      bundleComponents: true,
    },
    resolvers: {
      fileResolver: async (fileId) =>
        await fetchFileContent(
          packageKey,
          branchName!,
          fileId,
          authorization,
        ),
      versionResolver: await packageVersionResolver(authorization),
      versionReferencesResolver: await versionReferencesResolver(authorization),
      versionOperationsResolver: await versionOperationsResolver(authorization),
      versionDeprecatedResolver: await versionDeprecatedResolver(authorization),
    },
  }, fileSources)

  return await builder.run({
    withoutDeprecatedDepth: true,
  })
}

function toPackageVersionBuilderConfig(
  {
    files,
    packageKey,
    previousPackageKey,
    previousVersionKey,
    versionKey,
  }: BuilderOptions): BuildConfig {
  return {
    packageId: packageKey,
    version: versionKey,
    status: 'draft',
    previousVersion: previousVersionKey,
    previousVersionPackageId: previousPackageKey,
    files: files?.map(({ key, blobKey, labels, publish }) => ({
      fileId: key,
      publish: publish,
      blobId: blobKey,
      labels: labels,
    })) ?? [],
  }
}

expose(worker)
