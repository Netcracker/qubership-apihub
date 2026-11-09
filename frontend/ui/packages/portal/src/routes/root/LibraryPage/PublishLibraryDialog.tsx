import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { LoadingButton } from '@mui/lab'
import {
  Alert,
  Button,
  debounce,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItem,
  MenuItem,
  styled,
  TextField,
} from '@mui/material'
import { type FC, useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Marker } from 'react-mark.js'

import { VersionSelectorAutocomplete } from '@netcracker/qubership-apihub-ui-shared/components/Autocompletes/VersionSelectorAutocomplete'
import { DialogForm } from '@netcracker/qubership-apihub-ui-shared/components/DialogForm'
import { LabelsAutocomplete } from '@netcracker/qubership-apihub-ui-shared/components/LabelsAutocomplete'
import { VersionStatusChip } from '@netcracker/qubership-apihub-ui-shared/components/VersionStatusChip'
import {
  getPreviousVersionStatuses,
  isPreviousVersionStatusAllowed,
  RELEASE_PREVIOUS_VERSION_REQUIRED_MESSAGE,
  RELEASE_VERSION_STATUS,
} from '@netcracker/qubership-apihub-ui-shared/entities/version-status'
import { DEFAULT_DEBOUNCE } from '@netcracker/qubership-apihub-ui-shared/utils/constants'
import { disableAutocompleteSearch } from '@netcracker/qubership-apihub-ui-shared/utils/mui'

import type { LibraryVersionDto, LibraryVersionPublishDto, MavenLibraryDto } from '@portal/entities/libraries'
import { useShowSuccessNotification } from '@portal/routes/root/BasePage/Notification'
import { useLibraryRegistryVersions } from '@portal/routes/root/LibraryPage/useLibraryRegistryVersions'
import { useLibraryVersions } from '@portal/routes/root/LibraryPage/useLibraryVersions'
import { usePublishLibraryVersion } from '@portal/routes/root/LibraryPage/usePublishLibraryVersion'
import { getManageableVersionStatuses } from './libraryPermissions'

const NO_PREVIOUS_VERSION = 'No previous version'

type PublishLibraryDialogProps = {
  library: MavenLibraryDto
  onClose: () => void
  onPublished?: (version: LibraryVersionDto) => void
}

export const PublishLibraryDialog: FC<PublishLibraryDialogProps> = ({ library, onClose, onPublished }) => {
  const { libraryId } = library
  const statuses = getManageableVersionStatuses(library)
  const versionInputRef = useRef<HTMLInputElement | null>(null)
  const previousVersionInitialized = useRef(false)
  const [inputValue, setInputValue] = useState('')
  const [registryTextFilter, setRegistryTextFilter] = useState('')
  const debouncedSetRegistryTextFilter = useMemo(() => debounce(setRegistryTextFilter, DEFAULT_DEBOUNCE), [])
  const { versions: registryVersions, isLoading: areRegistryVersionsLoading, error: registryVersionsError } =
    useLibraryRegistryVersions(libraryId, registryTextFilter)
  const { versions, isLoading: areVersionsLoading, error: versionsError } = useLibraryVersions(libraryId)
  const { publishVersion, version: publishedVersion, isLoading: isPublishing, isSuccess, error } =
    usePublishLibraryVersion(libraryId)
  const showSuccessNotification = useShowSuccessNotification()
  const { control, handleSubmit, setValue, getValues } = useForm<LibraryVersionPublishDto>({
    defaultValues: {
      version: '',
      previousVersion: NO_PREVIOUS_VERSION,
      status: statuses.includes(RELEASE_VERSION_STATUS) ? RELEASE_VERSION_STATUS : statuses[0],
      labels: [],
    },
  })
  const selectedVersion = useWatch({ control: control, name: 'version' })
  const status = useWatch({ control: control, name: 'status' })
  const previousVersion = useWatch({ control: control, name: 'previousVersion' })
  const previousVersionStatuses = getPreviousVersionStatuses(status)
  const allowedPreviousVersions = versions.filter(version => previousVersionStatuses.includes(version.status))
  const previousVersionStatus = versions.find(version => version.version === previousVersion)?.status
  const hasInvalidPreviousVersionStatus = previousVersion !== NO_PREVIOUS_VERSION &&
    !!previousVersionStatus && !isPreviousVersionStatusAllowed(status, previousVersionStatus)

  useEffect(() => () => debouncedSetRegistryTextFilter.clear(), [debouncedSetRegistryTextFilter])

  useEffect(() => {
    if (!areVersionsLoading) versionInputRef.current?.focus()
  }, [areVersionsLoading])

  useEffect(() => {
    if (!areVersionsLoading && !versionsError && !previousVersionInitialized.current) {
      previousVersionInitialized.current = true
      const allowedStatuses = getPreviousVersionStatuses(status)
      setValue(
        'previousVersion',
        versions.find(version => allowedStatuses.includes(version.status))?.version ??
          NO_PREVIOUS_VERSION,
      )
    }
  }, [versions, areVersionsLoading, versionsError, status, setValue])

  useEffect(() => {
    if (isSuccess) {
      showSuccessNotification({ message: 'Library version has been saved' })
      if (publishedVersion) onPublished?.(publishedVersion)
      onClose()
    }
  }, [isSuccess, onClose, onPublished, publishedVersion, showSuccessNotification])

  const handleClose = (): void => {
    if (!isPublishing) onClose()
  }

  const onSubmit = (value: LibraryVersionPublishDto): void => {
    if (hasInvalidPreviousVersionStatus) return
    publishVersion({
      ...value,
      previousVersion: value.previousVersion === NO_PREVIOUS_VERSION ? undefined : value.previousVersion,
    })
  }

  return (
    <DialogForm open onClose={handleClose} onSubmit={handleSubmit(onSubmit)} width="530px" maxWidth="sm">
      <DialogTitle>Publish</DialogTitle>
      <PublishContent>
        <Controller
          name="version"
          control={control}
          rules={{
            required: 'Select a library version',
            validate: {
              previousVersion: value =>
                value !== getValues('previousVersion') || 'The version must differ from the previous version',
            },
          }}
          render={({ field, fieldState }) => (
            <VersionSelectorAutocomplete
              disableClearable
              inputIndicator={<SearchOutlinedIcon fontSize="small" sx={{ order: -1 }} />}
              value={field.value || null}
              inputValue={inputValue}
              options={registryVersions}
              filterOptions={disableAutocompleteSearch}
              noOptionsText="No versions found"
              loading={areRegistryVersionsLoading}
              disabled={isPublishing}
              renderOption={(props, version) => (
                <ListItem {...props} key={version}>
                  <Marker mark={inputValue}>{version}</Marker>
                </ListItem>
              )}
              onChange={(_, value) => {
                debouncedSetRegistryTextFilter.clear()
                field.onChange(value ?? '')
                setInputValue(value ?? '')
              }}
              onInputChange={(_, value, reason) => {
                if (reason === 'input') {
                  setInputValue(value)
                  field.onChange('')
                  debouncedSetRegistryTextFilter(value)
                }
              }}
              renderInput={params => (
                <TextField
                  {...params}
                  autoFocus
                  required
                  label="Library Version"
                  inputRef={(input: HTMLInputElement | null) => {
                    field.ref(input)
                    versionInputRef.current = input
                  }}
                  onBlur={() => {
                    if (field.value === '') {
                      setInputValue('')
                      debouncedSetRegistryTextFilter.clear()
                      setRegistryTextFilter('')
                    }
                    field.onBlur()
                  }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
              data-testid="LibraryVersionAutocomplete"
            />
          )}
        />
        <Controller
          name="previousVersion"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              required
              label="Previous Version"
              error={hasInvalidPreviousVersionStatus}
              helperText={hasInvalidPreviousVersionStatus ? RELEASE_PREVIOUS_VERSION_REQUIRED_MESSAGE : undefined}
              disabled={areVersionsLoading || isPublishing}
              data-testid="PreviousLibraryVersionSelect"
            >
              <MenuItem value={NO_PREVIOUS_VERSION}>{NO_PREVIOUS_VERSION}</MenuItem>
              {hasInvalidPreviousVersionStatus && (
                <MenuItem value={previousVersion} disabled sx={{ display: 'none' }}>{previousVersion}</MenuItem>
              )}
              {allowedPreviousVersions.map(version => (
                <MenuItem key={version.version} value={version.version}>{version.version}</MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              required
              label="Status"
              disabled={isPublishing}
              data-testid="LibraryVersionStatusSelect"
            >
              {statuses.map(status => (
                <MenuItem key={status} value={status}>
                  <VersionStatusChip status={status} label={status === RELEASE_VERSION_STATUS ? 'Release' : 'Draft'} />
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
              disabled={isPublishing}
              onChange={(_, value) => field.onChange(value)}
            />
          )}
        />
        {(error || versionsError || registryVersionsError) && (
          <Alert severity="error">{error?.message ?? versionsError?.message ?? registryVersionsError?.message}</Alert>
        )}
      </PublishContent>
      <DialogActions>
        <LoadingButton
          type="submit"
          variant="contained"
          loading={isPublishing}
          disabled={areVersionsLoading || areRegistryVersionsLoading || !!versionsError || !!registryVersionsError ||
            !selectedVersion || !statuses.length || hasInvalidPreviousVersionStatus}
          data-testid="ConfirmPublishLibraryButton"
        >
          Publish
        </LoadingButton>
        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={isPublishing}
          data-testid="CancelPublishLibraryButton"
        >
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
}
PublishLibraryDialog.displayName = 'PublishLibraryDialog'

const PublishContent = styled(DialogContent)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  minWidth: 0,
  gap: theme.spacing(1.5),
  paddingTop: theme.spacing(1),
  '& .MuiTextField-root': { margin: 0 },
}))
