import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import type { Key } from '../../../entities/keys'

export const PreviousReleaseOptionsProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [previousReleaseVersion, setPreviousReleaseVersion] = useState<Key | undefined>()
  const [previousReleasePackageKey, setPreviousReleasePackageKey] = useState<Key | undefined>()

  return (
    <PreviousReleaseVersionContext.Provider value={previousReleaseVersion}>
      <SetPreviousReleaseVersionContext.Provider value={setPreviousReleaseVersion}>
        <PreviousReleasePackageKeyContext.Provider value={previousReleasePackageKey}>
          <SetPreviousReleasePackageKeyContext.Provider value={setPreviousReleasePackageKey}>
            {children}
          </SetPreviousReleasePackageKeyContext.Provider>
        </PreviousReleasePackageKeyContext.Provider>
      </SetPreviousReleaseVersionContext.Provider>
    </PreviousReleaseVersionContext.Provider>
  )
})

const PreviousReleaseVersionContext = createContext<Key | undefined>()
const SetPreviousReleaseVersionContext = createContext<Dispatch<SetStateAction<Key | undefined>>>()

export function usePreviousReleaseVersion(): Key | undefined {
  return useContext(PreviousReleaseVersionContext)
}

export function useSetPreviousReleaseVersion(): Dispatch<SetStateAction<Key | undefined>> {
  return useContext(SetPreviousReleaseVersionContext)
}

const PreviousReleasePackageKeyContext = createContext<Key | undefined>()
const SetPreviousReleasePackageKeyContext = createContext<Dispatch<SetStateAction<Key | undefined>>>()

export function usePreviousReleasePackageKey(): Key | undefined {
  return useContext(PreviousReleasePackageKeyContext)
}

export function useSetPreviousReleasePackageKey(): Dispatch<SetStateAction<Key | undefined>> {
  return useContext(SetPreviousReleasePackageKeyContext)
}
