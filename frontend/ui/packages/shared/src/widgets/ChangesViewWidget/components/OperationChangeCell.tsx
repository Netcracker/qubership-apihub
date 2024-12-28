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
import { memo, useMemo } from 'react'
import { Box } from '@mui/material'
import type { Row } from '@tanstack/react-table'
import { useParams } from 'react-router-dom'
import type { ChangesViewTableData } from '../const/table'
import { usePreviousReleasePackageKey, usePreviousReleaseVersion } from './PreviousReleaseOptionsProvider'
import type { PackageKind } from '../../../entities/packages'
import { DASHBOARD_KIND } from '../../../entities/packages'
import {
  optionalSearchParams,
  PACKAGE_SEARCH_PARAM,
  REF_SEARCH_PARAM,
  VERSION_SEARCH_PARAM,
} from '../../../utils/search-params'
import { ExpandableItem } from '../../../components/ExpandableItem'
import { OperationTitleWithMeta } from '../../../components/Operations/OperationTitleWithMeta'

export type OperationChangeCellProps = {
  value: Row<ChangesViewTableData>
  mainPackageKind?: PackageKind
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
  }) => {
  const { packageId, versionId, apiType } = useParams()
  const { operationKey, packageRef, previousPackageRef } = change

  const isDashboard = mainPackageKind === DASHBOARD_KIND

  const previousReleaseVersion = usePreviousReleaseVersion()
  const previousReleasePackageKey = usePreviousReleasePackageKey()

  const searchParams = optionalSearchParams({
    [VERSION_SEARCH_PARAM]: { value: previousReleaseVersion },
    [PACKAGE_SEARCH_PARAM]: { value: packageId !== previousReleasePackageKey ? previousReleasePackageKey : '' },
    [REF_SEARCH_PARAM]: { value: isDashboard ? packageRef?.refId ?? previousPackageRef?.refId : undefined },
  })

  const link = useMemo(() => ({
    pathname: `/portal/packages/${packageId}/${versionId}/compare/${apiType}/${operationKey}`,
    search: `${searchParams}`,
  }), [apiType, operationKey, packageId, searchParams, versionId])

  const expandable = useMemo(() => getCanExpand(), [getCanExpand])
  const isExpanded = useMemo(() => getIsExpanded(), [getIsExpanded])

  return (
    <Box>
      <ExpandableItem expanded={isExpanded} showToggler={expandable} onToggle={getToggleExpandedHandler()}>
        <OperationTitleWithMeta
          operation={change}
          link={link}
        />
      </ExpandableItem>
    </Box>
  )
})
