import { LoadingButton } from '@mui/lab'
import { Alert, Box, Button, FormControlLabel, Grid, styled, Switch, TextField, Typography } from '@mui/material'
import { type FC, memo, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { PRIVATE_PACKAGE_ROLE, PUBLIC_PACKAGE_ROLE } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { filterChangedFormFields } from '@netcracker/qubership-apihub-ui-shared/utils/react-hook-form'

import { TitledValue } from '@portal/components/TitledValue'
import type { MavenLibraryUpdateDto } from '@portal/entities/libraries'
import { useEventBus } from '@portal/routes/EventBusProvider'
import { useUpdateLibrary } from '../../../useLibrary'
import { usePackage } from '../../../usePackage'
import type { LibrarySettingsTabProps } from '../library-settings'
import {
  useEditableGeneralLibrarySettingsTabContent,
  useSetEditableGeneralLibrarySettingsTabContent,
} from './GeneralLibrarySettingsTab'

export const GeneralLibrarySettingsTabEditor: FC<LibrarySettingsTabProps> = memo<LibrarySettingsTabProps>(
  ({ library }) => {
    const editable = useEditableGeneralLibrarySettingsTabContent()
    const setEditable = useSetEditableGeneralLibrarySettingsTabContent()
    const [parent] = usePackage({ packageKey: library.parentPackageId ?? '' })
    const { control, handleSubmit, reset, formState: { isDirty, dirtyFields } } = useForm<
      Required<MavenLibraryUpdateDto>
    >({
      defaultValues: {
        name: library.name,
        description: library.description ?? '',
        defaultRole: library.defaultRole?.toLowerCase() === PRIVATE_PACKAGE_ROLE
          ? PRIVATE_PACKAGE_ROLE
          : PUBLIC_PACKAGE_ROLE,
      },
    })
    const { updateLibrary, isLoading, isSuccess, error } = useUpdateLibrary(library.libraryId)
    const { showSuccessNotification } = useEventBus()

    useEffect(() => {
      if (isSuccess) {
        showSuccessNotification({ message: 'Library has been updated' })
        setEditable(false)
      }
    }, [isSuccess, setEditable, showSuccessNotification])

    useEffect(() => {
      reset({
        name: library.name,
        description: library.description ?? '',
        defaultRole: library.defaultRole?.toLowerCase() === PRIVATE_PACKAGE_ROLE
          ? PRIVATE_PACKAGE_ROLE
          : PUBLIC_PACKAGE_ROLE,
      })
    }, [library.name, library.description, library.defaultRole, reset])

    if (!editable) return null

    return (
      <BodyCard
        header="General"
        action={
          <EditorActions>
            <Button
              variant="outlined"
              disabled={isLoading}
              onClick={() => {
                reset()
                setEditable(false)
              }}
              data-testid="CancelButton"
            >
              Cancel
            </Button>
            <LoadingButton
              variant="contained"
              type="submit"
              form="library-settings-form"
              loading={isLoading}
              disabled={!isDirty}
              data-testid="SaveButton"
            >
              Save
            </LoadingButton>
          </EditorActions>
        }
        body={
          <Box
            component="form"
            id="library-settings-form"
            onSubmit={handleSubmit(value => {
              updateLibrary(filterChangedFormFields({ ...value, name: value.name.trim() }, dirtyFields))
            })}
          >
            {error && <Alert severity="error">{error.message}</Alert>}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{
                    required: 'Enter a library name',
                    validate: value => !!value.trim() || 'Enter a library name',
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      required
                      label="Library Name"
                      disabled={isLoading}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      data-testid="LibraryNameTextField"
                    />
                  )}
                />
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
                <Typography noWrap variant="subtitle2">Library Visibility</Typography>
                <Controller
                  name="defaultRole"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      label="Private"
                      sx={{ ml: 0.25 }}
                      control={
                        <Switch
                          sx={{ mr: 1 }}
                          color="primary"
                          checked={field.value === PRIVATE_PACKAGE_ROLE}
                          disabled={isLoading}
                          data-testid="PackageVisibilitySwitch"
                          onChange={(_, checked) =>
                            field.onChange(checked ? PRIVATE_PACKAGE_ROLE : PUBLIC_PACKAGE_ROLE)}
                        />
                      }
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      multiline
                      minRows={6}
                      label="Description"
                      disabled={isLoading}
                      data-testid="DescriptionTextField"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Box>
        }
      />
    )
  },
)
GeneralLibrarySettingsTabEditor.displayName = 'GeneralLibrarySettingsTabEditor'

const EditorActions = styled(Box)(({ theme }) => ({ display: 'flex', gap: theme.spacing(1) }))
