/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
