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
import { Box, Button, Skeleton, Typography } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import { DASHBOARD_KIND, PACKAGE_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useOptionalUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import { useSystemConfiguration } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useSystemConfiguration'
import { redirectToLogin } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'

import { HOME_PAGE_REFERER } from '@portal/entities/referer-pages-names'
import { WORKSPACES_PAGE } from '../../../routes'
import { getWorkspacePath } from '@portal/routes/NavigationProvider'
import { usePackages } from '../usePackages'
import { HomeGuidesSection } from './HomeGuidesSection'
import { HomePackageCard } from './HomePackageCard'
import { HomeSection } from './HomeSection'
import { usePopularPackages } from './usePopularPackages'
import { useSystemStats } from './useSystemStats'

// Cards shown in the popular packages section; the full list is fetched separately for the statistics
const POPULAR_PACKAGES_LIMIT = 12
const PACKAGES_COUNT_LIMIT = 100 // backend maximum per request

export const HomePage: FC = memo(() => {
  const navigate = useNavigate()
  const [systemConfiguration] = useSystemConfiguration()
  const [user, isUserLoading] = useOptionalUser()
  const [systemStats, isSystemStatsLoading] = useSystemStats()
  const isSystemStatsAvailable = isSystemStatsLoading || !!systemStats
  const defaultWorkspaceId = systemConfiguration?.defaultWorkspaceId ?? ''

  const [workspaces, isWorkspacesLoading] = usePackages({
    kind: WORKSPACE_KIND,
    refererPageKey: HOME_PAGE_REFERER,
  })
  const [packages, isPackagesLoading] = usePopularPackages({
    kind: [PACKAGE_KIND, DASHBOARD_KIND],
    limit: POPULAR_PACKAGES_LIMIT,
    showParents: true,
    lastReleaseVersionDetails: true,
  })
  // Used only for the "packages" statistic
  const [allPackages, isAllPackagesLoading] = usePackages({
    kind: [PACKAGE_KIND, DASHBOARD_KIND],
    showAllDescendants: true,
    showParents: true,
    lastReleaseVersionDetails: true,
    limit: PACKAGES_COUNT_LIMIT,
    refererPageKey: HOME_PAGE_REFERER,
  })

  const handleBrowseWorkspaces = useCallback(() => navigate(`/portal/${WORKSPACES_PAGE}`), [navigate])
  const handleAllPackages = useCallback(
    () => navigate(defaultWorkspaceId ? getWorkspacePath({ workspaceKey: defaultWorkspaceId }) : `/portal/${WORKSPACES_PAGE}`),
    [defaultWorkspaceId, navigate],
  )

  const isAnonymous = !user && !isUserLoading

  return (
    <Box data-testid="HomePage">
      <Hero>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, letterSpacing: '0.1em' }}>
          Developer portal
        </Typography>
        <Typography component="h1" sx={{ fontSize: 48, lineHeight: 1.15, fontWeight: 700, mt: 1.5, maxWidth: 760 }}>
          Discover, read and integrate with APIs published in APIHUB.
        </Typography>
        <Typography sx={{ fontSize: 18, mt: 3, maxWidth: 720, color: 'rgba(255,255,255,0.9)' }}>
          Workspaces group the APIs of each product. Every package has published versions,
          operation references and documents you can read without leaving the portal.
        </Typography>
        <Box display="flex" gap={2} mt={5} flexWrap="wrap">
          <Button
            variant="contained"
            size="large"
            onClick={handleBrowseWorkspaces}
            sx={{ backgroundColor: 'common.white', color: 'primary.main', '&:hover': { backgroundColor: 'grey.100' } }}
            data-testid="BrowseWorkspacesButton"
          >
            Browse workspaces
          </Button>
          {isAnonymous && (
            <Button
              variant="outlined"
              size="large"
              onClick={redirectToLogin}
              sx={{ color: 'common.white', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'common.white' } }}
              data-testid="HeroLoginButton"
            >
              Login
            </Button>
          )}
        </Box>
        <Box display="flex" gap={6} mt={6}>
          <Stat value={workspaces.length} label="workspaces" isLoading={isWorkspacesLoading}/>
          <Stat value={allPackages.length} label="packages" isLoading={isAllPackagesLoading} suffix={allPackages.length >= PACKAGES_COUNT_LIMIT ? '+' : ''}/>
          {isSystemStatsAvailable && (
            <Box display="contents" data-testid="HomeSystemStats">
              <Stat value={systemStats?.versions ?? 0} label="versions" isLoading={isSystemStatsLoading}/>
              <Stat value={systemStats?.operations ?? 0} label="operations" isLoading={isSystemStatsLoading}/>
            </Box>
          )}
        </Box>
      </Hero>

      <Box display="flex" flexDirection="column" gap={8} sx={{ px: { xs: 3, md: 10 }, py: 8, maxWidth: 1440, mx: 'auto' }}>
        <HomeSection
          eyebrow="Workspaces"
          title="Everything an integration needs"
          subtitle="Each workspace groups the APIs of one product area. Pick the one that matches the step you are building."
          action={<Button variant="text" onClick={handleBrowseWorkspaces} data-testid="AllWorkspacesButton">All workspaces →</Button>}
          testId="HomeWorkspacesSection"
        >
          <CardsGrid isLoading={isWorkspacesLoading}>
            {workspaces.map(workspace => <HomePackageCard key={workspace.key} packageObject={workspace}/>)}
          </CardsGrid>
          {!isWorkspacesLoading && workspaces.length === 0 && <Empty text="No workspaces are available."/>}
        </HomeSection>

        <HomeSection
          eyebrow="Packages"
          title="Start with these packages"
          subtitle="Most favorited packages and dashboards, with their latest release."
          action={<Button variant="text" onClick={handleAllPackages} data-testid="AllPackagesButton">All packages →</Button>}
          testId="HomePackagesSection"
        >
          <CardsGrid isLoading={isPackagesLoading}>
            {packages.map(packageObject => <HomePackageCard key={packageObject.key} packageObject={packageObject}/>)}
          </CardsGrid>
          {!isPackagesLoading && packages.length === 0 && <Empty text="No packages have been favorited yet."/>}
        </HomeSection>

        <HomeGuidesSection/>
      </Box>
    </Box>
  )
})

const Hero: FC<{ children: ReactNode }> = ({ children }) => (
  <Box
    sx={{
      position: 'relative',
      overflow: 'hidden',
      color: 'common.white',
      background: theme => `linear-gradient(120deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 55%, #38A6FF 100%)`,
      px: { xs: 3, md: 10 },
      py: { xs: 8, md: 12 },
    }}
    data-testid="HomeHero"
  >
    <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 1440, mx: 'auto' }}>
      {children}
    </Box>
    <Box sx={{ position: 'absolute', right: -160, top: -200, width: 640, height: 640, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)' }}/>
    <Box sx={{ position: 'absolute', right: 160, bottom: -320, width: 560, height: 560, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.06)' }}/>
  </Box>
)

const Stat: FC<{ value: number; label: string; isLoading: boolean; suffix?: string }> = ({ value, label, isLoading, suffix = '' }) => (
  <Box data-testid="HomeStat">
    {isLoading
      ? <Skeleton variant="text" width={48} height={44} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }}/>
      : <Typography sx={{ fontSize: 36, fontWeight: 700, lineHeight: 1.2 }}>{value}{suffix}</Typography>}
    <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>{label}</Typography>
  </Box>
)

const CardsGrid: FC<{ isLoading: boolean; children: ReactNode }> = ({ isLoading, children }) => (
  <Box display="grid" gap={3} gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))">
    {isLoading
      ? Array.from({ length: 3 }, (_, index) => <Skeleton key={index} variant="rounded" height={180}/>)
      : children}
  </Box>
)

const Empty: FC<{ text: string }> = ({ text }) => (
  <Typography variant="body2" color="text.secondary">{text}</Typography>
)
