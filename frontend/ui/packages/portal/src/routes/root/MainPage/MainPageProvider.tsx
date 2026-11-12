import type { Dispatch, FC, PropsWithChildren, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import { ActivityHistoryFiltersProvider } from './ActivityHistoryFiltersProvider'
import { RecentOperationsProvider } from '../RecentOperationsProvider'
import { OperationNavigationDataProvider } from '../OperationNavigationDataProvider'
import { BackwardLocationProvider } from '@portal/routes/BackwardLocationProvider'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Package, Packages } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { PortalPageSettingsProvider } from '@portal/routes/PortalPageSettingsProvider'
import { ApiDiffResultProvider } from '../ApiDiffResultProvider'

export const MainPageProvider: FC<PropsWithChildren> = memo<PropsWithChildren>(({ children }) => {
  const [collapsedKeys, setCollapsedKeys] = useState<Key[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<Package | undefined>(undefined)
  const [currentWorkspaces, setCurrentWorkspaces] = useState<Packages | undefined>(undefined)

  // TODO: Separate providers into common and specific ones
  return (
    <MainPageCollapsedGroupKeysContext.Provider value={collapsedKeys}>
      <SetMainPageCollapsedGroupKeysContext.Provider value={setCollapsedKeys}>
        <SelectedWorkspace.Provider value={selectedWorkspace}>
          <SetSelectedWorkspace.Provider value={setSelectedWorkspace}>
            <WorkspacesContext.Provider value={currentWorkspaces}>
              <SetWorkspacesContext.Provider value={setCurrentWorkspaces}>
                <BackwardLocationProvider>
                  <RecentOperationsProvider>
                    <ActivityHistoryFiltersProvider>
                      <PortalPageSettingsProvider>
                        <OperationNavigationDataProvider>
                          <ApiDiffResultProvider>
                            {children}
                          </ApiDiffResultProvider>
                        </OperationNavigationDataProvider>
                      </PortalPageSettingsProvider>
                    </ActivityHistoryFiltersProvider>
                  </RecentOperationsProvider>
                </BackwardLocationProvider>
              </SetWorkspacesContext.Provider>
            </WorkspacesContext.Provider>
          </SetSelectedWorkspace.Provider>
        </SelectedWorkspace.Provider>
      </SetMainPageCollapsedGroupKeysContext.Provider>
    </MainPageCollapsedGroupKeysContext.Provider>
  )
})

const MainPageCollapsedGroupKeysContext = createContext<Key[]>()
const SetMainPageCollapsedGroupKeysContext = createContext<Dispatch<SetStateAction<Key[]>>>()

export function useMainPageCollapsedGroupKeys(): Key[] {
  return useContext(MainPageCollapsedGroupKeysContext)
}

export function useSetMainPageCollapsedGroupKeys(): Dispatch<SetStateAction<Key[]>> {
  return useContext(SetMainPageCollapsedGroupKeysContext)
}

const SelectedWorkspace = createContext<Package | undefined>()
const SetSelectedWorkspace = createContext<Dispatch<SetStateAction<Package | undefined>>>()

export function useSelectedWorkspaceContexts(): [Package | undefined, Dispatch<SetStateAction<Package | undefined>>] {
  const workspace = useContext(SelectedWorkspace)
  const setWorkspace = useContext(SetSelectedWorkspace)
  return [workspace, setWorkspace]
}

const WorkspacesContext = createContext<Packages | undefined>()
const SetWorkspacesContext = createContext<Dispatch<SetStateAction<Packages | undefined>>>()

export function useWorkspacesContexts(): [Packages | undefined, Dispatch<SetStateAction<Packages | undefined>>] {
  const workspaces = useContext(WorkspacesContext)
  const setWorkspaces = useContext(SetWorkspacesContext)
  return [workspaces, setWorkspaces]
}
