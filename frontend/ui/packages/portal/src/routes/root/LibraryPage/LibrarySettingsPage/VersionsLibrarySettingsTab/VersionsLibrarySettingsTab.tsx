import { Alert } from '@mui/material'
import { type FC, memo, useCallback, useState } from 'react'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import type { LibraryVersion } from '@portal/entities/libraries'
import { useShowErrorNotification, useShowSuccessNotification } from '../../../BasePage/Notification'
import { useDeleteLibraryVersion } from '../../useLibraryVersions'
import type { LibrarySettingsTabProps } from '../library-settings'
import { EditLibraryVersionDialog } from './EditLibraryVersionDialog'
import { LibraryVersionsSettingsControls } from './LibraryVersionsSettingsControls'
import { LibraryVersionsTable } from './LibraryVersionsTable'

export const VersionsLibrarySettingsTab: FC<LibrarySettingsTabProps> = memo<LibrarySettingsTabProps>(({ library }) => {
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<VersionStatusFilter>(ALL_VERSION)
  const [editingVersion, setEditingVersion] = useState<LibraryVersion>()
  const [deletingVersion, setDeletingVersion] = useState<LibraryVersion>()
  const { deleteVersion, isLoading: isDeleting, error: deleteError } = useDeleteLibraryVersion(library.libraryId)
  const showSuccessNotification = useShowSuccessNotification()
  const showErrorNotification = useShowErrorNotification()

  const onChangeSearchValue = useCallback((value: string) => {
    setSearchValue(value)
  }, [])

  // MUI passes null when the selected toggle is clicked again; keep the current filter then
  const onChangeStatusFilter = useCallback((status: VersionStatusFilter | null) => {
    if (status) setSelectedStatus(status)
  }, [])

  const onDeleteLibraryVersion = useCallback((version: LibraryVersion) => {
    setDeletingVersion(version)
  }, [])

  const onEditLibraryVersion = useCallback((version: LibraryVersion) => {
    setEditingVersion(version)
  }, [])

  const confirmDeleteVersion = async (): Promise<void> => {
    if (!deletingVersion) return
    try {
      await deleteVersion(deletingVersion.version)
      setDeletingVersion(undefined)
      showSuccessNotification({ message: 'Library version has been deleted' })
    } catch (error) {
      if (!(error instanceof Error) || error instanceof HttpError) return
      showErrorNotification({ message: error.message })
    }
  }

  return (
    <>
      <BodyCard
        header="Library Versions"
        action={
          <LibraryVersionsSettingsControls
            onSearchValueChange={onChangeSearchValue}
            onStatusFilterChange={onChangeStatusFilter}
            status={selectedStatus}
          />
        }
        body={
          <>
            {deleteError && <Alert severity="error">{deleteError.message}</Alert>}
            <LibraryVersionsTable
              library={library}
              onDelete={onDeleteLibraryVersion}
              onEdit={onEditLibraryVersion}
              searchValue={searchValue}
              status={selectedStatus === ALL_VERSION ? undefined : selectedStatus}
              isDeleting={isDeleting}
            />
          </>
        }
      />
      <ConfirmationDialog
        open={!!deletingVersion}
        title={`Delete version ${deletingVersion?.version ?? ''}?`}
        message="This library version will be deleted."
        loading={isDeleting}
        confirmButtonName="Delete"
        onConfirm={confirmDeleteVersion}
        onCancel={() => setDeletingVersion(undefined)}
      />
      {editingVersion && (
        <EditLibraryVersionDialog
          version={editingVersion}
          library={library}
          onClose={() => setEditingVersion(undefined)}
        />
      )}
    </>
  )
})
VersionsLibrarySettingsTab.displayName = 'VersionsLibrarySettingsTab'

export const ALL_VERSION = 'All'
export type VersionStatusFilter = VersionStatus | typeof ALL_VERSION
