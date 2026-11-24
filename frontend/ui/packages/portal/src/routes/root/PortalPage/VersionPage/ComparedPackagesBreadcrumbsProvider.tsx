import { createContext, useContext } from 'react'

import type { ComparedPackagesBreadcrumbsData } from './breadcrumbs'

export const BreadcrumbsDataContext = createContext<ComparedPackagesBreadcrumbsData | null>()

export function useBreadcrumbsData(): ComparedPackagesBreadcrumbsData | null {
  return useContext(BreadcrumbsDataContext)
}
