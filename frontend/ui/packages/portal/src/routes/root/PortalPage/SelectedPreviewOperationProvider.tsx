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
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { PackageRef } from '@netcracker/qubership-apihub-ui-shared/entities/operations'

export const SelectedPreviewOperationProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [selectedOperationData, setSelectedOperationData] = useState<SelectedOperationData | undefined>(undefined)

  return (
    <SelectedPreviewOperationContext.Provider value={selectedOperationData}>
      <SetSelectedPreviewOperationContext.Provider value={setSelectedOperationData}>
        {children}
      </SetSelectedPreviewOperationContext.Provider>
    </SelectedPreviewOperationContext.Provider>
  )
})

const SelectedPreviewOperationContext = createContext<SelectedOperationData | undefined>()
const SetSelectedPreviewOperationContext = createContext<Dispatch<SetStateAction<SelectedOperationData | undefined>>>()

export function useSelectedPreviewOperation(): SelectedOperationData | undefined {
  return useContext(SelectedPreviewOperationContext)
}

export function useSetSelectedPreviewOperation(): Dispatch<SetStateAction<SelectedOperationData | undefined>> {
  return useContext(SetSelectedPreviewOperationContext)
}

type SelectedOperationData = {
  operationKey: Key
  packageRef?: PackageRef
}
