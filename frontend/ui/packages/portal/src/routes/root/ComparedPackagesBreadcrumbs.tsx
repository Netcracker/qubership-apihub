import type { FC } from 'react'
import { memo } from 'react'
import { Breadcrumbs, Link } from '@mui/material'
import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'
import type { LinkedComparedBreadcrumbPathItem } from '@portal/routes/root/PortalPage/VersionPage/breadcrumbs'

export type ComparedPackagesBreadcrumbsProps = {
  data?: LinkedComparedBreadcrumbPathItem[]
}

export const ComparedPackagesBreadcrumbs: FC<ComparedPackagesBreadcrumbsProps> =
  memo<ComparedPackagesBreadcrumbsProps>(({ data = [] }) => {
    const links: ReactElement[] = data.map(linkData => {
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
      <Breadcrumbs component="nav" data-testid="ComparedPackagesBreadcrumbs">
        {links}
      </Breadcrumbs>
    )
  })
