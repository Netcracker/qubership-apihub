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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Box, Collapse, List, ListItemButton, ListItemText, Skeleton, Typography } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { memo, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import type { ResolvedNavItem, ResolvedNavSection } from '@portal/utils/guides-navigation'
import { containsSlug } from '@portal/utils/guides-navigation'

const INDENT = 1.5
export const GUIDES_NAVIGATION_WIDTH = 264
// The shared theme lays ListItemButton out as a column; the sidebar rows are label + chevron side by side
const ROW_SX = { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 } as const

export type GuidesNavigationProps = Readonly<{
  sections: ReadonlyArray<ResolvedNavSection>
  currentSlug?: string
  header?: ReactNode
  width?: number | string
  // Sticky panel for pages that scroll as a whole; otherwise it fills its container and scrolls itself
  sticky?: boolean
  stickyTop?: number
  isLoading?: boolean
  emptyMessage?: string
}>

/**
 * Left navigation of the guides: collapsible sections with nested items (groups and guides).
 * The active guide is highlighted and the branch containing it is expanded on mount.
 */
export const GuidesNavigation: FC<GuidesNavigationProps> = memo<GuidesNavigationProps>(({
  sections,
  currentSlug,
  header,
  width = GUIDES_NAVIGATION_WIDTH,
  sticky = false,
  stickyTop = 0,
  isLoading = false,
  emptyMessage = 'No guides',
}) => {
  // The synthetic trailing section is unnamed when it is the only one (plain flat list)
  const hideSectionHeaders = sections.length === 1 && !!sections[0].synthetic

  return (
    <Box
      component="nav"
      aria-label="Guides navigation"
      data-testid="GuidesNavigation"
      sx={{
        width: width,
        flexShrink: 0,
        pr: 1,
        ...(sticky
          ? { position: 'sticky', top: stickyTop, alignSelf: 'flex-start', maxHeight: `calc(100vh - ${stickyTop}px)`, overflowY: 'auto' }
          : { height: '100%', overflowY: 'auto' }),
      }}
    >
      {header}
      {isLoading && (
        <Box px={1} data-testid="GuidesNavigationSkeleton">
          {[0, 1, 2, 3, 4].map(index => <Skeleton key={index} variant="text" height={28}/>)}
        </Box>
      )}
      {!isLoading && sections.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 1 }}>{emptyMessage}</Typography>
      )}
      {!isLoading && sections.map(section => (
        <GuidesNavigationSection
          key={section.id || section.title}
          section={section}
          currentSlug={currentSlug}
          hideHeader={hideSectionHeaders}
        />
      ))}
    </Box>
  )
})

type SectionProps = Readonly<{
  section: ResolvedNavSection
  currentSlug?: string
  hideHeader: boolean
}>

const GuidesNavigationSection: FC<SectionProps> = memo<SectionProps>(({ section, currentSlug, hideHeader }) => {
  const [open, setOpen] = useState(true)

  return (
    <Box sx={{ mb: 1 }} data-testid="GuidesNavSection">
      {!hideHeader && (
        <ListItemButton onClick={() => setOpen(value => !value)} sx={{ ...ROW_SX, py: 0.5, borderRadius: 1 }} data-testid="GuidesNavSectionHeader">
          <ListItemText
            primary={section.title}
            primaryTypographyProps={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', noWrap: true }}
          />
          {open ? <ExpandMoreIcon fontSize="small" color="action"/> : <ChevronRightIcon fontSize="small" color="action"/>}
        </ListItemButton>
      )}
      <Collapse in={open}>
        <List disablePadding>
          {section.items.map(item => (
            <GuidesNavigationItem key={item.id || item.slug} item={item} depth={hideHeader ? 0 : 1} currentSlug={currentSlug}/>
          ))}
        </List>
      </Collapse>
    </Box>
  )
})

type ItemProps = Readonly<{
  item: ResolvedNavItem
  depth: number
  currentSlug?: string
}>

const GuidesNavigationItem: FC<ItemProps> = memo<ItemProps>(({ item, depth, currentSlug }) => {
  const active = !!item.slug && item.slug === currentSlug
  const hasChildren = item.children.length > 0
  const [open, setOpen] = useState(() => containsSlug(item, currentSlug))

  // Expand the branch when the current guide changes to one inside it (e.g. via prev/next)
  useEffect(() => {
    if (containsSlug(item, currentSlug)) {
      setOpen(true)
    }
  }, [currentSlug, item])

  const linkProps = item.path ? { component: RouterLink, to: item.path } : { component: 'div' as const }

  return (
    <>
      <ListItemButton
        {...linkProps}
        selected={active}
        onClick={hasChildren && !item.path ? () => setOpen(value => !value) : undefined}
        sx={{
          ...ROW_SX,
          pl: 1 + depth * INDENT,
          py: 0.5,
          borderRadius: 1.5,
          mb: 0.25,
          '&.Mui-selected': { bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.light' } },
        }}
        data-testid={item.kind === 'group' ? 'GuidesNavGroup' : 'GuidesNavItem'}
      >
        <ListItemText
          primary={item.title}
          primaryTypographyProps={{
            fontSize: 13,
            fontWeight: active ? 600 : 400,
            color: active ? 'primary.main' : 'text.primary',
            noWrap: true,
          }}
        />
        {hasChildren && (
          <Box
            component="span"
            display="flex"
            onClick={item.path ? event => { event.preventDefault(); setOpen(value => !value) } : undefined}
          >
            {open ? <ExpandMoreIcon fontSize="small" color="action"/> : <ChevronRightIcon fontSize="small" color="action"/>}
          </Box>
        )}
      </ListItemButton>
      {hasChildren && (
        <Collapse in={open}>
          <List disablePadding>
            {item.children.map(child => (
              <GuidesNavigationItem key={child.id || child.slug} item={child} depth={depth + 1} currentSlug={currentSlug}/>
            ))}
          </List>
        </Collapse>
      )}
    </>
  )
})
