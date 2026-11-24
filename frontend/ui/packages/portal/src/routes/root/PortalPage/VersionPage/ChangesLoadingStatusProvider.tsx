import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, useContext, useState } from 'react'

const ChangesLoadingStatusContext = createContext<boolean>(false)
const SetChangesLoadingStatusContext = createContext<Dispatch<SetStateAction<boolean>>>()

export function useChangesLoadingStatus(): boolean {
  return useContext(ChangesLoadingStatusContext)
}

export function useSetChangesLoadingStatus(): Dispatch<SetStateAction<boolean>> {
  return useContext(SetChangesLoadingStatusContext)
}

export const ChangesLoadingStatusProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true)

  return (
    <ChangesLoadingStatusContext.Provider value={isLoading}>
      <SetChangesLoadingStatusContext.Provider value={setIsLoading}>
        {children}
      </SetChangesLoadingStatusContext.Provider>
    </ChangesLoadingStatusContext.Provider>
  )

}
