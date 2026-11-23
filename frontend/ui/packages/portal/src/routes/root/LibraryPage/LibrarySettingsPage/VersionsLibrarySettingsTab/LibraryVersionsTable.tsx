import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Alert, Box, Tooltip, Typography } from '@mui/material'
import { type FC, memo, useCallback, useMemo, useRef } from 'react'

import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  NAVIGATION_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { Revision } from '@netcracker/qubership-apihub-ui-shared/entities/revisions'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import type { PackageVersion } from '@netcracker/qubership-apihub-ui-shared/entities/versions'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

import { type LibraryVersion, LibraryVersionBuildStatuses, type MavenLibraryDto } from '@portal/entities/libraries'
import { VersionHistoryTable } from '@portal/routes/root/PortalPage/VersionHistoryTable'
import { canManageLibraryVersion, NO_VERSION_PERMISSION_HINT } from '../../libraryPermissions'
import { getLibraryVersionPath } from '../../LibraryVersionPage/libraryVersion'
import { toLibraryVersionOption } from '../../LibraryVersionPage/libraryVersionOptions'
import { isLibraryVersionBuilding, useLibraryVersions } from '../../useLibraryVersions'

type LibraryVersionsTableProps = Readonly<{
  library: MavenLibraryDto
  onDelete: (version: LibraryVersion) => void
  onEdit: (version: LibraryVersion) => void
  searchValue: string
  status: VersionStatus | undefined
  isDeleting: boolean
}>

export const LibraryVersionsTable: FC<LibraryVersionsTableProps> = memo<LibraryVersionsTableProps>(({
  library,
  onDelete,
  onEdit,
  searchValue,
  status,
  isDeleting,
}) => {
  const { versions, isLoading, error } = useLibraryVersions(library.libraryId)
  const ref = useRef<HTMLDivElement>(null)
  const filteredVersions = useMemo(() =>
    versions.filter(version => {
      const matchesStatus = !status || version.status === status
      const matchesSearch = [version.version, ...version.labels].some(value => {
        return value.toLowerCase().includes(searchValue.toLowerCase())
      })
      return matchesStatus && matchesSearch
    }), [versions, status, searchValue])

  const rows = useMemo(() => filteredVersions.map(toLibraryVersionOption), [filteredVersions])
  const versionsByKey = useMemo(
    () => new Map<Key, LibraryVersion>(versions.map(version => [version.version, version])),
    [versions],
  )

  const getVersionPath = useCallback(
    (version: Key) => getLibraryVersionPath(library.libraryId, version),
    [library.libraryId],
  )

  const statusAdornment = useCallback((versionKey: Key) => {
    const version = versionsByKey.get(versionKey)
    if (!version) return null

    return (
      <>
        {isLibraryVersionBuilding(version) && (
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            data-testid="LibraryVersionBuildingLabel"
          >
            Building…
          </Typography>
        )}
        {version.metadata?.buildStatus === LibraryVersionBuildStatuses.ERROR && (
          <Tooltip title={version.metadata.buildError ?? ''}>
            <Typography
              component="span"
              variant="caption"
              color="error"
              data-testid="LibraryVersionBuildFailedLabel"
            >
              Build failed
            </Typography>
          </Tooltip>
        )}
      </>
    )
  }, [versionsByKey])

  const actionsCell = useCallback((item: PackageVersion | Revision) => {
    const version = versionsByKey.get('key' in item ? item.key : item.version)
    if (!version) return null

    return (
      <VersionHistoryActions
        version={version}
        library={library}
        onEdit={onEdit}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />
    )
  }, [versionsByKey, library, isDeleting, onEdit, onDelete])

  return (
    <>
      {error && <Alert severity="error">{error.message}</Alert>}
      <Placeholder
        invisible={isNotEmpty(filteredVersions) || isLoading || !!error}
        area={NAVIGATION_PLACEHOLDER_AREA}
        message={searchValue ? NO_SEARCH_RESULTS : 'No versions to display'}
      >
        {isLoading
          ? <LoadingIndicator />
          : (
            <VersionHistoryTable
              value={rows}
              packageKey={library.libraryId}
              refObject={ref}
              hasNextPage={false}
              isLoading={false}
              getVersionPath={getVersionPath}
              statusAdornment={statusAdornment}
              actionsCell={actionsCell}
            />
          )}
      </Placeholder>
    </>
  )
})
LibraryVersionsTable.displayName = 'LibraryVersionsTable'

type VersionHistoryActionsProps = Readonly<{
  version: LibraryVersion
  library: MavenLibraryDto
  onEdit: (version: LibraryVersion) => void
  onDelete: (version: LibraryVersion) => void
  isDeleting: boolean
}>

const VersionHistoryActions: FC<VersionHistoryActionsProps> = memo<VersionHistoryActionsProps>(({
  version,
  library,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const actionsDisabled = !canManageLibraryVersion(library, version.status)

  return (
    <Box display="flex" justifyContent="flex-end" gap={1}>
      <ButtonWithHint
        aria-label={`Edit version ${version.version}`}
        disabled={actionsDisabled}
        disableHint={false}
        hint={actionsDisabled ? NO_VERSION_PERMISSION_HINT : 'Edit'}
        size="small"
        sx={{ visibility: 'hidden', height: '20px', color: 'text.secondary' }}
        className="hoverable"
        startIcon={<EditOutlinedIcon sx={{ color: actionsDisabled ? 'action.disabled' : 'text.secondary' }} />}
        onClick={() => onEdit(version)}
        data-testid="EditButton"
      />
      <ButtonWithHint
        aria-label={`Delete version ${version.version}`}
        disabled={isDeleting || actionsDisabled}
        disableHint={false}
        hint={actionsDisabled ? NO_VERSION_PERMISSION_HINT : 'Delete'}
        size="small"
        sx={{ visibility: 'hidden', height: '20px', color: 'text.secondary' }}
        className="hoverable"
        startIcon={<DeleteIcon color="currentColor" />}
        onClick={() => onDelete(version)}
        data-testid="DeleteButton"
      />
    </Box>
  )
})
VersionHistoryActions.displayName = 'VersionHistoryActions'
