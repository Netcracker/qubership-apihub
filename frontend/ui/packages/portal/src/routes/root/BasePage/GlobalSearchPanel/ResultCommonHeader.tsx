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

import { Box, styled } from '@mui/material'
import { type FC, memo } from 'react'
import { Marker } from 'react-mark.js'
import type { To } from 'react-router-dom'

import { CustomChip } from '@netcracker/qubership-apihub-ui-shared/components/CustomChip'
import { SpecLogo } from '@netcracker/qubership-apihub-ui-shared/components/SpecLogo'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { SpecType } from '@netcracker/qubership-apihub-ui-shared/utils/specs'

import { GLOBAL_SEARCH_PANEL, useSidePanel } from '../PanelManager/SidePanelManager'
import { RESULT_TITLE_WIDTH } from './globalSearchConstants'
import {
  SearchResultBreadcrumbs,
  SearchResultPrimaryTitle,
  SearchResultRowSection,
} from './SearchResultRowLayout'

type ResultCommonHeaderProps = {
  url: To
  title: string
  parents: string[]
  icon?: SpecType | ApiType
  status?: VersionStatus
  breadCrumbsStatus?: VersionStatus
  searchText: string
}

export const ResultCommonHeader: FC<ResultCommonHeaderProps> = memo<ResultCommonHeaderProps>((
  {
    url,
    title,
    parents,
    icon,
    status,
    breadCrumbsStatus,
    searchText,
  },
) => {
  const { closePanel } = useSidePanel(GLOBAL_SEARCH_PANEL)
  const breadcrumbs = parents.join(' / ')

  return (
    <Box width="inherit">
      <SearchResultRowSection>
        <SearchResultBreadcrumbs breadcrumbs={breadcrumbs} />
        {breadCrumbsStatus && <CustomChip value={breadCrumbsStatus} data-testid="VersionStatusChip" />}
      </SearchResultRowSection>

      <Marker mark={searchText}>
        <SearchResultTitleRow>
          {icon && <SpecLogo value={icon} />}
          <SearchResultTitleContent>
            <SearchResultPrimaryTitle
              url={url}
              title={title}
              onLinkClick={closePanel}
            />
            {status && <CustomChip value={status} data-testid="VersionStatusChip" />}
          </SearchResultTitleContent>
        </SearchResultTitleRow>
      </Marker>
    </Box>
  )
})

ResultCommonHeader.displayName = 'ResultCommonHeader'

const SearchResultTitleRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
}))

const SearchResultTitleContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  width: RESULT_TITLE_WIDTH,
}))
