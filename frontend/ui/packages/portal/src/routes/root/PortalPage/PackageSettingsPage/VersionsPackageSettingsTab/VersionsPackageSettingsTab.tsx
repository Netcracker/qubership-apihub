import type { FC } from 'react'
import React, { memo, useCallback, useState } from 'react'
import type { PackageSettingsTabProps } from '../package-settings'
import { PackageVersionsTable } from './PackageVersionsTable'
import { PackageVersionsSettingsControls } from './PackageVersionsSettingsControls'
import { EditPackageVersionDialog } from './EditPackageVersionDialog'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { useEventBus } from '@portal/routes/EventBusProvider'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import {
  ConfirmationDialog,
} from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'
import { useDeletePackageVersion } from '@portal/routes/root/usePackageVersions'

export const VersionsPackageSettingsTab: FC<PackageSettingsTabProps> = memo<PackageSettingsTabProps>(({ packageObject }) => {
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false)
  const [versionToDelete, setVersionToDelete] = useState<string | undefined>(undefined)
  const [searchValue, setSearchValue] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<VersionStatusFilter>(ALL_VERSION)

  const [deleteVersion, isDeleteLoading] = useDeletePackageVersion()

  const { showEditPackageVersionDialog } = useEventBus()

  const onDeletePackageVersion = useCallback((version: PackageVersion) => {
    setVersionToDelete(version.key)
    setDeleteConfirmationOpen(true)
  }, [])

  const onEditPackageVersion = useCallback((version: PackageVersion) => {
    showEditPackageVersionDialog({
      packageKey: packageObject.key!,
      permissions: packageObject.permissions!,
      releaseVersionPattern: packageObject.releaseVersionPattern,
      version: version?.key,
      status: version?.status,
      versionLabels: version?.versionLabels,
      hasErrors: version?.hasErrors,
      changelogHasErrors: version?.changelogHasErrors,
      apiProcessorVersion: version?.apiProcessorVersion,
      kind: packageObject.kind,
    })
  }, [packageObject, showEditPackageVersionDialog])

  const onChangeSearchValue = useCallback((value: string) => {
    setSearchValue(value)
  }, [])

  const onChangeStatusFilter = useCallback((status: VersionStatusFilter) => {
    setSelectedStatus(status)
  }, [])

  return (
    <>
      <BodyCard
        header="Versions"
        action={
          <PackageVersionsSettingsControls
            onSearchValueChange={onChangeSearchValue}
            onStatusFilterChange={onChangeStatusFilter}
            status={selectedStatus}
          />
        }
        body={
          <PackageVersionsTable
            packageKey={packageObject.key}
            kind={packageObject.kind}
            permissions={packageObject.permissions}
            onDelete={onDeletePackageVersion}
            onEdit={onEditPackageVersion}
            searchValue={searchValue}
            status={selectedStatus === ALL_VERSION ? undefined : selectedStatus}
          />
        }
      />
      <ConfirmationDialog
        open={deleteConfirmationOpen}
        title="Delete version"
        message={`Are you sure, you want to delete version ${versionToDelete}?`}
        loading={isDeleteLoading}
        confirmButtonName="Yes, delete"
        onConfirm={() => deleteVersion({ packageKey: packageObject.key!, versionId: versionToDelete! })}
        onCancel={() => setDeleteConfirmationOpen(false)}
      />
      <EditPackageVersionDialog/>
    </>
  )
})

export const ALL_VERSION = 'All'
export type VersionStatusFilter = VersionStatus | typeof ALL_VERSION
