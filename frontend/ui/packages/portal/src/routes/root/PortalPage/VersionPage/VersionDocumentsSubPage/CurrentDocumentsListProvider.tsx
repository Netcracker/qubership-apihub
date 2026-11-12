import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, useContext, useState } from 'react'
import type { Documents } from '@portal/entities/documents'

const SelectedDocumentContext = createContext<Documents>()
const SetSelectedDocumentContext = createContext<Dispatch<SetStateAction<Documents>>>()

export function useCurrentDocumentsList(): Documents {
  return useContext(SelectedDocumentContext)
}

export function useSetCurrentDocumentsList(): Dispatch<SetStateAction<Documents>> {
  return useContext(SetSelectedDocumentContext)
}

export const CurrentDocumentsListProvider: FC<PropsWithChildren> = ({ children }) => {
  const [currentDocuments, setCurrentDocuments] = useState<Documents>([])

  return (
    <SelectedDocumentContext.Provider value={currentDocuments}>
      <SetSelectedDocumentContext.Provider value={setCurrentDocuments}>
        {children}
      </SetSelectedDocumentContext.Provider>
    </SelectedDocumentContext.Provider>
  )
}
