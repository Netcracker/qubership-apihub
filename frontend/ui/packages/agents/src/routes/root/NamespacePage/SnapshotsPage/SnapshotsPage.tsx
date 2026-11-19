import type { FC } from 'react'
import { memo } from 'react'

import { useSnapshots } from '../useSnapshots'
import { SnapshotsTable } from './SnapshotsTable'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'

export const SnapshotsPage: FC = memo(() => {
  const [{ snapshots }, isLoading] = useSnapshots()

  return (
    <BodyCard
      header="Cloud API Documentation Snapshots"
      body={
        <Placeholder
          invisible={isNotEmpty(snapshots) || isLoading}
          area={CONTENT_PLACEHOLDER_AREA}
          message="No snapshots"
        >
          {isLoading
            ? <LoadingIndicator/>
            : <SnapshotsTable/>}
        </Placeholder>
      }
    />
  )
})

