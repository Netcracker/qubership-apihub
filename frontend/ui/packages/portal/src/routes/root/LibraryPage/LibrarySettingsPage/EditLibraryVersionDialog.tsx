import { LoadingButton } from '@mui/lab'
import {
  Alert,
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  type InputBaseComponentProps,
  MenuItem,
  styled,
  TextField,
} from '@mui/material'
import { type FC, forwardRef, useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { LabelsAutocomplete } from '@netcracker/qubership-apihub-ui-shared/components/LabelsAutocomplete'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'
import { VersionStatusChip } from '@netcracker/qubership-apihub-ui-shared/components/VersionStatusChip'
import {
  isPreviousVersionStatusAllowed,
  PUBLISH_STATUSES,
  RELEASE_PREVIOUS_VERSION_REQUIRED_MESSAGE,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'

import type { LibraryVersionDto, LibraryVersionUpdateDto, MavenLibraryDto } from '@portal/entities/libraries'
import { FrontTruncatedText } from '@portal/routes/root/LibraryPage/FrontTruncatedText'
import { useShowSuccessNotification } from '../../BasePage/Notification'
import { getManageableVersionStatuses } from '../libraryPermissions'
import { useLibraryVersions, useUpdateLibraryVersion } from '../useLibraryVersions'

type EditLibraryVersionDialogProps = { version: LibraryVersionDto; library: MavenLibraryDto; onClose: () => void }
type GavInputProps = InputBaseComponentProps & TestableProps

export const EditLibraryVersionDialog: FC<EditLibraryVersionDialogProps> = ({ version, library, onClose }) => {
  const statuses = getManageableVersionStatuses(library)
  const { control, handleSubmit, formState: { isDirty } } = useForm<LibraryVersionUpdateDto>({
    defaultValues: { status: version.status, labels: version.labels },
  })
  const { updateVersion, isLoading, isSuccess, error } = useUpdateLibraryVersion(version.libraryId, version.version)
  const { versions } = useLibraryVersions(version.libraryId)
  const status = useWatch({ control: control, name: 'status' })
  const previousVersionStatus = versions.find(previous => previous.version === version.previousVersion)?.status
  const hasInvalidPreviousVersionStatus = !!previousVersionStatus &&
    !isPreviousVersionStatusAllowed(status, previousVersionStatus)
  const showSuccessNotification = useShowSuccessNotification()
  useEffect(() => {
    if (isSuccess) {
      showSuccessNotification({ message: 'Library version has been updated' })
      onClose()
    }
  }, [isSuccess, onClose, showSuccessNotification])
  const handleClose = (): void => {
    if (!isLoading) onClose()
  }
  const onSubmit = (value: LibraryVersionUpdateDto): void => {
    if (!hasInvalidPreviousVersionStatus) updateVersion(value)
  }

  return (
    <DialogForm open width="530px" maxWidth="sm" onClose={handleClose} onSubmit={handleSubmit(onSubmit)}>
      <DialogTitle>Edit Version</DialogTitle>
      <EditContent>
        <TextField label="Library Version" value={version.version} disabled />
        <TextField label="Previous Version" value={version.previousVersion ?? 'No previous version'} disabled />
        <TextField
          label="GAV"
          value={`${library.coordinatesKey}:${version.version}`}
          disabled
          InputProps={{ inputComponent: GavInput, readOnly: true }}
          inputProps={{ 'data-testid': 'EditLibraryVersionGav' }}
          sx={{
            // Outrank MUI's width: 100% so GAV can shrink and truncate at the front; inputComponent styles lose.
            '& .MuiInputBase-input': { flexGrow: 1, width: 0, minWidth: 0, overflow: 'hidden' },
          }}
        />
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Status"
              error={hasInvalidPreviousVersionStatus}
              helperText={hasInvalidPreviousVersionStatus ? RELEASE_PREVIOUS_VERSION_REQUIRED_MESSAGE : undefined}
              required
              disabled={isLoading}
              data-testid="EditLibraryVersionStatus"
            >
              {statuses.map(status => (
                <MenuItem key={status} value={status}>
                  <VersionStatusChip status={status} label={PUBLISH_STATUSES.get(status)} />
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name="labels"
          control={control}
          render={({ field }) => (
            <LabelsAutocomplete
              value={field.value}
              onChange={(_, labels) => field.onChange(labels)}
              disabled={isLoading}
            />
          )}
        />
        {error && <Alert severity="error">{error.message}</Alert>}
      </EditContent>
      <DialogActions>
        <LoadingButton
          type="submit"
          variant="contained"
          loading={isLoading}
          disabled={!isDirty || hasInvalidPreviousVersionStatus}
          data-testid="SaveLibraryVersionButton"
        >
          Save
        </LoadingButton>
        <Button variant="outlined" onClick={handleClose} disabled={isLoading}>Cancel</Button>
      </DialogActions>
    </DialogForm>
  )
}
EditLibraryVersionDialog.displayName = 'EditLibraryVersionDialog'

const GavInput = forwardRef<HTMLDivElement, GavInputProps>(({
  value,
  className,
  id,
  'data-testid': dataTestId,
}, ref) => (
  <Box ref={ref} className={className} id={id} role="textbox" aria-label="GAV" aria-readonly aria-disabled>
    <FrontTruncatedText text={value} data-testid={dataTestId} />
  </Box>
))
GavInput.displayName = 'GavInput'

const EditContent = styled(DialogContent)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}))
