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
import { ActivityHistoryFiltersProvider } from './ActivityHistoryFiltersProvider'
import { RecentOperationsProvider } from '../RecentOperationsProvider'
import { OperationNavigationDataProvider } from '../OperationNavigationDataProvider'
import { BackwardLocationProvider } from '@apihub/routes/BackwardLocationProvider'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Package, Packages } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { PortalPageSettingsProvider } from '@apihub/routes/PortalPageSettingsProvider'
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
