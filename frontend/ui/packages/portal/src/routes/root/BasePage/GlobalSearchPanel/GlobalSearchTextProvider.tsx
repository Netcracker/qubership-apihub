import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'

export const GlobalSearchTextProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [searchText, setSearchText] = useState<string>('')
  const [activeTab, setActiveTab] = useState<SearchResultTab>(OPERATIONS_TAB)

  return (
    <GlobalSearchTextContext.Provider value={searchText}>
      <SetGlobalSearchTextContext.Provider value={setSearchText}>
        <GlobalSearchActiveTabContext.Provider value={activeTab}>
          <SetGlobalSearchActiveTabContext.Provider value={setActiveTab}>
            {children}
          </SetGlobalSearchActiveTabContext.Provider>
        </GlobalSearchActiveTabContext.Provider>
      </SetGlobalSearchTextContext.Provider>
    </GlobalSearchTextContext.Provider>
  )
})

export function useGlobalSearchText(): string {
  return useContext(GlobalSearchTextContext)
}

export function useSetGlobalSearchText(): Dispatch<SetStateAction<string>> {
  return useContext(SetGlobalSearchTextContext)
}

export function useGlobalSearchActiveTab(): SearchResultTab {
  return useContext(GlobalSearchActiveTabContext)
}

export function useSetGlobalSearchActiveTab(): Dispatch<SetStateAction<SearchResultTab>> {
  return useContext(SetGlobalSearchActiveTabContext)
}

const GlobalSearchTextContext = createContext<string>()
const SetGlobalSearchTextContext = createContext<Dispatch<SetStateAction<string>>>()

const GlobalSearchActiveTabContext = createContext<SearchResultTab>()
const SetGlobalSearchActiveTabContext = createContext<Dispatch<SetStateAction<SearchResultTab>>>()

export const PACKAGES_TAB = 'packages'
export const OPERATIONS_TAB = 'operations'
export const DOCUMENTS_TAB = 'documents'

export type SearchResultTab =
  | typeof PACKAGES_TAB
  | typeof OPERATIONS_TAB
  | typeof DOCUMENTS_TAB
