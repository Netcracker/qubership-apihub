import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'

export const ShouldAutoExpandTagsProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [shouldAutoExpandTags, setShouldAutoExpandTags] = useState<boolean>(true)

  return (
    <ShouldAutoExpandTags.Provider value={shouldAutoExpandTags}>
      <SetShouldAutoExpandTags.Provider value={setShouldAutoExpandTags}>
        {children}
      </SetShouldAutoExpandTags.Provider>
    </ShouldAutoExpandTags.Provider>
  )
})

const ShouldAutoExpandTags = createContext<boolean>()
const SetShouldAutoExpandTags = createContext<Dispatch<SetStateAction<boolean>>>()

export function useShouldAutoExpandTagsContext(): boolean {
  return useContext(ShouldAutoExpandTags)
}

export function useSetShouldAutoExpandTagsContext(): Dispatch<SetStateAction<boolean>> {
  return useContext(SetShouldAutoExpandTags)
}
