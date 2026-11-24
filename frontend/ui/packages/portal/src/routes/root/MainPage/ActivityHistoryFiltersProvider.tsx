import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import type { ActivityType } from '@portal/entities/activity-enums'

export const ActivityHistoryFiltersProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [content, setContent] = useState({})
  return (
    <ActivityHistoryFilters.Provider value={content}>
      <SetActivityHistoryFilters.Provider value={setContent}>
        {children}
      </SetActivityHistoryFilters.Provider>
    </ActivityHistoryFilters.Provider>
  )
})

export function useActivityHistoryFiltersContext(): ActivityHistoryFiltersState {
  return useContext(ActivityHistoryFilters)
}

export function useSetActivityHistoryFiltersContext(): Dispatch<SetStateAction<ActivityHistoryFiltersState>> {
  return useContext(SetActivityHistoryFilters)
}

type ActivityHistoryFiltersState = {
  types?: ReadonlyArray<ActivityType>
  textFilter?: string
}

const ActivityHistoryFilters = createContext<ActivityHistoryFiltersState>()
const SetActivityHistoryFilters = createContext<Dispatch<SetStateAction<ActivityHistoryFiltersState>>>()
