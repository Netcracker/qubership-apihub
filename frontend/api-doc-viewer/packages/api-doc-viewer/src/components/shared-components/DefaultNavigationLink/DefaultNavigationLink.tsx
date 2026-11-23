import type { FC, ReactNode } from 'react'

export type NavigationLinkProps = {
  href: string
  className?: string
  title?: string
  children: ReactNode
}

export type NavigationLinkComponent = FC<NavigationLinkProps>

export const DefaultNavigationLink: NavigationLinkComponent = ({ href, className, title, children }) => (
  <a href={href} className={className} title={title}>
    {children}
  </a>
)
