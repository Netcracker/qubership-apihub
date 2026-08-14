import { Box } from '@mui/material'
import type { Row } from '@tanstack/react-table'
import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { DdlTableTitleWithMeta } from '../../../components/Ddl/DdlTableTitleWithMeta'
import { ExpandableItem } from '../../../components/ExpandableItem'
import { getDdlChangeEntityId } from '../../../entities/contracts-ddl-changelog'
import type { PackageKind } from '../../../entities/packages'
import { DASHBOARD_KIND } from '../../../entities/packages'
import {
  optionalSearchParams,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '../../../utils/search-params'
import type { DdlChangesViewTableData } from '../const/ddlTable'
import { usePreviousReleasePackageKey, usePreviousReleaseVersion } from './PreviousReleaseOptionsProvider'

export type DdlEntityChangeCellProps = {
  value: Row<DdlChangesViewTableData>
  mainPackageKind?: PackageKind
  onLinkClick?: () => void
}

export const DdlEntityChangeCell: FC<DdlEntityChangeCellProps> = memo<DdlEntityChangeCellProps>(({
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

  const { ddlEntityData, previousDdlEntityData } = change
  const table = ddlEntityData ?? previousDdlEntityData!
  const ddlEntityId = getDdlChangeEntityId(change)
  const packageRef = ddlEntityData?.packageRef ?? previousDdlEntityData?.packageRef
  const previousPackageRef = previousDdlEntityData?.packageRef
  const isDashboard = mainPackageKind === DASHBOARD_KIND

  const previousReleaseVersion = usePreviousReleaseVersion()
  const previousReleasePackageKey = usePreviousReleasePackageKey()

  const searchParams = optionalSearchParams({
    [VERSION_SEARCH_PARAM]: { value: previousReleaseVersion },
    [PACKAGE_SEARCH_PARAM]: {
      value: packageId !== previousReleasePackageKey ? previousReleasePackageKey : '',
    },
    [REF_SEARCH_PARAM]: {
      value: isDashboard ? packageRef?.refId ?? previousPackageRef?.refId : undefined,
    },
  })

  const link = useMemo(() => ({
    pathname: `/portal/packages/${packageId}/${versionId}/compare/${apiType}/${ddlEntityId}`,
    search: `${searchParams}`,
  }), [apiType, ddlEntityId, packageId, searchParams, versionId])

  const expandable = useMemo(() => getCanExpand(), [getCanExpand])
  const isExpanded = useMemo(() => getIsExpanded(), [getIsExpanded])

  return (
    <Box>
      <ExpandableItem expanded={isExpanded} showToggler={expandable} onToggle={getToggleExpandedHandler()}>
        <DdlTableTitleWithMeta
          table={table}
          link={link}
          onLinkClick={onLinkClick}
        />
      </ExpandableItem>
    </Box>
  )
})

DdlEntityChangeCell.displayName = 'DdlEntityChangeCell'
