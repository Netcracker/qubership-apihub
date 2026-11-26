import type { FC } from 'react'

import { DocumentErrorIndicator } from '@netcracker/qubership-apihub-ui-shared/components/ErrorIndicators/DocumentErrorIndicator'
import type { PackageKey, SpecKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

import type { VersionKey } from '@agents/entities/keys'
import { useDocumentErrorFileKeys } from './useDocumentErrorFileKeys'

type SnapshotDocumentErrorIndicatorProps = {
  specKey: SpecKey
  // The snapshot package and version of the service that the document belongs to
  snapshotPackageKey: PackageKey
  snapshotVersionKey: VersionKey
}

/**
 * Marks a discovered document when its published copy in the snapshot version has errors. Both carry the file key
 * of the agent.
 */
export const SnapshotDocumentErrorIndicator: FC<SnapshotDocumentErrorIndicatorProps> = ({
  specKey,
  snapshotPackageKey,
  snapshotVersionKey,
}) => {
  const documentErrorFileKeys = useDocumentErrorFileKeys({
    packageKey: snapshotPackageKey,
    versionKey: snapshotVersionKey,
  })

  return (
    <DocumentErrorIndicator
      hasErrors={documentErrorFileKeys.has(specKey)}
      fontSize="extra-small"
    />
  )
}

SnapshotDocumentErrorIndicator.displayName = 'SnapshotDocumentErrorIndicator'
