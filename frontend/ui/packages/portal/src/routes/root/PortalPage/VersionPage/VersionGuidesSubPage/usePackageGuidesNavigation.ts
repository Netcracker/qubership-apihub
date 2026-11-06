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
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { useDocsBackendEnabled } from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import { ARTICLE_SCOPE_PACKAGE } from '@portal/api-hooks/docs-backend/types'
import { useNavigation } from '@portal/api-hooks/docs-backend/useNavigation'
import { getPackageGuidesPath } from '@portal/routes/NavigationProvider'
import type { NavigationContext, ResolvedNavSection } from '@portal/utils/guides-navigation'
import { findNavigationContext, resolveNavigation } from '@portal/utils/guides-navigation'

/** Article version = APIHUB version name without the revision suffix ("2024.1@3" -> "2024.1"). */
export function toArticleVersion(versionKey: string | undefined): string | undefined {
  return versionKey?.split('@')[0]
}

export type PackageGuidesNavigation = Readonly<{
  sections: ReadonlyArray<ResolvedNavSection>
  // Breadcrumbs and prev/next of the guide selected in the URL
  context?: NavigationContext
  isLoading: IsLoading
  error: Error | null
}>

/** Navigation tree of the package version in the URL, with paths pointing at the package Guides tab. */
export function usePackageGuidesNavigation(): PackageGuidesNavigation {
  const { packageId, versionId, guideSlug } = useParams()
  const docsBackendEnabled = useDocsBackendEnabled()
  const version = toArticleVersion(versionId)

  const [navSections, isLoading, error] = useNavigation({
    scope: ARTICLE_SCOPE_PACKAGE,
    packageId: packageId,
    version: version,
    enabled: docsBackendEnabled && !!packageId && !!version,
  })

  const sections = useMemo(
    () => resolveNavigation(
      navSections,
      item => getPackageGuidesPath({ packageKey: packageId!, versionKey: versionId!, guideSlug: item.slug }).pathname!,
    ),
    [navSections, packageId, versionId],
  )
  const context = useMemo(() => findNavigationContext(sections, guideSlug), [sections, guideSlug])

  return { sections, context, isLoading, error }
}
