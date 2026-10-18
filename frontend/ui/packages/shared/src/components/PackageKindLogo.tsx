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

import type { FC, ReactElement } from 'react'
import { memo } from 'react'
import type { PackageKind } from '../entities/packages'
import { DASHBOARD_KIND, GROUP_KIND, PACKAGE_KIND } from '../entities/packages'
import { DashboardIcon } from '../icons/DashboardIcon'
import { GroupIcon } from '../icons/GroupIcon'
import { PackageIcon } from '../icons/PackageIcon'

export type PackageKindLogoProps = {
  kind?: PackageKind
}

export const PackageKindLogo: FC<PackageKindLogoProps> = memo<PackageKindLogoProps>(({ kind }) => {
  if (kind) {
    return PACKAGE_KIND_ICON_MAP[kind] ?? null
  }
  return null
})

const PACKAGE_KIND_ICON_MAP: Partial<Record<PackageKind, ReactElement>> = {
  [DASHBOARD_KIND]: <DashboardIcon/>,
  [GROUP_KIND]: <GroupIcon/>,
  [PACKAGE_KIND]: <PackageIcon/>,
}
