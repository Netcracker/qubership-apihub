import { type FC, memo } from 'react'

import type { PackageReference } from '../../entities/version-references'
import { getSplittedVersionKey } from '../../utils/versions'
import type { TestableProps } from '../Testable'
import type { ErrorIndicatorViewProps } from './ErrorIndicator'
import { VersionErrorIndicator } from './VersionErrorIndicator'

type PackageReferenceErrorIndicatorProps = TestableProps & ErrorIndicatorViewProps & {
  reference: PackageReference
}

export const PackageReferenceErrorIndicator: FC<PackageReferenceErrorIndicatorProps> = memo<
  PackageReferenceErrorIndicatorProps
>(({
  reference: { version, latestRevision, kind, hasErrors, changelogHasErrors, apiProcessorVersion },
  ...viewProps
}) => (
  <VersionErrorIndicator
    versionKey={getSplittedVersionKey(version, latestRevision).versionKey}
    kind={kind}
    hasErrors={hasErrors}
    changelogHasErrors={changelogHasErrors}
    apiProcessorVersion={apiProcessorVersion}
    {...viewProps}
  />
))

PackageReferenceErrorIndicator.displayName = 'PackageReferenceErrorIndicator'
