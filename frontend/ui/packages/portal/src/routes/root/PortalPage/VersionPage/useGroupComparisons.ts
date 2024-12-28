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
import type { VersionsComparisonDto } from '@netcracker/qubership-apihub-api-processor'
import { PackageVersionBuilder } from '../package-version-builder'
import { usePackage } from '../../usePackage'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { getAuthorization } from '@netcracker/qubership-apihub-ui-shared/utils/storages'

const GROUPS_CHANGES_QUERY_KEY = 'groups-changes-query-key'

export function useGroupComparisons(options?: {
  packageKey?: Key
  versionKey?: VersionKey
  currentGroup?: Key
  previousGroup?: Key
}): [VersionsComparisonDto[] | undefined, IsLoading] {
  const [packageObj] = usePackage()
  const restGroupingPrefix = packageObj?.restGroupingPrefix

  const NO_GROUP_TO_COMPARE = ''

  const currentGroup = getFullPrefixGroup(restGroupingPrefix, options?.currentGroup ?? '') ?? NO_GROUP_TO_COMPARE
  const previousGroup = getFullPrefixGroup(restGroupingPrefix, options?.previousGroup ?? '') ?? NO_GROUP_TO_COMPARE

  const packageKey = options?.packageKey ?? NO_GROUP_TO_COMPARE
  const versionKey = options?.versionKey ?? NO_GROUP_TO_COMPARE

  const allComparisonParamsProvided = packageKey !== NO_GROUP_TO_COMPARE && versionKey !== NO_GROUP_TO_COMPARE

  const { data, isLoading } = useQuery<VersionsComparisonDto[] | undefined, Error>({
    queryKey: [GROUPS_CHANGES_QUERY_KEY, packageKey!, versionKey, currentGroup, previousGroup],
    enabled: allComparisonParamsProvided && !!restGroupingPrefix,
    retry: false,
    queryFn: async () => {
      const [groupsComparisons] = await PackageVersionBuilder.buildGroupChangelogPackage({
        packageKey: packageKey!,
        versionKey: versionKey!,
        currentGroup: currentGroup!,
        previousGroup: previousGroup!,
        authorization: getAuthorization(),
      })

      return groupsComparisons
    },
  })

  return [data, isLoading]
}

export const getFullPrefixGroup = (restGroupingPrefix: string | undefined, group: string): string => {
  return restGroupingPrefix ? restGroupingPrefix.replace(/{group}/g, group) : group
}

