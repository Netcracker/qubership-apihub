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

import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DASHBOARD_KIND, PACKAGE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useOptionalUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { optionalSearchParams } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'

import { GUIDES_PAGE_REFERER } from '@portal/entities/referer-pages-names'
import { usePackages } from '@portal/routes/root/usePackages'
import { DOCS_ARTICLES_QUERY_KEY, DOCS_NAVIGATION_QUERY_KEY, docsRequestJson, useDocsBackendBasePath } from './docsRequests'
import type { Article, ArticlesDto, NavigationDto, NavSectionDto } from './types'
import { ARTICLE_SCOPE_PACKAGE } from './types'

const PACKAGES_LIMIT = 100

export type PackageGuides = Readonly<{
  packageObject: Package
  // Version key of the latest release ("2026.1@1"), used for navigation
  versionKey: string
  // Version name ("2026.1") the articles are bound to
  version: string
  articles: ReadonlyArray<Article>
  // Navigation tree of the version (sections, groups, guides)
  sections: ReadonlyArray<NavSectionDto>
}>

/**
 * Package-level guides of every package the current principal can read, taken from the latest release of each.
 * The docs backend lists package articles per (package, version) only, so one request per released package is made.
 * TODO: replace with a single docs backend call once it offers a cross-package listing filtered by the caller's access.
 */
export function usePackageGuidesOverview(enabled: boolean = true): [ReadonlyArray<PackageGuides>, IsLoading] {
  const basePath = useDocsBackendBasePath()
  const [user] = useOptionalUser()
  const [packages, isPackagesLoading] = usePackages({
    kind: [PACKAGE_KIND, DASHBOARD_KIND],
    showAllDescendants: true,
    showParents: true,
    lastReleaseVersionDetails: true,
    limit: PACKAGES_LIMIT,
    enabled: enabled,
    refererPageKey: GUIDES_PAGE_REFERER,
  })

  const releasedPackages = useMemo(
    () => packages.filter(packageObject => !!packageObject.lastReleaseVersionDetails?.version),
    [packages],
  )

  const results = useQueries({
    queries: releasedPackages.map(packageObject => {
      const versionKey = packageObject.lastReleaseVersionDetails!.version!
      const [version] = versionKey.split('@')
      return {
        queryKey: [DOCS_ARTICLES_QUERY_KEY, basePath, user?.key ?? '', ARTICLE_SCOPE_PACKAGE, undefined, packageObject.key, version, PACKAGES_LIMIT],
        queryFn: () => getPackageArticles(basePath, packageObject.key, version),
        enabled: enabled,
      }
    }),
  })

  const navigationResults = useQueries({
    queries: releasedPackages.map(packageObject => {
      const versionKey = packageObject.lastReleaseVersionDetails!.version!
      const [version] = versionKey.split('@')
      return {
        queryKey: [DOCS_NAVIGATION_QUERY_KEY, basePath, user?.key ?? '', ARTICLE_SCOPE_PACKAGE, packageObject.key, version],
        queryFn: () => getPackageNavigation(basePath, packageObject.key, version),
        enabled: enabled,
      }
    }),
  })

  const packageGuides = useMemo(
    () => releasedPackages
      .map((packageObject, index) => {
        const versionKey = packageObject.lastReleaseVersionDetails!.version!
        return {
          packageObject: packageObject,
          versionKey: versionKey,
          version: versionKey.split('@')[0],
          articles: results[index]?.data?.articles ?? [],
          sections: navigationResults[index]?.data?.sections ?? [],
        }
      })
      .filter(item => item.articles.length > 0),
    [navigationResults, releasedPackages, results],
  )

  const isLoading = enabled && (
    isPackagesLoading || results.some(result => result.isLoading) || navigationResults.some(result => result.isLoading)
  )

  return [packageGuides, isLoading]
}

async function getPackageNavigation(basePath: string, packageId: string, version: string): Promise<NavigationDto> {
  const searchParams = optionalSearchParams({
    scope: { value: ARTICLE_SCOPE_PACKAGE },
    packageId: { value: packageId },
    version: { value: version },
  })
  return docsRequestJson<NavigationDto>(basePath, `/navigation?${searchParams}`, { method: 'GET' })
}

async function getPackageArticles(basePath: string, packageId: string, version: string): Promise<ArticlesDto> {
  const searchParams = optionalSearchParams({
    scope: { value: ARTICLE_SCOPE_PACKAGE },
    packageId: { value: packageId },
    version: { value: version },
    limit: { value: PACKAGES_LIMIT },
  })
  return docsRequestJson<ArticlesDto>(basePath, `/articles?${searchParams}`, { method: 'GET' })
}
