import { useComparisonParams } from '@portal/routes/root/PortalPage/VersionPage/useComparisonParams'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import {
  usePreviousReleasePackageKey,
  usePreviousReleaseVersion,
  useSetPreviousReleasePackageKey,
  useSetPreviousReleaseVersion,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/components/PreviousReleaseOptionsProvider'
import type { FC } from 'react'
import { memo, useEffect, useMemo } from 'react'
import { usePackageVersionContent } from '../../../usePackageVersionContent'
import { useCompareVersions } from '../../useCompareVersions'
import { ApiChangesTab } from './ApiChangesTab'

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

  const compareVersionsOptions = useMemo(() => ({
    changedPackageKey: changedPackageKey,
    changedVersionKey: changedVersionKey,
    originVersionKey: previousReleaseVersion,
    originPackageKey: previousReleasePackage,
  }), [changedPackageKey, changedVersionKey, previousReleasePackage, previousReleaseVersion])
  useCompareVersions(compareVersionsOptions)

  return (
    <BodyCard
      body={<ApiChangesTab searchValue={searchValue} />}
    />
  )
})

