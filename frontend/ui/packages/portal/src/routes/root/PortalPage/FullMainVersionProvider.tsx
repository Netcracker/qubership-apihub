import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export const FullMainVersionProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [version, setVersion] = useState<Key | undefined>(undefined)
  const [latest, setLatest] = useState<boolean | undefined>(true)

  return (
    <FullVersionContext.Provider value={version}>
      <SetFullVersionContext.Provider value={setVersion}>
        <IsLatestRevisionContext.Provider value={latest}>
          <SetIsLatestRevisionContext.Provider value={setLatest}>
            {children}
          </SetIsLatestRevisionContext.Provider>
        </IsLatestRevisionContext.Provider>
      </SetFullVersionContext.Provider>
    </FullVersionContext.Provider>
  )
})

const FullVersionContext = createContext<Key | undefined>()
const SetFullVersionContext = createContext<Dispatch<SetStateAction<Key | undefined>>>()

export function useFullMainVersion(): Key | undefined {
  return useContext(FullVersionContext)
}

export function useSetFullMainVersion(): Dispatch<SetStateAction<Key | undefined>> {
  return useContext(SetFullVersionContext)
}

const IsLatestRevisionContext = createContext<boolean | undefined>()
const SetIsLatestRevisionContext = createContext<Dispatch<SetStateAction<boolean | undefined>>>()

export function useIsLatestRevision(): boolean | undefined {
  return useContext(IsLatestRevisionContext)
}

export function useSetIsLatestRevision(): Dispatch<SetStateAction<boolean | undefined>> {
  return useContext(SetIsLatestRevisionContext)
}
