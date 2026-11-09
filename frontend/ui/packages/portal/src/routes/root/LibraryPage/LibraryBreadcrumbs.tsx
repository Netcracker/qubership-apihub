import { Breadcrumbs, Link } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

import { WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

import type { MavenLibraryDto } from '@portal/entities/libraries'
import { getGroupPath, getWorkspacePath } from '@portal/routes/NavigationProvider'
import { usePackage } from '../usePackage'

type LibraryBreadcrumbsProps = {
  library: MavenLibraryDto
  children?: ReactNode
}

export const LibraryBreadcrumbs: FC<LibraryBreadcrumbsProps> = ({ library, children }) => {
  const [parentPackage] = usePackage({ packageKey: library.parentPackageId ?? '', showParents: true })
  const parents = parentPackage ? [...(parentPackage.parents ?? []), parentPackage] : []

  return (
    <Breadcrumbs component="nav" data-testid="LibraryBreadcrumbs">
      {parents.map(parent => (
        <Link
          key={parent.key}
          component={NavLink}
          to={parent.kind === WORKSPACE_KIND
            ? getWorkspacePath({ workspaceKey: parent.key })
            : getGroupPath({ groupKey: parent.key })}
        >
          {parent.name}
        </Link>
      ))}
      {children}
    </Breadcrumbs>
  )
}
LibraryBreadcrumbs.displayName = 'LibraryBreadcrumbs'
