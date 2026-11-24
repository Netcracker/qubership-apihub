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
