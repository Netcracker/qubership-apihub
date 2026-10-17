import type { SvgIconProps, TooltipProps } from '@mui/material'
import { type FC, memo, useMemo } from 'react'

import { VersionErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/VersionErrorIndicator'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import type { PackageKey, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageKind } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

import { usePackageVersionContent } from '../../usePackageVersionContent'

export type VersionErrorIndicatorWithFetchProps = TestableProps & {
  packageKey?: PackageKey
  versionKey?: VersionKey
  kind?: PackageKind
  tooltipPlacement?: TooltipProps['placement']
  fontSize?: SvgIconProps['fontSize']
}

export const VersionErrorIndicatorWithFetch: FC<VersionErrorIndicatorWithFetchProps> = memo<
  VersionErrorIndicatorWithFetchProps
>(({
  packageKey,
  versionKey,
  kind,
  tooltipPlacement,
  fontSize,
  'data-testid': dataTestId = 'VersionErrorIndicator',
}) => {
  const { versionContent } = usePackageVersionContent({
    packageKey: packageKey,
    versionKey: versionKey,
    enabled: !!packageKey && !!versionKey,
  })

  const splittedVersionKey = useMemo(
    () => getSplittedVersionKey(versionKey, versionContent?.latestRevision).versionKey,
    [versionContent?.latestRevision, versionKey],
  )

  if (!versionContent) {
    return null
  }

  return (
    <VersionErrorIndicator
      versionKey={splittedVersionKey}
      kind={kind}
      hasErrors={versionContent.hasErrors}
      changelogHasErrors={versionContent.changelogHasErrors}
      apiProcessorVersion={versionContent.apiProcessorVersion}
      tooltipPlacement={tooltipPlacement}
      fontSize={fontSize}
      data-testid={dataTestId}
    />
  )
})

VersionErrorIndicatorWithFetch.displayName = 'VersionErrorIndicatorWithFetch'
