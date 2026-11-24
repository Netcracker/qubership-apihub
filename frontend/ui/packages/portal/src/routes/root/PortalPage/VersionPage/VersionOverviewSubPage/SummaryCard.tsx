import type { FC } from 'react'
import { memo } from 'react'
import { SummaryTab } from './SummaryTab/SummaryTab'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'

export const SummaryCard: FC = memo(() => {
  return (
    <BodyCard
      header="Summary"
      body={<SummaryTab/>}
      overrideBodySx={{
        overflowY: 'auto',
      }}
    />
  )
})
