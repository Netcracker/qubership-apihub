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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined'
import { Box, Chip, Typography } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import type { Path } from 'react-router-dom'
import { Link as RouterLink } from 'react-router-dom'

import type { Article } from '@portal/api-hooks/docs-backend/types'
import { ARTICLE_VISIBILITY_CORPORATE } from '@portal/api-hooks/docs-backend/types'
import { getGuidePath } from '@portal/routes/NavigationProvider'
import { GUIDES_CARD_HOVER_SX, GUIDES_CARD_SX, GUIDES_CARD_TEXT_SX, GUIDES_CARD_TITLE_SX, GUIDES_COLOURS } from './guides-styles'

export type GuideCardProps = Readonly<{
  article: Article
  // Shown as a chip for package-level guides, e.g. "Product Ordering API"
  packageLabel?: string
  // Navigation target; defaults to the generic guide page
  to?: Partial<Path>
  // Card text; defaults to the article subtitle
  description?: ReactNode
  // Footer call to action; defaults to "Read guide"
  ctaLabel?: string
  // Muted text on the right of the footer, e.g. "4 guides"
  meta?: ReactNode
  // A group of guides gets the "library" icon instead of the single-article one
  group?: boolean
}>

const ICON_TILE_SX = {
  width: 40,
  height: 40,
  flexShrink: 0,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: GUIDES_COLOURS.primaryLight,
  color: GUIDES_COLOURS.primaryDark,
} as const

const DESCRIPTION_SX = {
  ...GUIDES_CARD_TEXT_SX,
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
} as const

/**
 * Card of the guide indexes, laid out like the home page cards: icon and title, a clamped description, and a
 * call-to-action footer. The whole card is a link.
 */
export const GuideCard: FC<GuideCardProps> = memo<GuideCardProps>(({ article, packageLabel, to, description, ctaLabel = 'Read guide', meta, group }) => {
  const { slug, title, subtitle, visibility, published } = article
  const target = to ?? getGuidePath({ slug })
  const text = description ?? subtitle
  const Icon = group ? LibraryBooksOutlinedIcon : ArticleOutlinedIcon

  return (
    <Box
      component={RouterLink}
      to={target}
      sx={{ ...GUIDES_CARD_SX, ...GUIDES_CARD_HOVER_SX, p: 3, display: 'block', height: '100%', textDecoration: 'none', color: 'inherit' }}
      data-testid="GuideCard"
    >
      <Box display="flex" flexDirection="column" gap={1.5} height="100%" minWidth={0}>
        <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
          <Box sx={ICON_TILE_SX}><Icon sx={{ fontSize: 20 }}/></Box>
          <Typography component="h4" sx={{ ...GUIDES_CARD_TITLE_SX, flexWrap: 'wrap', minWidth: 0 }}>
            {title}
            {packageLabel && <Chip size="small" label={packageLabel} color="primary" variant="outlined" sx={{ ml: 0.5 }}/>}
            {visibility === ARTICLE_VISIBILITY_CORPORATE && <Chip size="small" label="Corporate" variant="outlined"/>}
            {published === false && <Chip size="small" label="Unpublished" color="warning" variant="outlined"/>}
          </Typography>
        </Box>
        {text && <Typography sx={DESCRIPTION_SX}>{text}</Typography>}
        <Box display="flex" alignItems="center" justifyContent="space-between" mt="auto" pt={1}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: GUIDES_COLOURS.primary, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            {ctaLabel} <ArrowForwardIcon sx={{ fontSize: 16 }}/>
          </Typography>
          {meta && <Typography sx={{ fontSize: 12, color: GUIDES_COLOURS.textMuted }}>{meta}</Typography>}
        </Box>
      </Box>
    </Box>
  )
})
