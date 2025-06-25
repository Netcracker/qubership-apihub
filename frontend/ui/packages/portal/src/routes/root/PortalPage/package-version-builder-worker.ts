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

import type { FileId, FileSourceMap, VersionsComparison } from '@netcracker/qubership-apihub-api-processor'
import { BUILD_TYPE, PackageVersionBuilder, VERSION_STATUS } from '@netcracker/qubership-apihub-api-processor'
import {
  packageVersionResolver,
  versionDeprecatedResolver,
  versionOperationsResolver,
  versionReferencesResolver,
} from '@netcracker/qubership-apihub-ui-shared/utils/builder-resolvers'
import { packToZip } from '@netcracker/qubership-apihub-ui-shared/utils/files'
import type { PublishDetails, PublishStatus } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  NONE_PUBLISH_STATUS,
  RUNNING_PUBLISH_STATUS,
  setPublicationDetails,
  startPackageVersionPublication,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import { WorkerUnauthorizedError } from '@netcracker/qubership-apihub-ui-shared/utils/security'
import { expose, transferHandlers } from 'comlink'
import { v4 as uuidv4 } from 'uuid'
import type { BuilderOptions } from './package-version-builder'
import type { PublishOptions } from './usePublishPackageVersion'

/*
For using worker in proxy mode you need to change common apihub-shared import
to specific directory ('@netcracker/qubership-apihub-ui-shared/utils' for example)
*/

export type Filename = string

function toFileSourceMap(files: File[]): FileSourceMap {
  const fileSources: FileSourceMap = {}
  for (const file of files) {
    fileSources[file.name] = file
  }
  return fileSources
}

export type PackageVersionBuilderWorker = {
  buildChangelogPackage: (options: BuilderOptions) => Promise<[VersionsComparison[], Blob]>
  buildGroupChangelogPackage: (options: BuilderOptions) => Promise<[VersionsComparison[], Blob]>
  publishPackage: (options: PublishOptions) => Promise<PublishDetails>
}

const worker: PackageVersionBuilderWorker = {
  buildChangelogPackage: async ({ packageKey, versionKey, previousPackageKey, previousVersionKey }) => {
    const builderResolvers = {
      fileResolver: async () => null,
      versionResolver: await packageVersionResolver(),
      versionReferencesResolver: await versionReferencesResolver(),
      versionOperationsResolver: await versionOperationsResolver(),
      versionDeprecatedResolver: await versionDeprecatedResolver(),
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
  buildGroupChangelogPackage: async ({ packageKey, versionKey, currentGroup, previousGroup }) => {
    const builderResolvers = {
      fileResolver: async () => null,
      versionResolver: await packageVersionResolver(),
      versionReferencesResolver: await versionReferencesResolver(),
      versionOperationsResolver: await versionOperationsResolver(),
      versionDeprecatedResolver: await versionDeprecatedResolver(),
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
  publishPackage: async (options): Promise<PublishDetails> => {
    const { packageId, sources } = options
    const builderId = uuidv4()
    const sourcesZip = sources && await packToZip(sources)
    const {
      publishId,
      config: buildConfig,
    } = await startPackageVersionPublication(options, builderId, sourcesZip)

    const fileSources = sources && toFileSourceMap(sources)

    const builder = new PackageVersionBuilder(buildConfig, {
      resolvers: {
        fileResolver: async (fileId: FileId) => fileSources?.[fileId] ?? null,
        versionResolver: await packageVersionResolver(),
        versionReferencesResolver: await versionReferencesResolver(),
        versionOperationsResolver: await versionOperationsResolver(),
        versionDeprecatedResolver: await versionDeprecatedResolver(),
      },
    }, fileSources)

    const abortController = new AbortController()
    const intervalId = setInterval(() => {
      setPublicationDetails({
        packageKey: packageId,
        publishKey: publishId,
        status: RUNNING_PUBLISH_STATUS,
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

// Override default handlers for thrown values from worker
// This is necessary to handle custom errors from worker in the calling thread
transferHandlers.set('throw', {
  canHandle: transferHandlers.get('throw')!.canHandle,
  serialize: ({ value }) => {
    let serialized
    if (value instanceof Error) {
      serialized = {
        isError: true,
        value: {
          message: value.message,
          name: value.name,
          stack: value.stack,
          responseStatus: (value as WorkerUnauthorizedError).responseStatus,
        },
      }
    } else {
      serialized = {
        isError: false,
        value: value,
      }
    }
    return [serialized, []]
  },
  deserialize: (serialized: { isError: boolean; value: { message: string; name: string; stack: string; responseStatus: number } }) => {
    if (serialized.isError) {
      throw new WorkerUnauthorizedError()
    }
    throw serialized.value
  },
})

expose(worker)
