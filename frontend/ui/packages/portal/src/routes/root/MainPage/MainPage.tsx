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
import { memo, useEffect } from 'react'
import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { DEFAULT_PAPER_SHADOW } from '@netcracker/qubership-apihub-ui-shared/themes/palette'
import { DEFAULT_PAGE_LAYOUT_GAP } from '@netcracker/qubership-apihub-ui-shared/utils/page-layouts'
import { MainPageNavigation } from '@apihub/routes/root/MainPage/MainPageNavigation/MainPageNavigation'
import { DASHBOARD_KIND, GROUP_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useNavigation } from '@apihub/routes/NavigationProvider'
import { FAVORITE_PAGE_REFERER } from '@apihub/entities/referer-pages-names'
import { usePackages } from '@apihub/routes/root/usePackages'
import { useLocation } from 'react-use'
import { FAVORITE_PAGE } from '../../../routes'

export const MAIN_CARD_STYLES = {
  display: 'grid',
  gridTemplateRows: 'max-content 1fr',
  width: '100%',
  boxShadow: DEFAULT_PAPER_SHADOW,
}

export const MainPage: FC = memo(() => {

  const [packages, isLoading] = usePackages({
    kind: [PACKAGE_KIND, GROUP_KIND, DASHBOARD_KIND],
    onlyFavorite: true,
    refererPageKey: FAVORITE_PAGE_REFERER,
  })
  const { navigateToWorkspace } = useNavigation()
  const location = useLocation()

  useEffect(() => {
    if (!packages.length && !isLoading && location.pathname?.includes(FAVORITE_PAGE)) {
      navigateToWorkspace({ workspaceKey: '' })
    }
  }, [isLoading])

  return (
    <Box sx={{
      background: '#F5F5FA',
      display: 'flex',
      height: '100%',
      width: '100%',
      pt: DEFAULT_PAGE_LAYOUT_GAP,
    }}>
      <MainPageNavigation/>
      <Outlet/>
    </Box>
  )
})

