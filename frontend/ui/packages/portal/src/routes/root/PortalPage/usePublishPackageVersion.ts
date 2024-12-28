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

import { useMutation } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { PackageVersionBuilder } from './package-version-builder'
import { useShowErrorNotification } from '../BasePage/Notification'
import { useAsyncInvalidatePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'
import type { BuildConfigFile, BuildConfigRef, VersionStatus } from '@netcracker/qubership-apihub-api-processor'
import { useAsyncInvalidateVersionContent } from '../usePackageVersionContent'
import { useNavigation } from '../../NavigationProvider'
import { useAsyncInvalidateVersionSources } from '../useVersionSources'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useAuthorization } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import type { PublishDetails } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import { COMPLETE_PUBLISH_STATUS, ERROR_PUBLISH_STATUS } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import { getAuthorization } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageReference } from '@netcracker/qubership-apihub-ui-shared/entities/version-references'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

export function usePublishPackageVersion(): [PublishPackageVersion, IsLoading, IsSuccess] {
  const { packageId } = useParams()
  const [authorization] = useAuthorization()
  const { navigateToVersion } = useNavigation()

  const invalidateVersionContent = useAsyncInvalidateVersionContent()
  const invalidatePackageVersions = useAsyncInvalidatePackageVersions()
  const invalidateVersionSources = useAsyncInvalidateVersionSources()
  const showErrorNotification = useShowErrorNotification()

  const { mutate, isLoading, isSuccess } = useMutation<PublishDetails, Error, Options>({
    mutationFn: options => {
      return PackageVersionBuilder.publishPackage(
        toPublishOptions(packageId!, options, authorization!.user.key),
        getAuthorization(),
      )
    },
    onSuccess: async ({ status, message }, { version, sources }) => {
      await invalidatePackageVersions()
      await invalidateVersionContent({
        packageKey: packageId!,
        versionKey: version,
      })
      if (sources) {
        await invalidateVersionSources({
          packageKey: packageId!,
          versionKey: version,
        })
      }

      if (status === COMPLETE_PUBLISH_STATUS) {
        navigateToVersion({ packageKey: packageId!, versionKey: version })
      } else if (status === ERROR_PUBLISH_STATUS) {
        showErrorNotification({ message: message! })
      }
    },
    onError: ({ message }) => {
      showErrorNotification({ message: message })
    },
  })

  return [mutate, isLoading, isSuccess]
}

export type PublishOptions = {
  packageId: Key
  version: Key
  previousVersion: Key
  previousVersionPackageId?: Key
  status: VersionStatus
  createdBy: Key
  refs: BuildConfigRef[]
  metadata: {
    versionLabels: string[]
  }
  files?: BuildConfigFile[]
  sources?: File[]
}

function toPublishOptions(
  packageKey: Key,
  { previousVersion, status, version, labels, files, sources, refs }: Options,
  createdBy: Key,
): PublishOptions {
  return {
    packageId: packageKey ?? '',
    version: version,
    previousVersion: getSplittedVersionKey(previousVersion).versionKey,
    status: status as VersionStatus,
    createdBy: createdBy,
    refs: refs.map(toBuildConfigRef),
    metadata: {
      versionLabels: labels ?? [],
    },
    files: files,
    sources: sources,
  }
}

function toBuildConfigRef(reference: PackageReference): BuildConfigRef {
  return {
    refId: reference.key ?? '',
    version: reference.version ?? '',
  }
}

type PublishPackageVersion = (options: Options) => void

type Options = {
  version: string
  status: string
  previousVersion?: string
  refs: PackageReference[]
  labels?: string[]
  files?: BuildConfigFile[]
  sources?: File[]
}
