import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'

export const BackwardLocationProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [content, setContent] = useState({})
  return (
    <BackwardLocation.Provider value={content}>
      <SetBackwardLocation.Provider value={setContent}>
        {children}
      </SetBackwardLocation.Provider>
    </BackwardLocation.Provider>
  )
})

export function useBackwardLocationContext(): BackwardLocationState {
  return useContext(BackwardLocation)
}

export function useSetBackwardLocationContext(): Dispatch<SetStateAction<BackwardLocationState>> {
  return useContext(SetBackwardLocation)
}

export type BackwardLocation = {
  pathname: string
  search?: string
}

type BackwardLocationState = {
  fromDocumentsComparison?: BackwardLocation
  fromOperation?: BackwardLocation
  fromOperationsComparison?: BackwardLocation
  fromPackagesComparison?: BackwardLocation
  fromPackageSettings?: BackwardLocation
  fromPackage?: BackwardLocation
  fromProfile?: BackwardLocation
}

const BackwardLocation = createContext<BackwardLocationState>()
const SetBackwardLocation = createContext<Dispatch<SetStateAction<BackwardLocationState>>>()
