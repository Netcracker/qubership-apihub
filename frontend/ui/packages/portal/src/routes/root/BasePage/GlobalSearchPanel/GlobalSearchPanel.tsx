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
import { memo, useState } from 'react'
import { Box, Drawer } from '@mui/material'
import { useEvent } from 'react-use'
import { SearchFilters } from './SearchFilters'
import { SearchResults } from './SearchResults'
import { GlobalSearchTextProvider } from './GlobalSearchTextProvider'
import { HIDE_GLOBAL_SEARCH_PANEL, SHOW_GLOBAL_SEARCH_PANEL } from '@apihub/routes/EventBusProvider'

export const GlobalSearchPanel: FC = memo(() => {
  const [open, setOpen] = useState(false)

  useEvent(SHOW_GLOBAL_SEARCH_PANEL, (): void => {
    setOpen(true)
  })

  // TODO: Add close listener
  useEvent(HIDE_GLOBAL_SEARCH_PANEL, (): void => {
    setOpen(false)
  })

  return (
    <Drawer
      variant="temporary"
      ModalProps={{
        keepMounted: true,
      }}
      anchor="right"
      open={open}
      onClose={() => setOpen(false)}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'row', overflow: 'hidden', height: '100%' }}
           data-testid="GlobalSearchPanel">
        <GlobalSearchTextProvider>
          <Box sx={{ p: 2, width: '330px' }}>
            <SearchFilters enabledFilters={open}/>
          </Box>
          <Box sx={{ pl: 1, width: '500px' }}>
            <SearchResults/>
          </Box>
        </GlobalSearchTextProvider>
      </Box>
    </Drawer>
  )
})

export const CONTENT_WIDTH = '460px'
