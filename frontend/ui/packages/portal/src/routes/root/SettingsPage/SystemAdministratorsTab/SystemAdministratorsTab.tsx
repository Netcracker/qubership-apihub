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

import { Box, Button } from '@mui/material'
import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback, useState } from 'react'
import { useAddSystemAdmin, useDeleteSystemAdmin, useSystemAdmins } from './useSystemAdmin'
import { useUsers } from '../../useUsers'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import type { SystemAdmin } from '@netcracker/qubership-apihub-ui-shared/types/system-admins'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { AddIcon } from '@netcracker/qubership-apihub-ui-shared/icons/AddIcon'
import { SystemAdministratorsTable } from '@netcracker/qubership-apihub-ui-shared/components/SystemAdministratorsTable'
import { AddSystemAdministratorDialog } from '@netcracker/qubership-apihub-ui-shared/components/AddSystemAdministratorDialog'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog'

export const SystemAdministratorsTab: FC = memo(() => {
  const { showAddSystemAdministratorDialog } = useEventBus()

  const [systemAdmins, isSystemAdminsLoading] = useSystemAdmins()
  const [deleteSystemAdmin, isDeleteSystemAdminLoading] = useDeleteSystemAdmin()
  const [addSystemAdmin, isAddSystemAdminLoading] = useAddSystemAdmin()

  const [userSearch, setUserSearch] = useState<string>('')
  const [usersData, isUsersDataLoading] = useUsers(userSearch)

  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [deleteConfirmationData, setDeleteConfirmationData] = useState<SystemAdmin | undefined>(undefined)

  const handleDeleteAdministrator = useCallback((admin: SystemAdmin) => {
    setConfirmationOpen(true)
    setDeleteConfirmationData(admin)
  }, [])

  const handleSetUserSearch = useCallback((search: string) => {
    setUserSearch(search)
  }, [setUserSearch])

  return <>
    <BodyCard
      header="System Administrators"
      action={
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon/>}
            onClick={showAddSystemAdministratorDialog}
          >
            Add User
          </Button>
        </Box>
      }
      body={
        <SystemAdministratorsTable
          data={systemAdmins ?? []}
          deleteAdministrator={handleDeleteAdministrator}
          isLoading={isSystemAdminsLoading || isAddSystemAdminLoading || isDeleteSystemAdminLoading}
        />
      }
    />
    <AddSystemAdministratorDialog
      users={usersData?.users}
      onConfirm={addSystemAdmin}
      isUsersDataLoading={isUsersDataLoading}
      setUserSearch={handleSetUserSearch}
    />
    <ConfirmationDialog
      open={confirmationOpen}
      message={`Remove ${deleteConfirmationData?.name} from system administrators?`}
      loading={isDeleteSystemAdminLoading}
      confirmButtonName="Delete"
      onConfirm={() => deleteSystemAdmin(deleteConfirmationData!.key)}
      onCancel={() => setConfirmationOpen(false)}
    />
  </>
})
