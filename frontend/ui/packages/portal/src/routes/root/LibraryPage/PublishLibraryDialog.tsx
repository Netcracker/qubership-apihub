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
import { type FC, memo, useEffect, useMemo, useRef, useState } from 'react'
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
import { HttpError } from '@netcracker/qubership-apihub-ui-shared/utils/responses'

import {
  LIBRARY_ERROR_MESSAGES,
  LibraryErrorCodes,
  type LibraryVersion,
  type LibraryVersionPublishDto,
  type MavenLibraryDto,
} from '@portal/entities/libraries'
import { useLibraryAvailableVersions } from '@portal/routes/root/LibraryPage/useLibraryAvailableVersions'
import { useLibraryVersions } from '@portal/routes/root/LibraryPage/useLibraryVersions'
import {
  useLibraryVersionPublicationStatus,
  usePublishLibraryVersion,
} from '@portal/routes/root/LibraryPage/usePublishLibraryVersion'
import { getManageableVersionStatuses } from './libraryPermissions'

// TODO(libraries-backend): "No previous version" omits the field, which the service reads as "compare with the latest
// release". The UI alone prevents a Release from using a Draft; wait for service support for both rules.
const NO_PREVIOUS_VERSION = 'No previous version'

const LIBRARY_VERSION_ERROR_FIELDS: ReadonlyMap<string, 'version' | 'previousVersion'> = new Map([
  [LibraryErrorCodes.VERSION_ALREADY_EXISTS, 'version'],
  [LibraryErrorCodes.VERSION_NOT_FOUND_IN_REGISTRY, 'version'],
  [LibraryErrorCodes.PREVIOUS_VERSION_NOT_FOUND, 'previousVersion'],
])

type PublishLibraryDialogProps = Readonly<{
  library: MavenLibraryDto
  onClose: () => void
  onPublished?: (version: LibraryVersion) => void
}>

export const PublishLibraryDialog: FC<PublishLibraryDialogProps> = memo<PublishLibraryDialogProps>(
  ({ library, onClose, onPublished }) => {
    const { libraryId } = library
    const statuses = getManageableVersionStatuses(library)
    const versionInputRef = useRef<HTMLInputElement | null>(null)
    const previousVersionInitialized = useRef(false)
    const [inputValue, setInputValue] = useState('')
    const [isVersionFocused, setVersionFocused] = useState(false)
    const [isPreviousVersionFocused, setPreviousVersionFocused] = useState(false)
    const [registryTextFilter, setRegistryTextFilter] = useState('')
    const debouncedSetRegistryTextFilter = useMemo(() => debounce(setRegistryTextFilter, DEFAULT_DEBOUNCE), [])
    const { versions: availableVersions, isLoading: areAvailableVersionsLoading, error: availableVersionsError } =
      useLibraryAvailableVersions(libraryId, registryTextFilter)
    const { versions, isLoading: areVersionsLoading, error: versionsError } = useLibraryVersions(libraryId)
    const { publishVersion, version: publishedVersion, isPublishStarting, isPublishStartedSuccessfully, error } =
      usePublishLibraryVersion(libraryId)
    const [isPublishing, isPublished, isPublishError, buildError] = useLibraryVersionPublicationStatus(
      libraryId,
      publishedVersion,
    )
    const isPublishInProgress = isPublishStarting ||
      isPublishStartedSuccessfully && !isPublished && !isPublishError ||
      isPublishing
    const { control, handleSubmit, setValue, getValues, setError, clearErrors } = useForm<LibraryVersionPublishDto>({
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
    const errorField = error instanceof HttpError ? LIBRARY_VERSION_ERROR_FIELDS.get(error.code) : undefined
    const publishError = (errorField ? undefined : error) ?? buildError
    const previousVersionStatuses = getPreviousVersionStatuses(status)
    const allowedPreviousVersions = versions.filter(version => previousVersionStatuses.includes(version.status))
    const previousVersionStatus = versions.find(version => version.version === previousVersion)?.status
    const hasInvalidPreviousVersionStatus = previousVersionStatus && previousVersion !== NO_PREVIOUS_VERSION
      ? !isPreviousVersionStatusAllowed(status, previousVersionStatus)
      : false

    useEffect(() => () => debouncedSetRegistryTextFilter.clear(), [debouncedSetRegistryTextFilter])

    useEffect(() => {
      if (errorField && error instanceof HttpError) {
        setError(errorField, { type: 'server', message: LIBRARY_ERROR_MESSAGES.get(error.code) })
      }
    }, [error, errorField, setError])

    useEffect(() => {
      if (!areVersionsLoading) versionInputRef.current?.focus()
    }, [areVersionsLoading])

    useEffect(() => {
      if (!areVersionsLoading && !versionsError && !previousVersionInitialized.current) {
        previousVersionInitialized.current = true
        const allowedStatuses = getPreviousVersionStatuses(status)
        const defaultPreviousVersion = versions.find(version => allowedStatuses.includes(version.status))?.version
        setValue(
          'previousVersion',
          defaultPreviousVersion ?? NO_PREVIOUS_VERSION,
        )
      }
    }, [versions, areVersionsLoading, versionsError, status, setValue])

    useEffect(() => {
      if (isPublished) {
        if (publishedVersion) onPublished?.(publishedVersion)
        onClose()
      }
    }, [isPublished, onClose, onPublished, publishedVersion])

    const handleClose = (): void => {
      if (!isPublishInProgress) onClose()
    }

    const onSubmit = (value: LibraryVersionPublishDto): void => {
      if (isPublishInProgress || hasInvalidPreviousVersionStatus) return
      publishVersion({
        ...value,
        previousVersion: value.previousVersion === NO_PREVIOUS_VERSION ? undefined : value.previousVersion,
      })
    }
    const hasVersionsError = !!versionsError || !!availableVersionsError
    const isPublishDisabled = areVersionsLoading || areAvailableVersionsLoading || hasVersionsError

    return (
      <DialogForm open onClose={handleClose} onSubmit={handleSubmit(onSubmit)}>
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
                inputIndicator={isVersionFocused && <SearchOutlinedIcon fontSize="small" sx={{ order: -1 }} />}
                value={field.value || null}
                inputValue={inputValue}
                options={availableVersions}
                filterOptions={disableAutocompleteSearch}
                noOptionsText="No versions found"
                loading={areAvailableVersionsLoading}
                disabled={isPublishInProgress}
                renderOption={(props, version) => (
                  <ListItem {...props} key={version}>
                    <Marker mark={inputValue}>{version}</Marker>
                  </ListItem>
                )}
                onChange={(_, value) => {
                  debouncedSetRegistryTextFilter.clear()
                  if (fieldState.error?.type === 'server') clearErrors('version')
                  field.onChange(value ?? '')
                  setInputValue(value ?? '')
                }}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input') {
                    if (fieldState.error?.type === 'server') clearErrors('version')
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
                    onFocus={() => setVersionFocused(true)}
                    inputRef={(input: HTMLInputElement | null) => {
                      field.ref(input)
                      versionInputRef.current = input
                    }}
                    onBlur={() => {
                      setVersionFocused(false)
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
            render={({ field, fieldState }) => (
              <VersionSelectorAutocomplete
                disableClearable
                value={field.value ?? NO_PREVIOUS_VERSION}
                options={[
                  NO_PREVIOUS_VERSION,
                  ...allowedPreviousVersions.map(version => version.version),
                  ...(hasInvalidPreviousVersionStatus && previousVersion ? [previousVersion] : []),
                ]}
                getOptionDisabled={option => hasInvalidPreviousVersionStatus && option === previousVersion}
                renderOption={(props, option) => (
                  <ListItem
                    {...props}
                    key={option}
                    sx={hasInvalidPreviousVersionStatus && option === previousVersion ? { display: 'none' } : undefined}
                  >
                    {option}
                  </ListItem>
                )}
                inputIndicator={isPreviousVersionFocused && <SearchOutlinedIcon fontSize="small" sx={{ order: -1 }} />}
                disabled={areVersionsLoading || isPublishInProgress}
                loading={areVersionsLoading}
                noOptionsText="No versions found"
                onChange={(_, value) => {
                  if (fieldState.error?.type === 'server') clearErrors('previousVersion')
                  field.onChange(value ?? NO_PREVIOUS_VERSION)
                }}
                renderInput={params => (
                  <TextField
                    {...params}
                    required
                    label="Previous Version"
                    inputRef={field.ref}
                    onFocus={() => setPreviousVersionFocused(true)}
                    onBlur={() => {
                      setPreviousVersionFocused(false)
                      field.onBlur()
                    }}
                    error={!!fieldState.error || hasInvalidPreviousVersionStatus}
                    helperText={fieldState.error?.message ??
                      (hasInvalidPreviousVersionStatus ? RELEASE_PREVIOUS_VERSION_REQUIRED_MESSAGE : undefined)}
                  />
                )}
                data-testid="PreviousLibraryVersionSelect"
              />
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
                disabled={isPublishInProgress}
                data-testid="LibraryVersionStatusSelect"
              >
                {statuses.map(status => (
                  <MenuItem key={status} value={status}>
                    <VersionStatusChip
                      status={status}
                      label={status === RELEASE_VERSION_STATUS ? 'Release' : 'Draft'}
                    />
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
                disabled={isPublishInProgress}
                onChange={(_, value) => field.onChange(value)}
              />
            )}
          />
          {(publishError || versionsError || availableVersionsError) && (
            <Alert severity="error">
              {publishError?.message ?? versionsError?.message ?? availableVersionsError?.message}
            </Alert>
          )}
        </PublishContent>
        <DialogActions>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={isPublishInProgress}
            disabled={isPublishDisabled || !selectedVersion || !statuses.length || hasInvalidPreviousVersionStatus}
            data-testid="ConfirmPublishLibraryButton"
          >
            Publish
          </LoadingButton>
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={isPublishInProgress}
            data-testid="CancelPublishLibraryButton"
          >
            Cancel
          </Button>
        </DialogActions>
      </DialogForm>
    )
  },
)
PublishLibraryDialog.displayName = 'PublishLibraryDialog'

const PublishContent = styled(DialogContent)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: 440,
  minWidth: 0,
  gap: theme.spacing(1.5),
  paddingTop: theme.spacing(1),
  '& .MuiTextField-root': { margin: 0 },
}))
