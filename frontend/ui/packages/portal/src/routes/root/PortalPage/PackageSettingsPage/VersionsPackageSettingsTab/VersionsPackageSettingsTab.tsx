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
import React, { memo, useCallback, useState } from 'react'
import type { PackageSettingsTabProps } from '../package-settings'
import { PackageVersionsTable } from './PackageVersionsTable'
import { PackageVersionsSettingsControls } from './PackageVersionsSettingsControls'
import { EditPackageVersionDialog } from './EditPackageVersionDialog'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog'
import { useDeletePackageVersion } from '@apihub/routes/root/usePackageVersions'

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
