import { Link } from '@mui/material'
import type { NavigationLinkProps } from '@netcracker/qubership-apihub-api-doc-viewer'
import type { FC } from 'react'
import { memo } from 'react'
import { NavLink } from 'react-router-dom'

export const DdlTableNavigationLink: FC<NavigationLinkProps> = memo<NavigationLinkProps>(({
  href,
  className,
  children,
}) => (
  <Link component={NavLink} to={href} className={className}>
    {children}
  </Link>
))

DdlTableNavigationLink.displayName = 'DdlTableNavigationLink'
