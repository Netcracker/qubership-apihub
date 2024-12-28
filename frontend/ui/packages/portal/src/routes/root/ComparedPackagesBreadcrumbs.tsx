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
import { memo } from 'react'
import { Breadcrumbs, Link } from '@mui/material'
import type { ReactJSXElement } from '@emotion/react/types/jsx-namespace'
import { NavLink } from 'react-router-dom'
import type { LinkedComparedBreadcrumbPathItem } from '@apihub/routes/root/PortalPage/VersionPage/breadcrumbs'

export type ComparedPackagesBreadcrumbsProps = {
  data?: LinkedComparedBreadcrumbPathItem[]
}

export const ComparedPackagesBreadcrumbs: FC<ComparedPackagesBreadcrumbsProps> =
  memo<ComparedPackagesBreadcrumbsProps>(({ data = [] }) => {
    const links: ReactJSXElement[] = data.map(linkData => {
      return (
        <Link
          key={linkData.key}
          component={NavLink}
          to={linkData.to}
        >
          {linkData.name}
        </Link>
      )
    })

    return (
      <Breadcrumbs data-testid="ComparedPackagesBreadcrumbs">
        {links}
      </Breadcrumbs>
    )
  })
