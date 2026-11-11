import { Link } from '@mui/material'
import type { FC } from 'react'
import { NavLink } from 'react-router-dom'

import type { NavigationLinkProps } from '@netcracker/qubership-apihub-api-doc-viewer'

export const JavaClassNavigationLink: FC<NavigationLinkProps> = ({ href, className, children }) => (
  <Link component={NavLink} to={href} className={className}>
    {children}
  </Link>
)
JavaClassNavigationLink.displayName = 'JavaClassNavigationLink'
