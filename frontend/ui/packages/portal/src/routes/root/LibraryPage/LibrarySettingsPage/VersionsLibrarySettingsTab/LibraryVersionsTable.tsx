import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Alert,
  Box,
  Link,
  styled,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { type FC, memo, useMemo } from 'react'
import { NavLink } from 'react-router-dom'

import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { CustomTableHeadCell } from '@netcracker/qubership-apihub-ui-shared/components/CustomTableHeadCell'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { LabelsTableCell } from '@netcracker/qubership-apihub-ui-shared/components/LabelsTableCell'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import {
  NAVIGATION_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { UserView } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserView'
import { VersionStatusChip } from '@netcracker/qubership-apihub-ui-shared/components/VersionStatusChip'
import type { VersionStatus } from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'

import { type LibraryVersion, LibraryVersionBuildStatuses, type MavenLibraryDto } from '@portal/entities/libraries'
import { canManageLibraryVersion, NO_VERSION_PERMISSION_HINT } from '../../libraryPermissions'
import { getLibraryVersionPath } from '../../LibraryVersionPage/library-version'
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
  const filteredVersions = useMemo(() =>
    versions.filter(version => {
      const matchesStatus = !status || version.status === status
      const matchesSearch = [version.version, ...version.labels].some(value => {
        return value.toLowerCase().includes(searchValue.toLowerCase())
      })
      return matchesStatus && matchesSearch
    }), [versions, status, searchValue])

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
            <TableContainer sx={{ mt: 1, maxHeight: 'calc(100vh - 265px)', overflowX: 'hidden' }}>
              <Table aria-label="Library versions" data-testid="LibraryVersionsTable">
                <TableHead>
                  <TableRow>
                    {['Version', 'Status', 'Labels', 'Publication Date', 'Published by', 'Previous Version'].map(
                      title => (
                        <TableCell key={title}>
                          <CustomTableHeadCell title={title} />
                        </TableCell>
                      ),
                    )}
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredVersions.map(version => (
                    <TableRow key={version.version} hover>
                      <TableCell data-testid="Cell-version">
                        <TextWithOverflowTooltip tooltipText={version.version}>
                          <Link component={NavLink} to={getLibraryVersionPath(library.libraryId, version.version)}>
                            {version.version}
                          </Link>
                        </TextWithOverflowTooltip>
                      </TableCell>
                      <TableCell data-testid="Cell-version-status">
                        <VersionStatusDetails>
                          <VersionStatusChip status={version.status} />
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
                        </VersionStatusDetails>
                      </TableCell>
                      <TableCell data-testid="Cell-labels">
                        <LabelsTableCell labels={version.labels} />
                      </TableCell>
                      <TableCell data-testid="Cell-publication-date">
                        <FormattedDate value={version.createdAt} />
                      </TableCell>
                      <TableCell data-testid="Cell-published-by">
                        <UserView name={version.createdBy ?? '—'} />
                      </TableCell>
                      <TableCell data-testid="Cell-previous-version">
                        <TextWithOverflowTooltip tooltipText={version.previousVersion ?? ''}>
                          {version.previousVersion ?? '—'}
                        </TextWithOverflowTooltip>
                      </TableCell>
                      <TableCell data-testid="Cell-actions">
                        <VersionHistoryActions
                          version={version}
                          library={library}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          isDeleting={isDeleting}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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

const VersionStatusDetails = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}))
