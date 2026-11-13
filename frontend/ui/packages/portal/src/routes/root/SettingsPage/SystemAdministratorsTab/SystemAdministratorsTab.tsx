import { Box, Button } from '@mui/material'
import type { FC } from 'react'
import * as React from 'react'
import { memo, useCallback, useState } from 'react'
import { useAddSystemAdmin, useDeleteSystemAdmin, useSystemAdmins } from './useSystemAdmin'
import { useUsers } from '../../useUsers'
import { useEventBus } from '@portal/routes/EventBusProvider'
import type { SystemAdmin } from '@netcracker/qubership-apihub-ui-shared/types/system-admins'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { AddIcon } from '@netcracker/qubership-apihub-ui-shared/icons/AddIcon'
import { SystemAdministratorsTable } from '@netcracker/qubership-apihub-ui-shared/components/SystemAdministratorsTable'
import {
  AddSystemAdministratorDialog,
} from '@netcracker/qubership-apihub-ui-shared/components/AddSystemAdministratorDialog'
import {
  ConfirmationDialog,
} from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'

export const SystemAdministratorsTab: FC = memo(() => {
  const { showAddSystemAdministratorDialog } = useEventBus()

  const [systemAdmins, isSystemAdminsLoading] = useSystemAdmins()
  const [deleteSystemAdmin, isDeleteSystemAdminLoading] = useDeleteSystemAdmin()
  const [addSystemAdmin, isAddSystemAdminLoading] = useAddSystemAdmin()

  const [userSearch, setUserSearch] = useState<string>('')
  const [usersData, isUsersDataLoading] = useUsers({ searchValue: userSearch })

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
