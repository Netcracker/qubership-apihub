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
import { DISCOVER_SERVICES_STEP_KEY } from './ServicesPage/ServicesPageProvider/servicesSteps'
import { useResetStepsAfter } from './ServicesPage/ServicesPageProvider/ServicesStepsProvider'
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
  const resetStepsAfter = useResetStepsAfter()

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

      // Only the buttons of Discover Services start a discovery, so Step 1 shows what is stored for the workspace
      if (activeTab === SERVICES_PAGE) {
        invalidateServices()
        resetCreateSnapshotPublicationOptions()
        resetStepsAfter(DISCOVER_SERVICES_STEP_KEY)
      }
    }
  }, [activeTab, invalidateServices, resetCreateSnapshotPublicationOptions, resetStepsAfter, setSearchParams])

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
        data-testid="WorkspaceSelector"
      />
    </Box>
  )
})
