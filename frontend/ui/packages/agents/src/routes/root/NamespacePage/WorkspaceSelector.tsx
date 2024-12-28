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

import type { FC } from 'react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { Box } from '@mui/material'
import { WORKSPACE_SEARCH_PARAM } from '@netcracker/qubership-apihub-ui-shared/utils/search-params'
import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useSearchParam } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSearchParam'
import { usePackagesLoader } from '@netcracker/qubership-apihub-ui-shared/hooks/packages/usePacakgesLoader'
import { PackageSelector } from '@netcracker/qubership-apihub-ui-shared/components/PackageSelector'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { SERVICES_PAGE } from '../../routes'
import { useInvalidateServices } from './useServices'
import {
  INITIAL_STEP_STATUS,
  useCreateSnapshotStep,
  useDiscoverServicesStep,
  usePromoteVersionStep,
  useValidationResultsStep,
} from './ServicesPage/ServicesPageProvider/ServicesStepsProvider'
import { useRunDiscovery } from './ServicesPage/ServicesPageBody/DiscoverServicesStep/useRunDiscovery'
import {
  useCreateSnapshotPublicationOptions,
} from './ServicesPage/ServicesPageProvider/ServicesPublicationOptionsProvider'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import { useSystemConfigurationContext } from './SystemConfigurationProvider'
import { useShowErrorNotification } from '../BasePage/NotificationHandler'

const DEFAULT_WORKSPACE_ID = ''

export const WorkspaceSelector: FC = memo(() => {
  const [activeTab] = useActiveTabs()
  const errorNotification = useShowErrorNotification()

  const { resetCreateSnapshotPublicationOptions } = useCreateSnapshotPublicationOptions()
  const [runDiscovery] = useRunDiscovery()
  const [, setCreateSnapshotStep] = useCreateSnapshotStep()
  const [, setValidationResultsStep] = useValidationResultsStep()
  const [, setPromoteVersionStep] = usePromoteVersionStep()
  const [, setDiscoverServicesStep] = useDiscoverServicesStep()

  const invalidateServices = useInvalidateServices()

  const setSearchParams = useSetSearchParams()

  const systemConfiguration = useSystemConfigurationContext()
  const workspaceSeachParameter = useSearchParam(WORKSPACE_SEARCH_PARAM)

  const defaultWorkspace = useMemo(() => {
    return systemConfiguration?.defaultWorkspaceId ?? DEFAULT_WORKSPACE_ID
  }, [systemConfiguration])

  const {
    currentPackage: selectedWorkspace,
    packages: workspaces,
    isPackageInitialLoading: isSelectedWorkspaceLoading,
    isPackagesLoading: isWorkspacesLoading,
    setTextFilter: setWorkspaceTextFilter,
    error,
  } = usePackagesLoader(workspaceSeachParameter, WORKSPACE_KIND)

  const setWorkspace = useCallback((workspaceId?: string) => {
    if (workspaceId) {
      setSearchParams({
        [WORKSPACE_SEARCH_PARAM]: workspaceId,
      })

      if (activeTab === SERVICES_PAGE) {
        invalidateServices()
        setDiscoverServicesStep(prevState => ({ ...prevState, active: true }))
        resetCreateSnapshotPublicationOptions()
        setCreateSnapshotStep(prevState => ({ ...prevState, status: INITIAL_STEP_STATUS, active: false }))
        setValidationResultsStep(prevState => ({ ...prevState, status: INITIAL_STEP_STATUS, active: false }))
        setPromoteVersionStep(prevState => ({ ...prevState, status: INITIAL_STEP_STATUS, active: false }))
        runDiscovery(workspaceId)
      }
    }
  }, [activeTab, invalidateServices, resetCreateSnapshotPublicationOptions, runDiscovery, setCreateSnapshotStep, setDiscoverServicesStep, setPromoteVersionStep, setSearchParams, setValidationResultsStep])

  const onSelectWorkspace = useCallback(
    (workspace: Package | null) => setWorkspace(workspace?.key),
    [setWorkspace],
  )

  useEffect(() => {
    if (workspaceSeachParameter) {
      return
    }
    setWorkspace(defaultWorkspace)
  }, [setWorkspace, defaultWorkspace, workspaceSeachParameter])

  useEffect(() => {
    if (error) {
      errorNotification({ message: error.message })
    }
  }, [error, errorNotification])

  return (
    <Box>
      <PackageSelector
        key="workspace-selector"
        placeholder="Portal Workspace"
        value={selectedWorkspace}
        options={workspaces!}
        onInput={setWorkspaceTextFilter!}
        onSelect={onSelectWorkspace!}
        loading={isSelectedWorkspaceLoading || isWorkspacesLoading}
        testId="WorkspaceSelector"
      />
    </Box>
  )
})
