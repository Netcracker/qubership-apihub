import { useParams } from 'react-router-dom'

import { useDocumentTitle } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useDocumentTitle'
import type { DocumentTitleSegments } from '@netcracker/qubership-apihub-ui-shared/utils/document-title'

import { PAGE_TITLES, type VersionsComparisonTitleParams } from './pageTitles'
import type { ComparisonParams } from './root/PortalPage/VersionPage/useComparisonParams'
import { usePackage } from './root/usePackage'
import { useVersionWithRevision } from './root/useVersionWithRevision'

export function useVersionPageTitle(segments: DocumentTitleSegments): void {
  const { packageId, versionId } = useParams()
  const [packageObject] = usePackage({ showParents: true })
  const { fullVersion, latestRevision } = useVersionWithRevision(versionId, packageId)

  useDocumentTitle([
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
