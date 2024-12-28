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
import { NavLink, useParams } from 'react-router-dom'
import { useProject } from '../root/useProject'
import { getEditorPath } from '../NavigationProvider'
import { usePackage } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePackage'
import { calculatePackagePath } from '@netcracker/qubership-apihub-ui-shared/utils/packages'

export type BreadcrumbNavigationProps = {
  relativePath?: ReadonlyArray<{
    name: string
    to: string
  }>
}

export const BreadcrumbNavigation: FC<BreadcrumbNavigationProps> = memo<BreadcrumbNavigationProps>(({ relativePath }) => {
  const { groupId } = useParams()

  const [project] = useProject()
  const { packageObj: group } = usePackage({ packageKey: project?.groupKey ?? groupId, showParents: true })
  const path = calculatePackagePath(group, true, '•')

  return (
    <Breadcrumbs>
      <Link
        component={NavLink}
        to={getEditorPath()}
      >
        {`${path}`}
      </Link>
      {
        relativePath?.map(({ name, to }, index) => (
          <Link
            key={`${name}-${to}-${index}`}
            component={NavLink}
            to={to}
          >
            {name}
          </Link>
        ))
      }
    </Breadcrumbs>
  )
})
