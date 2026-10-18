import type { FC, ReactNode } from 'react'

export type NavigationLinkProps = {
  href: string
  className?: string
  children: ReactNode
}

export type NavigationLinkComponent = FC<NavigationLinkProps>

export const DefaultNavigationLink: NavigationLinkComponent = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
)
