import {
  createContext,
  type Dispatch,
  type FC,
  memo,
  type PropsWithChildren,
  type SetStateAction,
  useContext,
  useState,
} from 'react'

import type { DiscoveryView } from '../ServicesPageBody/DiscoverServicesStep/useDiscoveryView'

type DiscoveryStartView = DiscoveryView | undefined

/**
 * Holds the view of Discover Services at the start of the last discovery, or `undefined` before the first start on the
 * page and after a change of the workspace. The agent clears the services when a discovery starts, so the services
 * response cannot tell a first discovery from a restarted one.
 */
export const DiscoveryStartViewProvider: FC<PropsWithChildren> = memo(({ children }) => {
  const [startView, setStartView] = useState<DiscoveryStartView>()

  return (
    <DiscoveryStartViewContext.Provider value={startView}>
      <SetDiscoveryStartViewContext.Provider value={setStartView}>
        {children}
      </SetDiscoveryStartViewContext.Provider>
    </DiscoveryStartViewContext.Provider>
  )
})

const DiscoveryStartViewContext = createContext<DiscoveryStartView>()
const SetDiscoveryStartViewContext = createContext<Dispatch<SetStateAction<DiscoveryStartView>>>()

export function useDiscoveryStartView(): DiscoveryStartView {
  return useContext(DiscoveryStartViewContext)
}

export function useSetDiscoveryStartView(): Dispatch<SetStateAction<DiscoveryStartView>> {
  return useContext(SetDiscoveryStartViewContext)
}
