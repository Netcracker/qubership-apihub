import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, useContext, useState } from 'react'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

const UpdatingPackageKeyContext = createContext<Key>()
const SetUpdatingPackageKeyContext = createContext<Dispatch<SetStateAction<Key>>>()

export function useUpdatingPackageKey(): Key {
  return useContext(UpdatingPackageKeyContext)
}

export function useSetUpdatingPackageKey(): Dispatch<SetStateAction<Key>> {
  return useContext(SetUpdatingPackageKeyContext)
}

export function useUpdatingPackageKeyWritableContext(): [Key, Dispatch<SetStateAction<Key>>] {
  return [useUpdatingPackageKey(), useSetUpdatingPackageKey()]
}

export const UpdatingPackageKeyProvider: FC<PropsWithChildren> = ({ children }) => {
  const [updatingPackageKey, setUpdatingPackageKey] = useState<Key>('')

  return (
    <UpdatingPackageKeyContext.Provider value={updatingPackageKey}>
      <SetUpdatingPackageKeyContext.Provider value={setUpdatingPackageKey}>
        {children}
      </SetUpdatingPackageKeyContext.Provider>
    </UpdatingPackageKeyContext.Provider>
  )
}
