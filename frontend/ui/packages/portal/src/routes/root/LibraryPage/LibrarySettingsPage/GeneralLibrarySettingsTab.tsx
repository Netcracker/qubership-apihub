import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Alert, Box, Button, Grid, styled, Typography } from '@mui/material'
import { type FC, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'
import {
  CREATE_AND_UPDATE_PACKAGE_PERMISSION,
  DELETE_PACKAGE_PERMISSION,
} from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { PRIVATE_PACKAGE_ROLE } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'

import { TitledValue } from '@portal/components/TitledValue'
import type { MavenLibraryDto } from '@portal/entities/libraries'
import { useShowSuccessNotification } from '../../BasePage/Notification'
import { useDeleteLibrary } from '../../useLibrary'
import { usePackage } from '../../usePackage'
import { hasLibraryPermission } from '../libraryPermissions'
import { GeneralLibrarySettingsEditor } from './GeneralLibrarySettingsEditor'

type GeneralLibrarySettingsTabProps = { library: MavenLibraryDto }

export const GeneralLibrarySettingsTab: FC<GeneralLibrarySettingsTabProps> = ({ library }) => {
  const [isEditing, setEditing] = useState(false)
  const [isDeleteOpen, setDeleteOpen] = useState(false)
  const { deleteLibrary, isLoading, isSuccess, error } = useDeleteLibrary(library.libraryId)
  const [parent] = usePackage({ packageKey: library.parentPackageId ?? '' })
  const navigate = useNavigate()
  const showSuccessNotification = useShowSuccessNotification()

  useEffect(() => {
    if (isSuccess) {
      showSuccessNotification({ message: 'Library has been deleted' })
      navigate('/portal')
    }
  }, [isSuccess, navigate, showSuccessNotification])

  if (isEditing) {
    return (
      <GeneralLibrarySettingsEditor
        library={library}
        parentName={parent?.name}
        onClose={() => setEditing(false)}
      />
    )
  }

  return (
    <>
      <BodyCard
        header="General"
        action={
          <GeneralActions>
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              disabled={!hasLibraryPermission(library, CREATE_AND_UPDATE_PACKAGE_PERMISSION)}
              onClick={() => setEditing(true)}
              data-testid="EditLibraryButton"
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              disabled={!hasLibraryPermission(library, DELETE_PACKAGE_PERMISSION)}
              onClick={() => setDeleteOpen(true)}
              data-testid="DeleteLibraryButton"
            >
              Delete
            </Button>
          </GeneralActions>
        }
        body={
          <>
            {error && <Alert severity="error">{error.message}</Alert>}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TitledValue title="Library Name" value={library.name} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TitledValue title="Alias" value={library.alias} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TitledValue title="GA" value={library.coordinatesKey} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TitledValue title="Parent Group" value={parent?.name ?? library.parentPackageId ?? '—'} />
              </Grid>
              <Grid item xs={12}>
                <TitledValue
                  title="Library Visibility"
                  value={library.defaultRole?.toLowerCase() === PRIVATE_PACKAGE_ROLE
                    ? 'Private'
                    : 'Public (default role - Viewer)'}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description</Typography>
                <Description variant="body2">{library.description || '—'}</Description>
              </Grid>
            </Grid>
          </>
        }
      />
      <ConfirmationDialog
        open={isDeleteOpen}
        title={`Delete Library ${library.name}?`}
        message="The library and all its versions will be deleted."
        loading={isLoading}
        confirmButtonName="Delete"
        onConfirm={deleteLibrary}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
GeneralLibrarySettingsTab.displayName = 'GeneralLibrarySettingsTab'

const GeneralActions = styled(Box)(({ theme }) => ({ display: 'flex', gap: theme.spacing(1) }))
const Description = styled(Typography)({ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' })
