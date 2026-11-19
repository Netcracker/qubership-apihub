import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useCallback, useContext, useMemo, useState } from 'react'
import type { GraphViewPort } from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView'
import type {
  VisitorNavigationDetails,
} from '@netcracker/qubership-apihub-ui-shared/components/SchemaGraphView/oasToClassDiagramService'
import { joinedJsonPath } from '@netcracker/qubership-apihub-ui-shared/utils/operations'

export const OperationNavigationDataProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [navigationDetails, setNavigationDetails] = useState<VisitorNavigationDetails>()
  const pathViewPortMap = useMemo(() => new Map<string, GraphViewPort>(), [])

  return (
    <OperationNavigationDetailsContext.Provider value={navigationDetails}>
      <SetOperationNavigationDetailsContext.Provider value={setNavigationDetails}>
        <OperationPathViewPortContext.Provider value={pathViewPortMap}>
          {children}
        </OperationPathViewPortContext.Provider>
      </SetOperationNavigationDetailsContext.Provider>
    </OperationNavigationDetailsContext.Provider>
  )
})

const OperationNavigationDetailsContext = createContext<VisitorNavigationDetails | undefined>()
const SetOperationNavigationDetailsContext = createContext<Dispatch<SetStateAction<VisitorNavigationDetails | undefined>>>()
const OperationPathViewPortContext = createContext<Map<string, GraphViewPort | null>>()

export function useOperationNavigationDetails(): [VisitorNavigationDetails | undefined, Dispatch<SetStateAction<VisitorNavigationDetails | undefined>>] {
  return [
    useContext(OperationNavigationDetailsContext),
    useContext(SetOperationNavigationDetailsContext),
  ]
}

export function useOperationPathViewPort(): GraphViewPort | null {
  const [navigationDetails] = useOperationNavigationDetails()
  const viewPortMap = useContext(OperationPathViewPortContext)
  return navigationDetails?.scopeDeclarationPath.length
    ? viewPortMap.get(joinedJsonPath(navigationDetails.scopeDeclarationPath)) ?? null
    : null
}

export function useSetOperationPathViewPort(): (viewPort: GraphViewPort | null) => void {
  const [navigationDetails] = useOperationNavigationDetails()
  const viewPortMap = useContext(OperationPathViewPortContext)
  return useCallback((viewPort: GraphViewPort | null) => {
      if (navigationDetails?.scopeDeclarationPath.length) {
        const pathKey = joinedJsonPath(navigationDetails.scopeDeclarationPath)
        viewPortMap.set(pathKey, viewPort ?? null)
      }
    },
    [navigationDetails, viewPortMap],
  )
}
