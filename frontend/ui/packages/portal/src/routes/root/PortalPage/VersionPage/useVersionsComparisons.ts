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
import type { Key, VersionKey } from '@apihub/entities/keys'
import { useParams } from 'react-router-dom'
import type { BuildType, VersionsComparisonDto } from '@netcracker/qubership-apihub-api-processor'
import { PackageVersionBuilder } from '../package-version-builder'
import { useVersionWithRevision } from '../../useVersionWithRevision'
import { useState } from 'react'
import { useShowErrorNotification } from '../../BasePage/Notification'
import { portalRequestJson } from '@apihub/utils/requests'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import type { PublishStatus } from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import {
  COMPLETE_PUBLISH_STATUS,
  ERROR_PUBLISH_STATUS,
  NONE_PUBLISH_STATUS,
  RUNNING_PUBLISH_STATUS,
  setPublicationDetails,
} from '@netcracker/qubership-apihub-ui-shared/utils/packages-builder'
import { getAuthorization } from '@netcracker/qubership-apihub-ui-shared/utils/storages'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

const VERSION_CHANGES_QUERY_KEY = 'version-changes-query-key'

export function useVersionsComparisons(options?: {
  hasCache: boolean
  changedPackageKey?: Key
  changedVersionKey?: VersionKey
  originPackageKey?: Key
  originVersionKey?: VersionKey
}): [VersionsComparisonDto[] | undefined, IsLoading, IsSuccess] {
  const { packageId: packageKey, versionId: versionKey } = useParams()
  const builderId = crypto.randomUUID()
  const showErrorNotification = useShowErrorNotification()

  const [recalculateChangelog, setRecalculateChangelog] = useState(false)

  const NO_VERSION_TO_COMPARE = ''

  const changedPackageKey = options?.changedPackageKey ?? packageKey ?? NO_VERSION_TO_COMPARE
  const changedVersionKey = options?.changedVersionKey ?? versionKey ?? NO_VERSION_TO_COMPARE
  const { fullVersion: changedVersion = changedVersionKey } = useVersionWithRevision(changedVersionKey, changedPackageKey)

  const originPackageKey = options?.originPackageKey ?? changedPackageKey
  const originVersionKey = options?.originVersionKey ?? NO_VERSION_TO_COMPARE
  const { fullVersion: originVersion = originVersionKey } = useVersionWithRevision(originVersionKey, originPackageKey)

  const allComparisonParamsProvided = changedPackageKey !== NO_VERSION_TO_COMPARE &&
    changedVersionKey !== NO_VERSION_TO_COMPARE &&
    originPackageKey !== NO_VERSION_TO_COMPARE &&
    originVersionKey !== NO_VERSION_TO_COMPARE

  const { data, isLoading, isSuccess, refetch } = useQuery<VersionsComparisonDto[] | undefined, Error>({
    queryKey: [VERSION_CHANGES_QUERY_KEY, originPackageKey!, originVersion, changedPackageKey, changedVersion],
    enabled: !options?.hasCache && allComparisonParamsProvided && !!changedVersion && !!originVersion,
    retry: false,
    queryFn: async () => {
      const comparisonBuild = await getVersionChangelogOrBuildResponse({
        builderId: builderId,
        version: changedVersion!,
        packageId: changedPackageKey,
        previousVersion: originVersion!,
        previousVersionPackageId: originPackageKey,
        reCalculate: recalculateChangelog,
      })

      if (isChangelogBuildRunningOrFailed(comparisonBuild)) {
        const { status, message } = comparisonBuild
        if (status === RUNNING_PUBLISH_STATUS) {
          // Wait for 200
          setTimeout(() => refetch(), 5000)
        }
        if (status === ERROR_PUBLISH_STATUS) {
          // Show error notification
          showErrorNotification({ message: message || 'Previous comparison was erroneous. Rebuilding', title: 'Error' })
          setRecalculateChangelog(true)
        }
      }

      if (isChangelogBuildCreatedSuccessfully(comparisonBuild)) {
        const abortController = new AbortController()
        const intervalId = setInterval(() => {
          setPublicationDetails({
            packageKey: changedPackageKey,
            publishKey: comparisonBuild.buildId,
            status: RUNNING_PUBLISH_STATUS,
            authorization: getAuthorization(),
            builderId: builderId,
            abortController: abortController,
          })
        }, 15000)

        let publicationStatus: PublishStatus = NONE_PUBLISH_STATUS
        const builtVersionComparisons: VersionsComparisonDto[] = []

        try {
          const [versionsComparisons, data] = await PackageVersionBuilder.buildChangelogPackage({
            packageKey: changedPackageKey!, //from path param
            versionKey: changedVersion!,
            previousPackageKey: originPackageKey!, //from search param
            previousVersionKey: originVersion!,
            authorization: getAuthorization(),
          })

          builtVersionComparisons.push(...versionsComparisons)

          publicationStatus = COMPLETE_PUBLISH_STATUS
          await setPublicationDetails({
            packageKey: changedPackageKey,
            publishKey: comparisonBuild.buildId,
            status: publicationStatus,
            authorization: getAuthorization(),
            builderId: builderId,
            abortController: null,
            data: data,
          })
          setRecalculateChangelog(false)
        } catch (error) {
          publicationStatus = ERROR_PUBLISH_STATUS
          await setPublicationDetails({
            packageKey: changedPackageKey,
            publishKey: comparisonBuild.buildId,
            status: publicationStatus,
            authorization: getAuthorization(),
            builderId: builderId,
            abortController: null,
            errors: `${error}`,
          })
        } finally {
          clearInterval(intervalId)
          abortController.abort()
        }

        return builtVersionComparisons
      }

      return []
    },
  })

  return [data, isLoading, isSuccess]
}

type GetVersionChangelogOrBuildResponseOptions = {
  builderId: string
  version: string
  packageId: string
  previousVersion: string
  previousVersionPackageId?: string
  reCalculate?: boolean
}

async function getVersionChangelogOrBuildResponse(options: GetVersionChangelogOrBuildResponseOptions): Promise<CompareViaBuilderResponse> {
  const {
    builderId,
    version,
    packageId,
    previousVersion,
    previousVersionPackageId,
    reCalculate = false,
  } = options

  const searchParams = optionalSearchParams({
    builderId: { value: builderId },
    clientBuild: { value: true },
    reCalculate: { value: reCalculate },
  })
  return await portalRequestJson<CompareViaBuilderResponse>(
    `/compare?${searchParams}`,
    {
      method: 'POST',
      body: JSON.stringify({
        packageId,
        version,
        previousVersion,
        previousVersionPackageId,
      }),
    },
  )
}

export function isChangelogBuildCreatedSuccessfully(
  value: CompareViaBuilderResponse,
): value is ChangelogBuildSuccessfulCreationResponse {
  return !!(value as unknown as ChangelogBuildSuccessfulCreationResponse)?.buildId
}

export function isChangelogBuildRunningOrFailed(
  value: CompareViaBuilderResponse,
): value is ChangelogBuildStatusResponse {
  return !!(value as unknown as ChangelogBuildStatusResponse)?.status
}

export type CompareViaBuilderResponse = null | ChangelogBuildSuccessfulCreationResponse | ChangelogBuildStatusResponse

export type ChangelogBuildSuccessfulCreationResponse = {
  buildId: string
} & Partial<{
  packageId: string
  version: string
  previousVersion: string
  previousVersionPackageId: string
  buildType: BuildType
  createdBy: string
}>

export type ChangelogBuildStatusResponse = {
  status?: Exclude<PublishStatus, 'none' | 'complete'>
  message?: string
}
