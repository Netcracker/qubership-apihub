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

import { createContext, FC, PropsWithChildren, useContext } from 'react'
import { LayoutSide } from '../types/internal/LayoutSide'
import { IModelTreeNode } from '@netcracker/qubership-apihub-api-data-model'

type Value = LayoutSide | undefined
type SetValue = ((stateNode?: IModelTreeNode<any, any, any>) => void) | undefined

type NoSubHeaderContextProviderProps = PropsWithChildren & {
  value: LayoutSide | undefined,
  setValue: (stateNode?: IModelTreeNode<any, any, any>) => void,
}

const NoSubHeaderContext = createContext<Value>(undefined)
const SetNoSubHeaderContext = createContext<SetValue>(undefined)

export function useNoSubHeaderSide(): Value {
  return useContext(NoSubHeaderContext)
}

export function useSetNoSubHeaderSide(): SetValue {
  return useContext(SetNoSubHeaderContext)
}

export const NoSubHeaderSideProvider: FC<NoSubHeaderContextProviderProps> = (props) => {
  const { value, setValue, children } = props

  return (
    <NoSubHeaderContext.Provider value={value}>
      <SetNoSubHeaderContext.Provider value={setValue}>
        {children}
      </SetNoSubHeaderContext.Provider>
    </NoSubHeaderContext.Provider>
  )
}
