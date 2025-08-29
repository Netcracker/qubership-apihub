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

import type { AgentKey, NamespaceKey, WorkspaceKey } from '@apihub/entities/keys'
import type { ServiceConfig } from '@apihub/entities/publish-config'
import type { PublishDetails } from '@apihub/entities/publish-details'
import { setPublicationDetails } from '@apihub/entities/publish-details'
import type { PublishStatus } from '@apihub/entities/statuses'
import { COMPLETE_PUBLISH_STATUS, ERROR_PUBLISH_STATUS } from '@apihub/entities/statuses'
import { BUILD_TYPE, PackageVersionBuilder } from '@netcracker/qubership-apihub-api-processor'
import {
  packageVersionResolver,
  versionDeprecatedResolver,
  versionOperationsResolver,
  versionReferencesResolver,
} from '@netcracker/qubership-apihub-ui-shared/utils/builder-resolvers'
import { NONE_PUBLISH_STATUS, RUNNING_PUBLISH_STATUS } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import { expose } from 'comlink'
import { getSpecBlob } from '../../useSpecRaw'

/*
For using worker in proxy mode you need to change common apihub-shared import
to specific directory ('@netcracker/qubership-apihub-ui-shared/utils' for example)
*/
export type PublishServiceOptions = {
  agentId: AgentKey
  namespaceKey: NamespaceKey
  workspaceKey: WorkspaceKey
  serviceConfig: ServiceConfig
  builderId?: string
}

export type PackageVersionBuilderWorker = {
  publishService: (options: PublishServiceOptions) => Promise<PublishDetails>
}

const worker: PackageVersionBuilderWorker = {
  publishService: async ({ agentId, namespaceKey, workspaceKey, serviceConfig, builderId }) => {
    const abortController = new AbortController()
    const intervalId = setInterval(() => {
      setPublicationDetails({
        packageKey: serviceConfig.packageId,
        publishKey: serviceConfig.publishId,
        status: RUNNING_PUBLISH_STATUS,
        abortController: abortController,
        builderId: builderId,
      })
    }, 15000)

    const stopSendingRunningStatus = (): void => {
      abortController.abort()
      clearInterval(intervalId)
    }

    const builder = new PackageVersionBuilder(
      {
        ...serviceConfig,
        buildType: BUILD_TYPE.BUILD,
      },
      {
        resolvers: {
          fileResolver: fileId => getSpecBlob(agentId, namespaceKey, workspaceKey, serviceConfig.serviceId, fileId),
          versionResolver: await packageVersionResolver(),
          versionReferencesResolver: await versionReferencesResolver(),
          versionOperationsResolver: await versionOperationsResolver(),
          versionDeprecatedResolver: await versionDeprecatedResolver(),
        },
      })

    let status: PublishStatus = NONE_PUBLISH_STATUS
    let message

    try {
      await builder.run()
      const data = await builder.createVersionPackage({ type: 'blob' })
      stopSendingRunningStatus()

      status = COMPLETE_PUBLISH_STATUS
      await setPublicationDetails({
        packageKey: serviceConfig.packageId,
        publishKey: serviceConfig.publishId,
        status: status,
        abortController: null,
        builderId: builderId,
        data: data,
      })
    } catch (error) {
      stopSendingRunningStatus()

      status = ERROR_PUBLISH_STATUS
      message = error instanceof Error ? error.message : `${error}`
      await setPublicationDetails({
        packageKey: serviceConfig.packageId,
        publishKey: serviceConfig.publishId,
        status: status,
        abortController: null,
        builderId: builderId,
        errors: `${error}`,
      })
    }

    return {
      publishId: serviceConfig.publishId,
      status: status,
      message: message,
    }
  },
}

expose(worker)
