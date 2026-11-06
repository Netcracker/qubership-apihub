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
import { Box, Container, Typography } from '@mui/material'
import type { FC, PropsWithChildren, ReactNode } from 'react'
import { memo } from 'react'

import { GUIDES_COLOURS, GUIDES_CONTAINER_MAX_WIDTH, GUIDES_PAGE_TITLE_SX, GUIDES_SUBTITLE_SX } from './guides-styles'

export type GuidesPageHeaderProps = PropsWithChildren<{
  breadcrumbs?: ReactNode
  title: string
  subtitle?: string
}>

/** White header band of the top-level guides pages (breadcrumbs, title, subtitle), as in the prototype. */
export const GuidesPageHeader: FC<GuidesPageHeaderProps> = memo<GuidesPageHeaderProps>(({ breadcrumbs, title, subtitle, children }) => {
  return (
    <Box sx={{ bgcolor: '#FFFFFF', borderBottom: `1px solid ${GUIDES_COLOURS.borderLight}` }} data-testid="GuidesPageHeader">
      <Container maxWidth={false} sx={{ maxWidth: GUIDES_CONTAINER_MAX_WIDTH, pt: 4, pb: 5 }}>
        {breadcrumbs}
        <Typography component="h1" sx={{ ...GUIDES_PAGE_TITLE_SX, mb: subtitle ? 1 : 0 }}>{title}</Typography>
        {subtitle && <Typography sx={{ ...GUIDES_SUBTITLE_SX, maxWidth: 640 }}>{subtitle}</Typography>}
        {children}
      </Container>
    </Box>
  )
})
