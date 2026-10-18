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
import type { Documents } from '@apihub/entities/documents'

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
