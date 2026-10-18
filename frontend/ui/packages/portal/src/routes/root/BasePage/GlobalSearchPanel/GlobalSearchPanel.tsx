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

import { type FC, memo } from 'react'
import { Box, Divider, IconButton, Typography, styled } from '@mui/material'

import { SidePanelDrawer } from '@netcracker/qubership-apihub-ui-shared/components/SidePanelDrawer'
import { CloseIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CloseIcon'

import { GLOBAL_SEARCH_PANEL, useSidePanel } from '../PanelManager/SidePanelManager'
import { FILTERS_COLUMN_WIDTH, RESULTS_COLUMN_WIDTH } from './globalSearchConstants'
import { GlobalSearchTextProvider } from './GlobalSearchTextProvider'
import { SearchFilters } from './SearchFilters'
import { SearchResults } from './SearchResults'

export const GlobalSearchPanel: FC = memo(() => {
  const { open, closePanel } = useSidePanel(GLOBAL_SEARCH_PANEL)

  return (
    <SidePanelDrawer
      open={open}
      onClose={closePanel}
      keepMounted={true}
    >
      <GlobalSearchPanelRoot data-testid="GlobalSearchPanel">
        <GlobalSearchTextProvider>
          <GlobalSearchFiltersColumn>
            <SearchFilters enabledFilters={open}/>
          </GlobalSearchFiltersColumn>
          <GlobalSearchPanelDivider orientation="vertical"/>
          <GlobalSearchResultsColumn>
            <GlobalSearchTitleRow>
              <GlobalSearchTitle variant="h3">Global Search</GlobalSearchTitle>
              <GlobalSearchCloseButton
                aria-label="Close Global Search"
                data-testid="CloseGlobalSearchButton"
                onClick={closePanel}
                color="inherit"
              >
                <CloseIcon fontSize="small"/>
              </GlobalSearchCloseButton>
            </GlobalSearchTitleRow>
            <SearchResults/>
          </GlobalSearchResultsColumn>
        </GlobalSearchTextProvider>
      </GlobalSearchPanelRoot>
    </SidePanelDrawer>
  )
})

GlobalSearchPanel.displayName = 'GlobalSearchPanel'

const GlobalSearchPanelRoot = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'row',
  overflow: 'hidden',
  height: '100%',
}))

const GlobalSearchFiltersColumn = styled(Box)({
  width: FILTERS_COLUMN_WIDTH,
})

const GlobalSearchPanelDivider = styled(Divider)(({ theme }) => ({
  marginTop: theme.spacing(-2),
  marginBottom: theme.spacing(-2),
}))

const GlobalSearchResultsColumn = styled(Box)(({ theme }) => ({
  paddingLeft: theme.spacing(3),
  width: RESULTS_COLUMN_WIDTH,
}))

const GlobalSearchTitleRow = styled(Box)({
  display: 'flex',
})

const GlobalSearchTitle = styled(Typography)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  marginTop: theme.spacing(1),
}))

const GlobalSearchCloseButton = styled(IconButton)({
  marginLeft: 'auto',
})
