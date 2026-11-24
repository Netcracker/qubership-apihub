import { Alert, Box, Grid, styled, Typography } from '@mui/material'
import { type FC, memo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { ButtonWithHint } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/ButtonWithHint'
import { ConfirmationDialog } from '@netcracker/qubership-apihub-ui-shared/components/ConfirmationDialog/ConfirmationDialog'
import {
  CREATE_AND_UPDATE_PACKAGE_PERMISSION,
  DELETE_PACKAGE_PERMISSION,
} from '@netcracker/qubership-apihub-ui-shared/entities/package-permissions'
import { PRIVATE_PACKAGE_ROLE } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { DeleteIcon } from '@netcracker/qubership-apihub-ui-shared/icons/DeleteIcon'

import { TitledValue } from '@portal/components/TitledValue'
import { useShowSuccessNotification } from '../../../BasePage/Notification'
import { useDeleteLibrary } from '../../../useLibrary'
import { usePackage } from '../../../usePackage'
import { hasLibraryPermission } from '../../libraryPermissions'
import type { LibrarySettingsTabProps } from '../library-settings'
import {
  useEditableGeneralLibrarySettingsTabContent,
  useSetEditableGeneralLibrarySettingsTabContent,
} from './GeneralLibrarySettingsTab'

export const GeneralLibrarySettingsTabViewer: FC<LibrarySettingsTabProps> = memo<LibrarySettingsTabProps>(
  ({ library }) => {
    const editable = useEditableGeneralLibrarySettingsTabContent()
    const setEditable = useSetEditableGeneralLibrarySettingsTabContent()
    const [parent] = usePackage({ packageKey: library.parentPackageId ?? '' })
    const [isDeleteOpen, setDeleteOpen] = useState(false)
    const { deleteLibrary, isLoading, isSuccess, error } = useDeleteLibrary(library.libraryId)
    const navigate = useNavigate()
    const showSuccessNotification = useShowSuccessNotification()

    useEffect(() => {
      if (isSuccess) {
        showSuccessNotification({ message: 'Library has been deleted' })
        navigate('/portal')
      }
    }, [isSuccess, navigate, showSuccessNotification])

    if (editable) return null

    return (
      <>
        <BodyCard
          header="General"
          action={
            <GeneralActions>
              <ButtonWithHint
                variant="outlined"
                title="Edit"
                disabled={isLoading || !hasLibraryPermission(library, CREATE_AND_UPDATE_PACKAGE_PERMISSION)}
                disableHint={hasLibraryPermission(library, CREATE_AND_UPDATE_PACKAGE_PERMISSION)}
                hint="You do not have permission to edit the library"
                onClick={() => setEditable(true)}
                data-testid="EditButton"
              />
              <ButtonWithHint
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                title="Delete"
                disabled={!hasLibraryPermission(library, DELETE_PACKAGE_PERMISSION)}
                disableHint={hasLibraryPermission(library, DELETE_PACKAGE_PERMISSION)}
                hint="You do not have permission to delete the library"
                onClick={() => setDeleteOpen(true)}
                data-testid="DeleteButton"
              />
            </GeneralActions>
          }
          body={
            <>
              {error && <Alert severity="error">{error.message}</Alert>}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TitledValue title="Library Name" value={library.name} data-testid="LibraryNameContent" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TitledValue title="Alias" value={library.alias} data-testid="AliasContent" />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TitledValue
                    title="Maven GroupId"
                    value={library.coordinates.groupId}
                    data-testid="MavenGroupIdContent"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TitledValue
                    title="Parent Group"
                    value={parent?.name ?? library.parentPackageId ?? '—'}
                    data-testid="ParentGroupContent"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TitledValue
                    title="Maven ArtifactId"
                    value={library.coordinates.artifactId}
                    data-testid="MavenArtifactIdContent"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TitledValue
                    title="Library Visibility"
                    value={library.defaultRole?.toLowerCase() === PRIVATE_PACKAGE_ROLE
                      ? 'Private'
                      : 'Public (default role - Viewer)'}
                    data-testid="PackageVisibilityContent"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Description</Typography>
                  <Description variant="body2" data-testid="DescriptionContent">
                    {library.description || '—'}
                  </Description>
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
  },
)
GeneralLibrarySettingsTabViewer.displayName = 'GeneralLibrarySettingsTabViewer'

const GeneralActions = styled(Box)(({ theme }) => ({ display: 'flex', gap: theme.spacing(1) }))
const Description = styled(Typography)({ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' })
