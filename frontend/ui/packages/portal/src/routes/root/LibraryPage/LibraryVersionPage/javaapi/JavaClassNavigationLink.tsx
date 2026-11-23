import { Link } from '@mui/material'
import type { FC } from 'react'
import { NavLink } from 'react-router-dom'

import type { NavigationLinkProps } from '@netcracker/qubership-apihub-api-doc-viewer'

type JavaClassNavigationLinkProps = NavigationLinkProps & {
  onLinkClick?: () => void
}

export const JavaClassNavigationLink: FC<JavaClassNavigationLinkProps> = ({
  href,
  className,
  title,
  children,
  onLinkClick,
}) => (
  <Link component={NavLink} to={href} className={className} title={title} onClick={onLinkClick}>
    {children}
  </Link>
)
JavaClassNavigationLink.displayName = 'JavaClassNavigationLink'
