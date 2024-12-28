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

import type { FC } from 'react'
import { memo, useEffect } from 'react'
import { ApiChangesTab } from './ApiChangesTab'
import { usePackageVersionContent } from '../../../usePackageVersionContent'
import { useCompareVersions } from '../../useCompareVersions'
import {
  usePreviousReleasePackageKey,
  usePreviousReleaseVersion,
  useSetPreviousReleasePackageKey,
  useSetPreviousReleaseVersion,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/components/PreviousReleaseOptionsProvider'
import { useComparisonParams } from '@apihub/routes/root/PortalPage/VersionPage/useComparisonParams'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'

export type ApiChangesCardProps = {
  searchValue: string
}
export const ApiChangesCard: FC<ApiChangesCardProps> = memo<ApiChangesCardProps>(({ searchValue }) => {
  const previousReleaseVersion = usePreviousReleaseVersion()
  const setPreviousReleaseVersion = useSetPreviousReleaseVersion()

  const previousReleasePackage = usePreviousReleasePackageKey()
  const setPreviousReleasePackage = useSetPreviousReleasePackageKey()

  const { changedPackageKey, changedVersionKey } = useComparisonParams()

  const { versionContent, isLoading, error } = usePackageVersionContent({
    packageKey: changedPackageKey,
    versionKey: changedVersionKey,
  })
  const { previousVersion, previousVersionPackageId = changedPackageKey } = versionContent ?? {}

  useEffect(() => {
    if (versionContent && !isLoading && !error) {
      setPreviousReleaseVersion(previousVersion)
      setPreviousReleasePackage(previousVersionPackageId)
    }
  }, [error, isLoading, previousVersion, previousVersionPackageId, setPreviousReleasePackage, setPreviousReleaseVersion, versionContent])

  useCompareVersions({
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originVersionKey: previousReleaseVersion,
    originPackageKey: previousReleasePackage,
  })

  return (
    <BodyCard
      body={<ApiChangesTab searchValue={searchValue}/>}
    />
  )
})

