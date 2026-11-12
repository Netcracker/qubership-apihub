import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, useContext, useState } from 'react'
import type { DocumentsTabSubPageKey } from '../OpenApiViewer/OpenApiViewer'
import { OVERVIEW_SUB_PAGE } from '../OpenApiViewer/OpenApiViewer'

const SelectedSubPageContext = createContext<DocumentsTabSubPageKey>()
const SetSelectedSubPageContext = createContext<Dispatch<SetStateAction<DocumentsTabSubPageKey>>>()

export function useSelectedSubPage(): DocumentsTabSubPageKey {
  return useContext(SelectedSubPageContext)
}

export function useSetSelectedSubPage(): Dispatch<SetStateAction<DocumentsTabSubPageKey>> {
  return useContext(SetSelectedSubPageContext)
}

export const SelectedSubPageProvider: FC<PropsWithChildren> = ({ children }) => {
  const [selectedSubPage, setSelectedSubPage] = useState<DocumentsTabSubPageKey>(OVERVIEW_SUB_PAGE)

  return (
    <SelectedSubPageContext.Provider value={selectedSubPage}>
      <SetSelectedSubPageContext.Provider value={setSelectedSubPage}>
        {children}
      </SetSelectedSubPageContext.Provider>
    </SelectedSubPageContext.Provider>
  )
}
