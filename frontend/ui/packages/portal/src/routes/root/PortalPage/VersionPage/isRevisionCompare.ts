import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

export function isRevisionCompare(originVersion: Key, changedVersion: Key): boolean {
  const {
    versionKey: originVersionKey,
    revisionKey: originRevisionKey,
  } = getSplittedVersionKey(originVersion)
  const {
    versionKey: changedVersionKey,
    revisionKey: changedRevisionKey,
  } = getSplittedVersionKey(changedVersion)

  return originVersionKey === changedVersionKey && originRevisionKey !== changedRevisionKey
}
