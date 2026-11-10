import { useParams } from 'react-router-dom'

import { useDocumentTitle } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useDocumentTitle'
import type { DocumentTitleSegments } from '@netcracker/qubership-apihub-ui-shared/utils/document-title'

import { PAGE_TITLES, PORTAL_DOCUMENT_TITLE_FORMAT, type VersionsComparisonTitleParams } from './pageTitles'
import type { ComparisonParams } from './root/PortalPage/VersionPage/useComparisonParams'
import { usePackage } from './root/usePackage'
import { useVersionWithRevision } from './root/useVersionWithRevision'

/** Sets the portal tab title. Segments come from `PAGE_TITLES`, see `useDocumentTitle` for the rules. */
export function usePageTitle(segments: DocumentTitleSegments): void {
  useDocumentTitle(segments, PORTAL_DOCUMENT_TITLE_FORMAT)
}

/**
 * Sets the title of a package version page: appends the package name and the version to the given segments.
 * The package and the version come from the URL, so on a dashboard they stay the dashboard's even when a
 * referenced package is selected. Both are read from the same queries as the page toolbar, so no extra
 * request is made.
 */
export function useVersionPageTitle(segments: DocumentTitleSegments): void {
  const { packageId, versionId } = useParams()
  const [packageObject] = usePackage({ showParents: true })
  const { fullVersion, latestRevision } = useVersionWithRevision(versionId, packageId)

  usePageTitle([
    ...segments,
    ...PAGE_TITLES.versionContext(packageObject?.name, { fullVersion: fullVersion, latestRevision: latestRevision }),
  ])
}

/** Both sides of a comparison for its title, from the same queries as the comparison breadcrumbs. */
export function useComparisonTitleSides(params: ComparisonParams): VersionsComparisonTitleParams {
  const origin = useVersionWithRevision(params.originVersionKey, params.originPackageKey)
  const changed = useVersionWithRevision(params.changedVersionKey, params.changedPackageKey)

  return {
    origin: {
      packageName: params.originPackage?.name,
      version: { fullVersion: origin.fullVersion, latestRevision: origin.latestRevision },
    },
    changed: {
      packageName: params.changedPackage?.name,
      version: { fullVersion: changed.fullVersion, latestRevision: changed.latestRevision },
    },
  }
}
