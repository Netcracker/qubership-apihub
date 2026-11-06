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
import { Box, Typography } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { memo, useMemo } from 'react'

import type { Article } from '@portal/api-hooks/docs-backend/types'
import type { ResolvedNavItem, ResolvedNavSection } from '@portal/utils/guides-navigation'
import { flattenNavigation, guidesOf } from '@portal/utils/guides-navigation'
import { GuideCard } from './GuideCard'
import { GUIDES_COLOURS, GUIDES_SECTION_TITLE_SX } from './guides-styles'

export type GuidesTreeProps = Readonly<{
  sections: ReadonlyArray<ResolvedNavSection>
  // Article metadata (subtitle, audience) by slug; items without one fall back to the navigation title
  articles: ReadonlyArray<Article>
  packageLabel?: string
  // Replaces the section title when the tree has a single section (e.g. "Essentials" for the generic tree)
  singleSectionTitle?: ReactNode
  // Omits the heading of a single-section tree (the caller renders its own heading)
  hideSingleSectionHeader?: boolean
}>

const GRID_SX = { display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } } as const

// Child guide titles listed on a group card before "+N more"
const SUMMARY_TITLES = 3

/**
 * Guides index laid out by the navigation tree: a heading with a guide count per section, then one card per
 * top-level item. A group (or a guide with children) opens its first guide, where the sidebar shows the rest of
 * its structure. A lone synthetic section renders without heading.
 */
export const GuidesTree: FC<GuidesTreeProps> = memo<GuidesTreeProps>(({ sections, articles, packageLabel, singleSectionTitle, hideSingleSectionHeader }) => {
  const articlesBySlug = useMemo(() => new Map(articles.map(article => [article.slug, article])), [articles])
  const single = sections.length === 1
  const hideSectionHeaders = single && (hideSingleSectionHeader || (!!sections[0].synthetic && !singleSectionTitle))

  return (
    <Box display="flex" flexDirection="column" gap={5} data-testid="GuidesTree">
      {sections.map(section => {
        const count = flattenNavigation([section]).length
        return (
          <Box key={section.id || section.title} data-testid="GuidesTreeSection">
            {!hideSectionHeaders && (
              <Box display="flex" alignItems="baseline" gap={1.5} mb={2}>
                <Typography component="h3" sx={GUIDES_SECTION_TITLE_SX}>
                  {single && singleSectionTitle ? singleSectionTitle : section.title}
                </Typography>
                <Typography sx={{ fontSize: 13, color: GUIDES_COLOURS.textMuted }}>{count} {count === 1 ? 'guide' : 'guides'}</Typography>
              </Box>
            )}
            <Box sx={GRID_SX}>
              {section.items.map(item => (
                <TopLevelCard key={item.id || item.slug} item={item} articlesBySlug={articlesBySlug} packageLabel={packageLabel}/>
              ))}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
})

type TopLevelCardProps = Readonly<{
  item: ResolvedNavItem
  articlesBySlug: ReadonlyMap<string, Article>
  packageLabel?: string
}>

/** A plain guide card, or for an item with children a card summarizing its guides and opening the first one. */
const TopLevelCard: FC<TopLevelCardProps> = memo<TopLevelCardProps>(({ item, articlesBySlug, packageLabel }) => {
  const guides = useMemo(() => guidesOf(item), [item])
  const [first] = guides
  if (!first?.path) {
    return null
  }
  const article = toArticle(item.path ? item : first, articlesBySlug, item.title)
  if (item.children.length === 0) {
    return <GuideCard article={article} packageLabel={packageLabel} to={{ pathname: first.path }}/>
  }
  const ownSubtitle = item.path ? article.subtitle : undefined
  return (
    <GuideCard
      article={article}
      packageLabel={packageLabel}
      to={{ pathname: first.path }}
      description={ownSubtitle || summarizeTitles(guides)}
      ctaLabel="Start reading"
      meta={`${guides.length} ${guides.length === 1 ? 'guide' : 'guides'}`}
      group
    />
  )
})

function summarizeTitles(guides: ReadonlyArray<ResolvedNavItem>): string {
  const titles = guides.slice(0, SUMMARY_TITLES).map(guide => guide.title)
  const rest = guides.length - titles.length
  return rest > 0 ? `${titles.join(' · ')} · +${rest} more` : titles.join(' · ')
}

// The card shows the navigation title, which may be an override, so it reads like the sidebar
function toArticle(item: ResolvedNavItem, articlesBySlug: ReadonlyMap<string, Article>, title: string): Article {
  const article = item.slug ? articlesBySlug.get(item.slug) : undefined
  return article
    ? { ...article, title }
    : { slug: item.slug!, title: title, scope: 'generic', labels: [], displayOrder: item.displayOrder, updatedAt: '' }
}
