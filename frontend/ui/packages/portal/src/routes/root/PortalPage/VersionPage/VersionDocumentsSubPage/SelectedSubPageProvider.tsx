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
