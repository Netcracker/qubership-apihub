/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { FC, PropsWithChildren } from 'react'
import { createContext, useContext } from 'react'
import type { ComparedPackagesBreadcrumbsData } from './breadcrumbs'

export const COMPARISON_TOOLBAR_BREADCRUMBS_CONTEXT = 'forComparisonToolbar'
export const VERSIONS_SWAPPER_BREADCRUMBS_CONTEXT = 'forVersionsSwapper'
export type BreadcrumbsDataStoreKey =
  | typeof COMPARISON_TOOLBAR_BREADCRUMBS_CONTEXT
  | typeof VERSIONS_SWAPPER_BREADCRUMBS_CONTEXT
export type BreadcrumbsDataStore = Record<BreadcrumbsDataStoreKey, ComparedPackagesBreadcrumbsData | null>

export const BreadcrumbsDataContext = createContext<ComparedPackagesBreadcrumbsData | null>()

export function useBreadcrumbsData(): ComparedPackagesBreadcrumbsData | null {
  return useContext(BreadcrumbsDataContext)
}

export const ComparedPackagesBreadcrumbsProvider: FC<PropsWithChildren & BreadcrumbsDataStore> = (props) => {
  const { children, forComparisonToolbar } = props

  return (
    <BreadcrumbsDataContext.Provider value={forComparisonToolbar}>
      {children}
    </BreadcrumbsDataContext.Provider>
  )
}
