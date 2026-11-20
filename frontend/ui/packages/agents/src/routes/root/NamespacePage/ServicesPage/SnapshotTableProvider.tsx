import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'

// TODO: `SnapshotTableProvider` is redundant and should be removed.
//  Need to calculate selectable depends on step statuses
export const SnapshotTableProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [selectable, setSelectable] = useState<boolean>(true)

  return (
    <SnapshotTableSelectableContext.Provider value={selectable}>
      <SetSnapshotTableSelectableContext.Provider value={setSelectable}>
        {children}
      </SetSnapshotTableSelectableContext.Provider>
    </SnapshotTableSelectableContext.Provider>
  )
})

const SnapshotTableSelectableContext = createContext<boolean>()
const SetSnapshotTableSelectableContext = createContext<Dispatch<SetStateAction<boolean>>>()

export function useSnapshotTableSelectable(): boolean {
  return useContext(SnapshotTableSelectableContext)
}

export function useSetSnapshotTableSelectable(): Dispatch<SetStateAction<boolean>> {
  return useContext(SetSnapshotTableSelectableContext)
}
