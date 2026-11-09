import type { FC } from 'react'
import { memo, useEffect } from 'react'
import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { DEFAULT_PAPER_SHADOW } from '@netcracker/qubership-apihub-ui-shared/themes/palette'
import { DEFAULT_PAGE_LAYOUT_GAP } from '@netcracker/qubership-apihub-ui-shared/utils/page-layouts'
import { MainPageNavigation } from '@portal/routes/root/MainPage/MainPageNavigation/MainPageNavigation'
import { DASHBOARD_KIND, GROUP_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useNavigation } from '@portal/routes/NavigationProvider'
import { FAVORITE_PAGE_REFERER } from '@portal/entities/referer-pages-names'
import { usePackages } from '@portal/routes/root/usePackages'
import { useLibraries } from '@portal/routes/root/useLibraries'
import { useLocation } from 'react-use'
import { FAVORITE_PAGE } from '../../../routes'

export const MAIN_CARD_STYLES = {
  display: 'grid',
  gridTemplateRows: 'max-content 1fr',
  width: '100%',
  boxShadow: DEFAULT_PAPER_SHADOW,
}

export const MainPage: FC = memo(() => {

  const [packages, arePackagesLoading] = usePackages({
    kind: [PACKAGE_KIND, GROUP_KIND, DASHBOARD_KIND],
    onlyFavorite: true,
    refererPageKey: FAVORITE_PAGE_REFERER,
  })
  const { libraries, isLoading: areLibrariesLoading } = useLibraries({ onlyFavorite: true })
  const { navigateToWorkspace } = useNavigation()
  const location = useLocation()

  useEffect(() => {
    if (
      !arePackagesLoading && !areLibrariesLoading && !packages.length && !libraries.length &&
      location.pathname?.includes(FAVORITE_PAGE)
    ) {
      navigateToWorkspace({ workspaceKey: '' })
    }
  }, [areLibrariesLoading, arePackagesLoading, libraries.length, location.pathname, navigateToWorkspace, packages.length])

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

