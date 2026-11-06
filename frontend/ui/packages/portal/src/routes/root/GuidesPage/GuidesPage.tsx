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
import { Box, Container, Link, Skeleton, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import { useDocsBackendEnabled } from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'
import { isUnauthorizedError } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import { ARTICLE_SCOPE_GENERIC } from '@portal/api-hooks/docs-backend/types'
import { useArticles } from '@portal/api-hooks/docs-backend/useArticles'
import { useNavigation } from '@portal/api-hooks/docs-backend/useNavigation'
import { usePackageGuidesOverview } from '@portal/api-hooks/docs-backend/usePackageGuidesOverview'
import { GuideBreadcrumbs } from '@portal/components/GuidesNavigation/GuideBreadcrumbs'
import { getGuidePath, getPackageGuidesPath, getPackagePath } from '@portal/routes/NavigationProvider'
import { resolveNavigation } from '@portal/utils/guides-navigation'
import { HOME_PAGE_PATH } from '../../../routes'
import { GuidesPageHeader } from './GuidesPageHeader'
import { GuidesTree } from './GuidesTree'
import { GuidesUnavailable } from './GuidesUnavailable'
import { GUIDES_COLOURS, GUIDES_CONTAINER_MAX_WIDTH, GUIDES_SECTION_TITLE_SX, GUIDES_SUBTITLE_SX } from './guides-styles'

const HOME_ROOT = { title: 'Developer portal', path: HOME_PAGE_PATH }

export const GuidesPage: FC = memo(() => {
  const docsBackendEnabled = useDocsBackendEnabled()
  const [articles, isArticlesLoading, error] = useArticles({ enabled: docsBackendEnabled })
  const [navSections, isNavigationLoading] = useNavigation({ scope: ARTICLE_SCOPE_GENERIC, enabled: docsBackendEnabled })
  const [packageGuides, isPackageGuidesLoading] = usePackageGuidesOverview(docsBackendEnabled)
  const isLoading = isArticlesLoading || isNavigationLoading

  const sections = useMemo(
    () => resolveNavigation(navSections, item => getGuidePath({ slug: item.slug! }).pathname!),
    [navSections],
  )
  const packageTrees = useMemo(
    () => packageGuides.map(item => ({
      ...item,
      sections: resolveNavigation(
        item.sections,
        navItem => getPackageGuidesPath({ packageKey: item.packageObject.key, versionKey: item.versionKey, guideSlug: navItem.slug }).pathname!,
      ),
    })),
    [packageGuides],
  )

  if (!docsBackendEnabled || isUnauthorizedError(error)) {
    return <GuidesUnavailable loginRequired={isUnauthorizedError(error)}/>
  }

  return (
    <Box data-testid="GuidesPage">
      <GuidesPageHeader
        breadcrumbs={<GuideBreadcrumbs root={HOME_ROOT} title="Guides" sx={{ mb: 1.5, fontSize: 13 }}/>}
        title="Guides"
        subtitle="Cross-cutting essentials first, then the guides of each API in reading order."
      />

      <Container maxWidth={false} sx={{ maxWidth: GUIDES_CONTAINER_MAX_WIDTH, py: 5, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Box data-testid="GenericGuidesSection">
          {isLoading && (
            <Box display="grid" gap={2} gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}>
              {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} variant="rounded" height={96}/>)}
            </Box>
          )}
          {!isLoading && articles.length === 0 && (
            <Typography sx={GUIDES_SUBTITLE_SX}>No guides are available.</Typography>
          )}
          {!isLoading && <GuidesTree sections={sections} articles={articles} singleSectionTitle="Essentials"/>}
        </Box>

        {(isPackageGuidesLoading || packageTrees.length > 0) && (
          <Box
            component="section"
            sx={{ borderTop: `1px solid ${GUIDES_COLOURS.borderLight}`, pt: 5, display: 'flex', flexDirection: 'column', gap: 5 }}
            data-testid="PackageGuidesSection"
          >
            {isPackageGuidesLoading && (
              <Box display="grid" gap={2} gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}>
                {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} variant="rounded" height={96}/>)}
              </Box>
            )}
            {packageTrees.map(({ packageObject, version, articles: packageArticles, sections: packageSections }) => (
              <Box key={packageObject.key} data-testid="PackageGuidesGroup">
                <Box display="flex" alignItems="baseline" gap={1.5} mb={2}>
                  <Typography component="h3" sx={GUIDES_SECTION_TITLE_SX}>
                    <Link component={RouterLink} to={getPackagePath({ packageKey: packageObject.key })} underline="hover" color="inherit">
                      {packageObject.name}
                    </Link>
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: GUIDES_COLOURS.textMuted }}>
                    {packageObject.parents?.[0]?.name ? `${packageObject.parents[0].name} · ` : ''}{version}
                    {' · '}{packageArticles.length} {packageArticles.length === 1 ? 'guide' : 'guides'}
                  </Typography>
                </Box>
                <GuidesTree sections={packageSections} articles={packageArticles} hideSingleSectionHeader/>
              </Box>
            ))}
          </Box>
        )}
      </Container>
    </Box>
  )
})
