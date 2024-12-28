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
import React, { memo, useCallback, useMemo } from 'react'
import { Box, Button } from '@mui/material'
import ListOutlinedIcon from '@mui/icons-material/ListOutlined'
import { useTextSearchParam } from '../useTextSearchParam'
import type { TableMode } from '../useTableMode'
import { FLAT_TABLE_MODE, TREE_TABLE_MODE, useTableMode } from '../useTableMode'
import { usePackage } from '../usePackage'
import { CreatePackageDialog } from './CreatePackageDialog'
import { useIsPrivateMainPage, useIsWorkspacesPage } from './useMainPage'
import { usePrivateWorkspace } from './MainPageSubpages/PrivatePage/usePrivateWorkspaceUser'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useSuperAdminCheck } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/useSuperAdminCheck'
import { useSetSearchParams } from '@netcracker/qubership-apihub-ui-shared/hooks/searchparams/useSetSearchParams'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { DASHBOARD_KIND, GROUP_KIND, PACKAGE_KIND, WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { CREATE_AND_UPDATE_PACKAGE_PERMISSION } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { PackageSettingsButton } from '@apihub/components/PackageSettingsButton'
import { DropdownButton } from '@apihub/components/DropdownButton'
import { SelectorWithIcons } from '@netcracker/qubership-apihub-ui-shared/components/SelectorWithIcons'
import { TreeIcon } from '@netcracker/qubership-apihub-ui-shared/icons/TreeIcon'

type PackagesFiltererProps = Readonly<{
  hideViewSelector: boolean
  hideSearchBar: boolean
  rootPackageKey?: Key
}>

export const PackagesFilterer: FC<PackagesFiltererProps> = memo<PackagesFiltererProps>(({
  rootPackageKey,
  hideViewSelector = false,
  hideSearchBar = false,
}) => {
  const isSuperAdmin = useSuperAdminCheck()
  const isWorkspacesPage = useIsWorkspacesPage()
  const isPrivatePage = useIsPrivateMainPage()
  const setSearchParams = useSetSearchParams()
  const [textFilter] = useTextSearchParam()

  const [packageObject] = usePackage({ packageKey: rootPackageKey })
  const { showCreatePackageDialog } = useEventBus()
  const isWorkspace = packageObject?.kind === WORKSPACE_KIND
  const isGroup = packageObject?.kind === GROUP_KIND

  const [workspaceId] = usePrivateWorkspace()
  const isPrivateWorkspace = useMemo(() =>
      workspaceId === packageObject?.key || isPrivatePage,
    [isPrivatePage, packageObject?.key, workspaceId],
  )

  const showCreateWorkspaceDialogHandle = useCallback(() => showCreatePackageDialog({
    kind: WORKSPACE_KIND,
    parentPackageKey: rootPackageKey!,
  }), [rootPackageKey, showCreatePackageDialog])
  const showCreateGroupDialogHandle = useCallback(() => showCreatePackageDialog({
    kind: GROUP_KIND,
    parentPackageKey: rootPackageKey!,
  }), [rootPackageKey, showCreatePackageDialog])
  const showCreatePackageDialogHandle = useCallback(() => showCreatePackageDialog({
    kind: PACKAGE_KIND,
    parentPackageKey: rootPackageKey!,
  }), [rootPackageKey, showCreatePackageDialog])
  const showCreateDashboardDialogHandle = useCallback(() => showCreatePackageDialog({
    kind: DASHBOARD_KIND,
    parentPackageKey: rootPackageKey!,
  }), [rootPackageKey, showCreatePackageDialog])

  const CREATE_BUTTON_OPTIONS = [
    { key: GROUP_KIND, label: 'Group', method: showCreateGroupDialogHandle, testId: 'GroupMenuItem' },
    { key: PACKAGE_KIND, label: 'Package', method: showCreatePackageDialogHandle, testId: 'PackageMenuItem' },
    { key: DASHBOARD_KIND, label: 'Dashboard', method: showCreateDashboardDialogHandle, testId: 'DashboardMenuItem' },
  ]

  const hasCreatePackagePermission = useMemo(
    () => !!packageObject?.permissions?.includes(CREATE_AND_UPDATE_PACKAGE_PERMISSION),
    [packageObject],
  )

  return (
    <>
      {!hideSearchBar && <SearchBar
        placeholder="Search package"
        value={textFilter}
        onValueChange={text => {
          if (!text) {
            setSearchParams({ text: text }, { replace: true })
          } else {
            setSearchParams({ text: text, view: FLAT_TABLE_MODE }, { replace: true })
          }
        }}
        data-testid="SearchPackages"
      />
      }
      {!hideViewSelector && <TableViewSelector/>}
      {(isWorkspace || isGroup) && (!isPrivateWorkspace || isSuperAdmin) && rootPackageKey && (
        <Box>
          <PackageSettingsButton packageKey={rootPackageKey} packageKind={packageObject?.kind}/>
        </Box>
      )}
      {rootPackageKey && (
        <DropdownButton
          disabled={!hasCreatePackagePermission}
          disableHint={hasCreatePackagePermission}
          hint="You do not have permission to create packages"
          label="Create"
          options={CREATE_BUTTON_OPTIONS}
          testId="CreatePackageMenuButton"
        />
      )}
      {isWorkspacesPage && isSuperAdmin && (
        <Button variant="contained" onClick={showCreateWorkspaceDialogHandle} data-testid="CreateWorkspaceButton">
          Create
        </Button>
      )}
      <CreatePackageDialog/>
    </>
  )
})

const TableViewSelector: FC = memo(() => {
  const [viewMode, setViewMode] = useTableMode(TREE_TABLE_MODE)
  const setSearchParams = useSetSearchParams()

  return (
    <SelectorWithIcons<TableMode>
      mode={viewMode}
      firstIcon={<TreeIcon/>}
      firstValue={TREE_TABLE_MODE}
      firstTooltip="Tree view"
      secondIcon={<ListOutlinedIcon/>}
      secondValue={FLAT_TABLE_MODE}
      secondTooltip="List view"
      firstTestId="TreeTableModeButton"
      secondTestId="FlatTableModeButton"
      onChange={(_, newAlignment) => {
        if (newAlignment) {
          setViewMode(newAlignment)
          newAlignment === TREE_TABLE_MODE
            ? setSearchParams({ view: '' }, { replace: true })
            : setSearchParams({ view: newAlignment }, { replace: true })
        }
      }}
    />
  )
})
