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
