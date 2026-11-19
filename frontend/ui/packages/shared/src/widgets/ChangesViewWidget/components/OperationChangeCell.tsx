import { Box } from '@mui/material'
import type { Row } from '@tanstack/react-table'
import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { ExpandableItem } from '../../../components/ExpandableItem'
import { OperationTitleWithMeta } from '../../../components/Operations/OperationTitleWithMeta'
import type { PackageKind } from '../../../entities/packages'
import { DASHBOARD_KIND } from '../../../entities/packages'
import {
  OPERATION_SEARCH_PARAM,
  optionalSearchParams,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '../../../utils/search-params'
import type { ChangesViewTableData } from '../const/table'
import { usePreviousReleasePackageKey, usePreviousReleaseVersion } from './PreviousReleaseOptionsProvider'

export type OperationChangeCellProps = {
  value: Row<ChangesViewTableData>
  mainPackageKind?: PackageKind
  onLinkClick?: () => void
}

export const OperationChangeCell: FC<OperationChangeCellProps> = memo<OperationChangeCellProps>((
  {
    value: {
      original: { change },
      getCanExpand,
      getIsExpanded,
      getToggleExpandedHandler,
    },
    mainPackageKind,
    onLinkClick,
  }) => {
  const { packageId, versionId, apiType } = useParams()

  const { currentOperation, previousOperation } = change

  const operationKey = currentOperation?.operationKey ?? previousOperation?.operationKey
  const packageRef = currentOperation?.packageRef ?? previousOperation?.packageRef
  const previousPackageRef = previousOperation?.packageRef

  const isDashboard = mainPackageKind === DASHBOARD_KIND

  const previousReleaseVersion = usePreviousReleaseVersion()
  const previousReleasePackageKey = usePreviousReleasePackageKey()

  const searchParams = optionalSearchParams({
    [VERSION_SEARCH_PARAM]: { value: previousReleaseVersion },
    [PACKAGE_SEARCH_PARAM]: { value: packageId !== previousReleasePackageKey ? previousReleasePackageKey : '' },
    [REF_SEARCH_PARAM]: { value: isDashboard ? packageRef?.refId ?? previousPackageRef?.refId : undefined },
    [OPERATION_SEARCH_PARAM]: {
      value: currentOperation?.operationKey ? previousOperation?.operationKey : undefined,
    },
  })

  const link = useMemo(() => ({
    pathname: `/portal/packages/${encodeURIComponent(packageId!)}/${encodeURIComponent(versionId!)}/compare/${apiType}/${encodeURIComponent(operationKey!)}`,
    search: `${searchParams}`,
  }), [apiType, operationKey, packageId, searchParams, versionId])

  const expandable = useMemo(() => getCanExpand(), [getCanExpand])
  const isExpanded = useMemo(() => getIsExpanded(), [getIsExpanded])

  return (
    <Box>
      <ExpandableItem expanded={isExpanded} showToggler={expandable} onToggle={getToggleExpandedHandler()}>
        <OperationTitleWithMeta
          operation={currentOperation ?? previousOperation!}
          link={link}
          onLinkClick={onLinkClick}
        />
      </ExpandableItem>
    </Box>
  )
})

OperationChangeCell.displayName = 'OperationChangeCell'
