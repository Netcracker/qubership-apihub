import { createContext, type FC, memo, type PropsWithChildren, useMemo } from 'react'
import { useParams } from 'react-router-dom'

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

  const value = useMemo(
    () =>
      buildVersionTabsApiTypesState({
        publishedApiTypes: apiTypes,
        isLoading: isLoading,
        previousVersion: versionContent?.previousVersion,
        linterEnabled: linterEnabled,
        apiQualityTooltip: apiQualityTooltip,
      }),
    [
      apiQualityTooltip,
      apiTypes,
      isLoading,
      linterEnabled,
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
