import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Link,
  styled,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  Tooltip,
} from '@mui/material'
import { type FC, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { CustomToggleButtonGroup } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/CustomToggleButtonGroup'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'
import { FormattedDate } from '@netcracker/qubership-apihub-ui-shared/components/FormattedDate'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { UserView } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserView'
import { VersionStatusChip } from '@netcracker/qubership-apihub-ui-shared/components/VersionStatusChip'
import {
  PUBLISH_STATUSES,
  VERSION_STATUSES,
  type VersionStatus,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'

import type { LibraryVersionDto, MavenLibraryDto } from '@portal/entities/libraries'
import { useShowSuccessNotification } from '../../BasePage/Notification'
import { canManageLibraryVersion, NO_VERSION_PERMISSION_HINT } from '../libraryPermissions'
import { getLibraryVersionPath } from '../LibraryVersionPage/library-version'
import { useDeleteLibraryVersion, useLibraryVersions } from '../useLibraryVersions'
import { EditLibraryVersionDialog } from './EditLibraryVersionDialog'

type VersionsLibrarySettingsTabProps = { library: MavenLibraryDto }
type VersionFilter = 'all' | VersionStatus

export const VersionsLibrarySettingsTab: FC<VersionsLibrarySettingsTabProps> = ({ library }) => {
  const { versions, isLoading, error } = useLibraryVersions(library.libraryId)
  const { deleteVersion, isLoading: isDeleting, isSuccess, error: deleteError } = useDeleteLibraryVersion(
    library.libraryId,
  )
  const [status, setStatus] = useState<VersionFilter>('all')
  const [search, setSearch] = useState('')
  const [editingVersion, setEditingVersion] = useState<LibraryVersionDto>()
  const [deletingVersion, setDeletingVersion] = useState<LibraryVersionDto>()
  const showSuccessNotification = useShowSuccessNotification()
  useEffect(() => {
    if (isSuccess) {
      setDeletingVersion(undefined)
      showSuccessNotification({ message: 'Library version has been deleted' })
    }
  }, [isSuccess, showSuccessNotification])

  const filteredVersions = versions.filter(version =>
    (status === 'all' || version.status === status) &&
    [version.version, ...version.labels].some(value => value.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <>
      <BodyCard
        header="Library Versions"
        action={
          <VersionControls>
            <CustomToggleButtonGroup<VersionFilter>
              exclusive
              value={status}
              onClick={value => {
                if (value) setStatus(value)
              }}
            >
              <ToggleButton value="all">All</ToggleButton>
              {VERSION_STATUSES.map(value => (
                <ToggleButton key={value} value={value}>{value === 'draft' ? 'Draft' : 'Release'}</ToggleButton>
              ))}
            </CustomToggleButtonGroup>
            <SearchBar
              placeholder="Search"
              onValueChange={setSearch}
              inputProps={{ 'aria-label': 'Search library versions' }}
            />
          </VersionControls>
        }
        body={
          <>
            {(error || deleteError) && <Alert severity="error">{error?.message ?? deleteError?.message}</Alert>}
            {isLoading ? <LoadingIndicator /> : (
              <TableContainer>
                <Table aria-label="Library versions" data-testid="LibraryVersionsTable">
                  <TableHead>
                    <TableRow>
                      {['Version', 'Status', 'Labels', 'Publication date', 'Published by', 'Previous version'].map(
                        title => <TableCell key={title}>{title}</TableCell>,
                      )}
                      <TableCell>
                        <ActionLabel>Actions</ActionLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredVersions.map(version => (
                      <TableRow key={version.version} hover>
                        <TableCell>
                          <Link component={NavLink} to={getLibraryVersionPath(library.libraryId, version.version)}>
                            {version.version}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <VersionStatusChip status={version.status} label={PUBLISH_STATUSES.get(version.status)} />
                        </TableCell>
                        <TableCell>
                          <Labels>
                            {version.labels.map(label => (
                              <Tooltip key={label} title={label}>
                                <LabelChip size="small" label={label} />
                              </Tooltip>
                            ))}
                          </Labels>
                        </TableCell>
                        <TableCell>
                          <FormattedDate value={version.createdAt} />
                        </TableCell>
                        <TableCell>
                          <UserView name={version.createdBy ?? '—'} />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={version.previousVersion ?? ''}>
                            <PreviousVersion>{version.previousVersion ?? '—'}</PreviousVersion>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip
                            title={canManageLibraryVersion(library, version.status) ? '' : NO_VERSION_PERMISSION_HINT}
                          >
                            <VersionActions>
                              <IconButton
                                aria-label={`Edit version ${version.version}`}
                                onClick={() => setEditingVersion(version)}
                                disabled={!canManageLibraryVersion(library, version.status)}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                aria-label={`Delete version ${version.version}`}
                                onClick={() => setDeletingVersion(version)}
                                disabled={isDeleting || !canManageLibraryVersion(library, version.status)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </VersionActions>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!filteredVersions.length && !error && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          {versions.length
                            ? 'No versions match your search.'
                            : 'No library versions have been published.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        }
      />
      {editingVersion && (
        <EditLibraryVersionDialog
          version={editingVersion}
          library={library}
          onClose={() => setEditingVersion(undefined)}
        />
      )}
      <ConfirmationDialog
        open={!!deletingVersion}
        title={`Delete version ${deletingVersion?.version ?? ''}?`}
        message="This library version will be deleted."
        loading={isDeleting}
        confirmButtonName="Delete"
        onConfirm={() => {
          if (deletingVersion) deleteVersion(deletingVersion.version)
        }}
        onCancel={() => setDeletingVersion(undefined)}
      />
    </>
  )
}
VersionsLibrarySettingsTab.displayName = 'VersionsLibrarySettingsTab'

const VersionControls = styled(Box)(({ theme }) => ({ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }))
const VersionActions = styled(Box)({ display: 'flex' })
const Labels = styled(Box)(({ theme }) => ({ display: 'flex', flexWrap: 'wrap', gap: theme.spacing(0.5) }))
const LabelChip = styled(Chip)(({ theme }) => ({ maxWidth: theme.spacing(20) }))
const PreviousVersion = styled(Box)(({ theme }) => ({
  maxWidth: theme.spacing(25),
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
}))
const ActionLabel = styled(Box)({
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
})
