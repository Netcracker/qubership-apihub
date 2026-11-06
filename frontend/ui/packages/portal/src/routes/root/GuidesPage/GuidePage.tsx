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
import { Box, Chip, Container, Divider, Link, Skeleton, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'

import { MarkdownViewer } from '@netcracker/qubership-apihub-ui-shared/components/SpecificationDialog/MarkdownViewer'
import { useDocsBackendEnabled } from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'
import { isUnauthorizedError } from '@netcracker/qubership-apihub-ui-shared/utils/requests'

import { ARTICLE_SCOPE_GENERIC, ARTICLE_VISIBILITY_CORPORATE } from '@portal/api-hooks/docs-backend/types'
import { useArticle } from '@portal/api-hooks/docs-backend/useArticle'
import { useNavigation } from '@portal/api-hooks/docs-backend/useNavigation'
import { GuideBreadcrumbs } from '@portal/components/GuidesNavigation/GuideBreadcrumbs'
import { GuidesNavigation } from '@portal/components/GuidesNavigation/GuidesNavigation'
import { getGuidePath } from '@portal/routes/NavigationProvider'
import { findNavigationContext, resolveNavigation } from '@portal/utils/guides-navigation'
import { GUIDES_PAGE_PATH } from '../../../routes'
import { GuidesUnavailable } from './GuidesUnavailable'
import {
  GUIDES_CARD_SX,
  GUIDES_COLOURS,
  GUIDES_PAGE_TITLE_SX,
  GUIDES_SIDEBAR_WIDTH,
  GUIDES_SUBTITLE_SX,
} from './guides-styles'

const GUIDES_ROOT = { title: 'Guides', path: GUIDES_PAGE_PATH }
const STICKY_TOP = 24

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Generic guide: the Essentials sidebar on the left, the article on the right, as laid out in the prototype. */
export const GuidePage: FC = memo(() => {
  const { slug } = useParams()
  const docsBackendEnabled = useDocsBackendEnabled()
  const [article, isLoading, error] = useArticle({ slug: slug, enabled: docsBackendEnabled })
  const [navSections, isNavigationLoading] = useNavigation({ scope: ARTICLE_SCOPE_GENERIC, enabled: docsBackendEnabled })

  const sections = useMemo(
    () => resolveNavigation(navSections, item => getGuidePath({ slug: item.slug! }).pathname!),
    [navSections],
  )
  const context = useMemo(() => findNavigationContext(sections, slug), [sections, slug])
  const updatedAt = article?.updatedAt ? formatDate(article.updatedAt) : ''

  if (!docsBackendEnabled || isUnauthorizedError(error)) {
    return <GuidesUnavailable loginRequired={isUnauthorizedError(error)}/>
  }

  return (
    <Container maxWidth={false} sx={{ py: 3 }} data-testid="GuidePage">
      <Box display="flex" gap={4}>
        <Box sx={{ display: { xs: 'none', md: 'block' }, borderRight: `1px solid ${GUIDES_COLOURS.borderLight}`, mr: 1 }}>
          <GuidesNavigation
            sections={sections}
            currentSlug={slug}
            isLoading={isNavigationLoading}
            sticky
            stickyTop={STICKY_TOP}
            width={GUIDES_SIDEBAR_WIDTH}
            header={
              <>
                <Link component={RouterLink} to={GUIDES_PAGE_PATH} underline="hover" sx={{ fontSize: 13, display: 'block', mb: 1, px: 1 }}>
                  ‹ All guides
                </Link>
                <Typography
                  component={RouterLink}
                  to={GUIDES_PAGE_PATH}
                  sx={{ display: 'block', px: 1, mb: 1.5, fontWeight: 600, fontSize: 15, color: GUIDES_COLOURS.textPrimary, textDecoration: 'none' }}
                >
                  Essentials
                </Typography>
              </>
            }
          />
        </Box>

        <Box component="article" flex={1} minWidth={0}>
          <GuideBreadcrumbs root={GUIDES_ROOT} context={context} title={article?.title ?? slug ?? ''} sx={{ mb: 1.5, fontSize: 13 }}/>

          {isLoading && (
            <>
              <Skeleton variant="text" width="60%" height={48}/>
              <Skeleton variant="text" width="40%"/>
              <Skeleton variant="rounded" height={400} sx={{ mt: 3 }}/>
            </>
          )}

          {!isLoading && !article && (
            <Typography sx={GUIDES_SUBTITLE_SX}>The guide was not found.</Typography>
          )}

          {article && (
            <>
              <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                <Typography component="h1" sx={GUIDES_PAGE_TITLE_SX}>{article.title}</Typography>
                {article.visibility === ARTICLE_VISIBILITY_CORPORATE && <Chip size="small" label="Corporate" variant="outlined"/>}
                {article.published === false && <Chip size="small" label="Unpublished" color="warning" variant="outlined"/>}
              </Box>
              {article.subtitle && <Typography sx={{ ...GUIDES_SUBTITLE_SX, mt: 0.5 }}>{article.subtitle}</Typography>}
              {article.labels.length > 0 && (
                <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
                  {article.labels.map(label => <Chip key={label} size="small" label={label} variant="outlined"/>)}
                </Box>
              )}

              <Box sx={{ ...GUIDES_CARD_SX, mt: 3, p: { xs: 2, md: 4 } }}>
                <MarkdownViewer value={article.bodyMd ?? ''}/>
              </Box>

              <Divider sx={{ my: 4, borderColor: GUIDES_COLOURS.borderLight }}/>
              <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} data-testid="GuidePrevNext">
                <Box>
                  {context?.previous && (
                    <Link component={RouterLink} to={context.previous.path} underline="hover" sx={{ fontWeight: 500 }} data-testid="PreviousGuideButton">
                      ‹ {context.previous.title}
                    </Link>
                  )}
                </Box>
                {updatedAt && (
                  <Typography sx={{ fontSize: 12, color: GUIDES_COLOURS.textSecondary }}>Last updated {updatedAt}</Typography>
                )}
                <Box>
                  {context?.next && (
                    <Link component={RouterLink} to={context.next.path} underline="hover" sx={{ fontWeight: 500 }} data-testid="NextGuideButton">
                      {context.next.title} ›
                    </Link>
                  )}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Container>
  )
})
