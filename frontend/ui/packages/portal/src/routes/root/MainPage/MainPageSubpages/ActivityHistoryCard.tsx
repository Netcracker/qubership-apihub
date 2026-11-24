import type { FC } from 'react'
import { memo } from 'react'
import type { ActivityType } from '@portal/entities/activity-enums'
import { CollapsedPanel } from '@netcracker/qubership-apihub-ui-shared/components/CollapsedPanel'
import { ActivityHistoryPanel } from '@portal/components/ActivityList/ActivityHistoryPanel'
import type { ActivityHistoryQueryResult } from '@portal/routes/root/useActivityHistory'
import { usePortalPageSettingsContext } from '@portal/routes/PortalPageSettingsProvider'

export type ActivityHistoryCardProps = {
  useActivity: (enabled: boolean) => ActivityHistoryQueryResult
  textFilter?: string
  types?: ReadonlyArray<ActivityType>
  onChangeFilters?: (filters: {
    textFilter?: string
    types?: ReadonlyArray<ActivityType>
  }) => void
  placeholderText?: string
}

// High Order Component //
export const ActivityHistoryCard: FC<ActivityHistoryCardProps> = memo<ActivityHistoryCardProps>((props) => {
  const { useActivity } = props
  const { expandActivityHistoryPanel, toggleExpandActivityHistoryPanel } = usePortalPageSettingsContext()

  const { activities, isLoading } = useActivity(expandActivityHistoryPanel)

  return (
    <>
      {
        expandActivityHistoryPanel
          ? <ActivityHistoryPanel
            onCollapse={toggleExpandActivityHistoryPanel}
            activities={activities}
            isLoading={isLoading}
            {...props}
          />
          : <CollapsedPanel
            onExpand={toggleExpandActivityHistoryPanel}
          />
      }
    </>
  )
})
