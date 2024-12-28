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
import { memo, useMemo } from 'react'

import { PackageBreadcrumbs } from '../../PackageBreadcrumbs'
import { CreateVersionButton } from './CreateVersionButton'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { CREATE_VERSION_PERMISSIONS } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'

export type PackagePageToolbarProps = {
  packageObject: Package | null
}
export const PackagePageToolbar: FC<PackagePageToolbarProps> = memo<PackagePageToolbarProps>(({ packageObject }) => {
  const { name = '', permissions } = packageObject ?? {}

  const hasCreateVersionPermissions = useMemo(
    () => CREATE_VERSION_PERMISSIONS.some(managePermission =>
      permissions?.includes(managePermission),
    ),
    [permissions],
  )

  return (
    <Toolbar
      breadcrumbs={<PackageBreadcrumbs packageObject={packageObject}/>}
      header={<ToolbarTitle value={name}/>}
      action={<CreateVersionButton disabled={!hasCreateVersionPermissions}/>}
    />
  )
})
