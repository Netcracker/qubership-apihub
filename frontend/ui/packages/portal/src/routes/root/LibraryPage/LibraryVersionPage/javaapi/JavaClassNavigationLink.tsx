import { Link } from '@mui/material'
import type { FC } from 'react'
import { NavLink } from 'react-router-dom'

import type { NavigationLinkProps } from '@netcracker/qubership-apihub-api-doc-viewer'

export const JavaClassNavigationLink: FC<NavigationLinkProps> = ({
  href,
  className,
  title,
  children,
}) => (
  <Link component={NavLink} to={href} className={className} title={title}>
    {children}
  </Link>
)
JavaClassNavigationLink.displayName = 'JavaClassNavigationLink'
