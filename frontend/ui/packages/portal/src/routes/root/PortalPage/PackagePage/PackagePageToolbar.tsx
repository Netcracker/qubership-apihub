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
  const { name = '', permissions, kind } = packageObject ?? {}

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
      action={<CreateVersionButton disabled={!hasCreateVersionPermissions} kind={kind}/>}
    />
  )
})
