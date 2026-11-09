import { LoadingButton } from '@mui/lab'
import { Alert, Box, Button, FormControlLabel, Grid, styled, Switch, TextField, Typography } from '@mui/material'
import { type FC, useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'
import { PRIVATE_PACKAGE_ROLE, PUBLIC_PACKAGE_ROLE } from '@netcracker/qubership-apihub-ui-shared/entities/packages'

import type { MavenLibraryDto, MavenLibraryUpdateDto } from '@portal/entities/libraries'
import { useShowSuccessNotification } from '../../BasePage/Notification'
import { useUpdateLibrary } from '../../useLibrary'

type GeneralLibrarySettingsEditorProps = {
  library: MavenLibraryDto
  parentName?: string
  onClose: () => void
}

export const GeneralLibrarySettingsEditor: FC<GeneralLibrarySettingsEditorProps> = (
  { library, parentName, onClose },
) => {
  const { control, handleSubmit, formState: { isDirty } } = useForm<MavenLibraryUpdateDto>({
    defaultValues: {
      name: library.name,
      description: library.description ?? '',
      defaultRole: library.defaultRole?.toLowerCase() === PRIVATE_PACKAGE_ROLE
        ? PRIVATE_PACKAGE_ROLE
        : PUBLIC_PACKAGE_ROLE,
    },
  })
  const { updateLibrary, isLoading, isSuccess, error } = useUpdateLibrary(library.libraryId)
  const showSuccessNotification = useShowSuccessNotification()

  useEffect(() => {
    if (isSuccess) {
      showSuccessNotification({ message: 'Library has been updated' })
      onClose()
    }
  }, [isSuccess, onClose, showSuccessNotification])

  return (
    <BodyCard
      header="General"
      action={
        <EditorActions>
          <Button variant="outlined" disabled={isLoading} onClick={onClose}>Cancel</Button>
          <LoadingButton
            variant="contained"
            type="submit"
            form="library-settings-form"
            loading={isLoading}
            disabled={!isDirty}
            data-testid="SaveLibraryButton"
          >
            Save
          </LoadingButton>
        </EditorActions>
      }
      body={
        <Box
          component="form"
          id="library-settings-form"
          onSubmit={handleSubmit(value => updateLibrary({ ...value, name: value.name.trim() }))}
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
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth disabled label="Alias" value={library.alias} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth disabled required label="Maven GroupId" value={library.coordinates.groupId} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth disabled label="Parent Group" value={parentName ?? library.parentPackageId ?? '—'} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth disabled required label="Maven ArtifactId" value={library.coordinates.artifactId} />
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
                        onChange={(_, checked) => field.onChange(checked ? PRIVATE_PACKAGE_ROLE : PUBLIC_PACKAGE_ROLE)}
                      />
                    }
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField {...field} fullWidth multiline minRows={6} label="Description" disabled={isLoading} />
                )}
              />
            </Grid>
          </Grid>
        </Box>
      }
    />
  )
}
GeneralLibrarySettingsEditor.displayName = 'GeneralLibrarySettingsEditor'

const EditorActions = styled(Box)(({ theme }) => ({ display: 'flex', gap: theme.spacing(1) }))
