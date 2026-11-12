import { Box, styled } from '@mui/material'
import { type FC, memo } from 'react'
import { Marker } from 'react-mark.js'
import type { To } from 'react-router-dom'

import { VersionStatusChip } from '@netcracker/qubership-apihub-ui-shared/components/VersionStatusChip'
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
        {breadCrumbsStatus && <VersionStatusChip status={breadCrumbsStatus} data-testid="VersionStatusChip" />}
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
            {status && <VersionStatusChip status={status} data-testid="VersionStatusChip" />}
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
