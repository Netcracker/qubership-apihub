import { LayoutWithSidebar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithSidebar'
import type { FC } from 'react'
import { memo } from 'react'
import { VersionApiQualityCard } from './VersionApiQualityCard'

export const VersionApiQualitySubPage: FC = memo(() => {
  return (
    <LayoutWithSidebar
      header={<div>Quality Validation</div>}
      body={
        <VersionApiQualityCard />
      }
      disableHorizontalDivider
    />
  )
})
