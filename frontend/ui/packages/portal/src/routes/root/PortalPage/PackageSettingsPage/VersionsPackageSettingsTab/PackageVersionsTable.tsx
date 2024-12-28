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

import { Box } from '@mui/material'
import type { FC } from 'react'
import { memo, useCallback, useMemo, useRef } from 'react'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { VersionHistoryTable } from '../../VersionHistoryTable'
import type { PackagePermissions } from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { VERSION_STATUS_MANAGE_PERMISSIONS } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { handleVersionsRevision } from '@netcracker/qubership-apihub-ui-shared/utils/versions'
import { useIntersectionObserver } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useIntersectionObserver'
import {
  NAVIGATION_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import { usePackageVersions } from '@netcracker/qubership-apihub-ui-shared/hooks/versions/usePackageVersions'

export type PackageVersionsTableProps = Readonly<{
  packageKey: string
  permissions?: PackagePermissions
  onDelete: (version: PackageVersion) => void
  onEdit: (version: PackageVersion) => void
  searchValue: string
  status: VersionStatus | undefined
}>
export const PackageVersionsTable: FC<PackageVersionsTableProps> = memo<PackageVersionsTableProps>((props) => {
  const {
    packageKey, permissions, status,
    onDelete, onEdit, searchValue,
  } = props

  const [versions, isLoading, fetchNextPage, isNextPageFetching, hasNextPage] = usePackageVersions({
    packageKey: packageKey,
    status: status,
    textFilter: searchValue,
  })

  const filteredVersions = useMemo(() => (
    handleVersionsRevision(versions)
  ), [versions])

  const ref = useRef<HTMLDivElement>(null)
  useIntersectionObserver(ref, isNextPageFetching, hasNextPage, fetchNextPage)

  return (
    <Placeholder
      invisible={isNotEmpty(filteredVersions) || isLoading}
      area={NAVIGATION_PLACEHOLDER_AREA}
      message={searchValue ? NO_SEARCH_RESULTS : 'No versions to display'}
    >
      <VersionHistoryTable
        value={filteredVersions}
        packageKey={packageKey}
        actionsCell={(item) => <VersionHistoryActions
          version={item as PackageVersion}
          permissions={permissions}
          onEdit={onEdit}
          onDelete={onDelete}
        />}
        hasNextPage={hasNextPage}
        refObject={ref}
        isLoading={isLoading}
      />
    </Placeholder>
  )
})

type VersionHistoryActionsProps = {
  version: PackageVersion
  permissions?: PackagePermissions
  onEdit: (version: PackageVersion) => void
  onDelete: (version: PackageVersion) => void
}
export const VersionHistoryActions: FC<VersionHistoryActionsProps> = memo<VersionHistoryActionsProps>((props) => {
  const { version, permissions, onEdit, onDelete } = props
  const checkVersionPermission = useCallback(
    (version: PackageVersion) => !!permissions?.includes(VERSION_STATUS_MANAGE_PERMISSIONS[version.status]),
    [permissions],
  )

  const actionsDisabled = !checkVersionPermission(version!)

  return (
    <Box display="flex" justifyContent="flex-end" gap={1}>
      {/* TODO 06.06.23 // Sync all icons implementation and these coloring */}
      <ButtonWithHint
        area-label="edit"
        disabled={actionsDisabled}
        disableHint={false}
        hint={actionsDisabled ? 'You do not have permission to edit the version' : 'Edit'}
        size="small"
        sx={{ visibility: 'hidden', height: '20px' }}
        className="hoverable"
        startIcon={<EditOutlinedIcon sx={{ color: actionsDisabled ? '#00000026' : '#626D82' }}/>}
        onClick={() => onEdit(version)}
        testId="EditButton"
      />
      <ButtonWithHint
        area-label="delete"
        disabled={actionsDisabled}
        disableHint={false}
        hint={actionsDisabled ? 'You do not have permission to delete the version' : 'Delete'}
        size="small"
        sx={{ visibility: 'hidden', height: '20px' }}
        className="hoverable"
        startIcon={<DeleteIcon color="#626D82"/>}
        onClick={() => onDelete(version)}
        testId="DeleteButton"
      />
    </Box>
  )
})

