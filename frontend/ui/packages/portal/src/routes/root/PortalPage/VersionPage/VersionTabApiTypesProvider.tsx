import { createContext, type FC, memo, type PropsWithChildren, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

import { usePackageVersionContent } from '@portal/routes/root/usePackageVersionContent'
import { useApiQualityLinterEnabled, useApiQualityTabTooltip } from './ApiQualityValidationSummaryProvider'
import { usePackageVersionApiTypes } from './usePackageVersionApiTypes'
import {
  buildVersionTabsApiTypesState,
  type VersionTabsApiTypesState,
} from './VersionTabApiTypes/buildVersionTabsApiTypesState'

export const VersionTabApiTypesContext = createContext<VersionTabsApiTypesState | undefined>(undefined)

export const VersionTabApiTypesProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const { packageId, versionId } = useParams()
  const { apiTypes, isLoading } = usePackageVersionApiTypes(packageId!, versionId!)
  const { versionContent } = usePackageVersionContent({
    packageKey: packageId,
    versionKey: versionId,
    includeSummary: true,
  })
  const linterEnabled = useApiQualityLinterEnabled()
  const apiQualityTooltip = useApiQualityTabTooltip()

  const versionKey = useMemo(() => {
    if (!versionId || !versionContent) {
      return undefined
    }
    return getSplittedVersionKey(versionId, versionContent.latestRevision).versionKey
  }, [versionContent, versionId])

  const value = useMemo(
    () =>
      buildVersionTabsApiTypesState({
        publishedApiTypes: apiTypes,
        isLoading: isLoading,
        previousVersion: versionContent?.previousVersion,
        versionKey: versionKey,
        linterEnabled: linterEnabled,
        apiQualityTooltip: apiQualityTooltip,
        operationTypes: versionContent?.operationTypes,
        contractsSummary: versionContent?.contractsSummary,
        hasErrors: versionContent?.hasErrors,
      }),
    [
      apiQualityTooltip,
      apiTypes,
      isLoading,
      linterEnabled,
      versionKey,
      versionContent?.contractsSummary,
      versionContent?.hasErrors,
      versionContent?.operationTypes,
      versionContent?.previousVersion,
    ],
  )

  return (
    <VersionTabApiTypesContext.Provider value={value}>
      {children}
    </VersionTabApiTypesContext.Provider>
  )
})

VersionTabApiTypesProvider.displayName = 'VersionTabApiTypesProvider'
