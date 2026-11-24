import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'

export const SelectedOperationTagsProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [selectedTags, setSelectedTags] = useState<readonly string[]>([])

  return (
    <SelectedOperationTagsContext.Provider value={selectedTags}>
      <SetSelectedOperationTagsContext.Provider value={setSelectedTags}>
        {children}
      </SetSelectedOperationTagsContext.Provider>
    </SelectedOperationTagsContext.Provider>
  )
})

const SelectedOperationTagsContext = createContext<readonly string[]>()
const SetSelectedOperationTagsContext = createContext<Dispatch<SetStateAction<readonly string[]>>>()

export function useSelectedOperationTags(): readonly string[] {
  return useContext(SelectedOperationTagsContext)
}

export function useSetSelectedOperationTags(): Dispatch<SetStateAction<readonly string[]>> {
  return useContext(SetSelectedOperationTagsContext)
}
