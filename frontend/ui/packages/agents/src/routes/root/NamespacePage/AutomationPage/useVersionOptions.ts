import { useSnapshots } from '../useSnapshots'
import { useMemo } from 'react'
import { getSplittedVersionKey } from '@netcracker/qubership-apihub-ui-shared/utils/versions'

export function useVersionOptions(): string[] {
  const [{ snapshots }] = useSnapshots()
  return useMemo(
    () => snapshots.map(({ versionKey }) => getSplittedVersionKey(versionKey).versionKey),
    [snapshots],
  )
}
