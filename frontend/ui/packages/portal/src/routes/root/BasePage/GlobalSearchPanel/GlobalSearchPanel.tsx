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
import { memo } from 'react'
import { Box, Divider, IconButton, Typography } from '@mui/material'
import { SearchFilters } from './SearchFilters'
import { SearchResults } from './SearchResults'
import { GlobalSearchTextProvider } from './GlobalSearchTextProvider'
import { CloseIcon } from '@netcracker/qubership-apihub-ui-shared/icons/CloseIcon'
import { SidePanelDrawer } from '@netcracker/qubership-apihub-ui-shared/components/SidePanelDrawer'
import { GLOBAL_SEARCH_PANEL, useSidePanel } from '../PanelManager/SidePanelManager'

export const GlobalSearchPanel: FC = memo(() => {
  const { open, closePanel } = useSidePanel(GLOBAL_SEARCH_PANEL)

  return (
    <SidePanelDrawer
      open={open}
      onClose={closePanel}
      keepMounted={true}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'row', overflow: 'hidden', height: '100%' }}
           data-testid="GlobalSearchPanel">
        <GlobalSearchTextProvider>
          <Box sx={{ width: '330px' }}>
            <SearchFilters enabledFilters={open}/>
          </Box>
          <Divider sx={{ mt: -2, mb: -2 }} orientation="vertical"/>
          <Box sx={{ pl: 3, width: '500px' }}>
            <Box sx={{ display: 'flex' }}>
              <Typography sx={{ mb: 1, mt: 1 }} variant="h3">Global Search</Typography>
              <IconButton
                aria-label="Close Global Search"
                data-testid="CloseGlobalSearchButton"
                sx={{ ml: 'auto' }}
                onClick={closePanel}
                color="inherit"
              >
                <CloseIcon fontSize="small"/>
              </IconButton>
            </Box>
            <SearchResults/>
          </Box>
        </GlobalSearchTextProvider>
      </Box>
    </SidePanelDrawer>
  )
})

export const CONTENT_WIDTH = '460px'
