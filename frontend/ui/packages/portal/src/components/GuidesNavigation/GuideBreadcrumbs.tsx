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
import { Breadcrumbs, Link, Typography } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import type { NavigationContext } from '@portal/utils/guides-navigation'

export type GuideBreadcrumbsProps = Readonly<{
  // Leading link, e.g. "Guides" -> the guides index
  root?: Readonly<{ title: string; path: string }>
  // From the navigation tree; when absent only the root and the title are shown
  context?: NavigationContext
  title: string
  sx?: Record<string, unknown>
}>

export const GuideBreadcrumbs: FC<GuideBreadcrumbsProps> = memo<GuideBreadcrumbsProps>(({ root, context, title, sx }) => {
  const crumbs = context?.breadcrumbs ?? [{ title: title }]

  return (
    <Breadcrumbs sx={sx} data-testid="GuideBreadcrumbs">
      {root && <Link component={RouterLink} to={root.path} underline="hover" color="inherit">{root.title}</Link>}
      {crumbs.map((crumb, index) => {
        const last = index === crumbs.length - 1
        if (last) {
          return <Typography key={index} color="text.primary">{crumb.title}</Typography>
        }
        return crumb.path
          ? <Link key={index} component={RouterLink} to={crumb.path} underline="hover" color="inherit">{crumb.title}</Link>
          : <Typography key={index} color="inherit">{crumb.title}</Typography>
      })}
    </Breadcrumbs>
  )
})
