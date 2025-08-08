/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react'
import type { ChangeEvent, FC, SyntheticEvent } from 'react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import type { Control, FormState, UseFormSetValue } from 'react-hook-form'
import { Controller, useWatch } from 'react-hook-form'
import {
  Autocomplete,
  Box,
  Button,
  debounce,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  ListItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded'
import { LoadingButton } from '@mui/lab'
import { DialogForm } from './DialogForm'
import { CustomChip } from './CustomChip'
import type { Key, VersionKey } from '../entities/keys'
import type { PackagePermissions } from '../entities/package-permissions'
import type { VersionStatus } from '../entities/version-status'
import {
  DRAFT_VERSION_STATUS,
  NO_PREVIOUS_RELEASE_VERSION_OPTION,
  RELEASE_VERSION_STATUS,
  VERSION_STATUS_MANAGE_PERMISSIONS,
  VERSION_STATUSES,
} from '../entities/version-status'
import {
  checkFileType,
  checkReleaseVersionFormat,
  checkVersionNotEqualToPrevious,
  checkVersionRestrictedSymbols,
} from '../utils/validations'
import { EditIcon } from '../icons/EditIcon'
import { CloudUploadIcon } from '../icons/CloudUploadIcon'
import { getSplittedVersionKey, handleVersionsRevision } from '../utils/versions'
import { ErrorTypography } from './Typography/ErrorTypography'
import type { PackageVersions } from '../entities/versions'
import { LabelsAutocomplete } from './LabelsAutocomplete'
import type { Package, Packages } from '../entities/packages'
import { OptionItem } from './OptionItem'
import { disableAutocompleteSearch } from '../utils/mui'
import { DEFAULT_DEBOUNCE } from '../utils/constants'
import { InfoContextIcon } from '../icons/InfoContextIcon'
import { CSV_FILE_EXTENSION } from '../utils/files'
import { FileUploadField } from './FileUploadField'
import type { AutocompleteInputChangeReason } from '@mui/base/AutocompleteUnstyled/useAutocomplete'
import { WARNING_API_PROCESSOR_TEXT, WarningApiProcessorVersion } from './WarningApiProcessorVersion'

export type VersionFormData = {
  message?: string
  descriptorVersion?: Key
  descriptorFile?: File | null
  workspace?: Package | null
  package?: Package | null
  version: Key
  status: VersionStatus
  labels: string[]
  previousVersion: Key
  file?: File
}

export type VersionDialogFormProps<T extends VersionFormData = VersionFormData> = {
  open: boolean
  setOpen: (value: boolean) => void
  onSubmit: () => void
  control: Control<T>
  setValue: UseFormSetValue<T>
  formState: FormState<T>
  packagePermissions: PackagePermissions
  releaseVersionPattern: string | undefined
  selectedWorkspace?: Package | null
  workspaces?: Packages
  onWorkspacesFilter?: (value: string) => void
  onVersionsFilter?: (value: string) => void
  onPackagesFilter?: (value: string) => void
  onSetWorkspace?: (workspace: Package | null) => void
  onSetTargetPackage?: (pack: Package | null) => void
  onSetTargetVersion?: (version: string) => void
  onSetTargetStatus?: (status: VersionStatus) => void
  onSetTargetLabels?: (labels: string[]) => void
  areWorkspacesLoading?: boolean
  arePackagesLoading?: boolean
  areVersionsLoading?: boolean
  packages?: Packages
  packagesTitle?: string
  packageObj?: Package
  onSetPackage?: () => void
  versions?: Key[]
  previousVersions?: Key[]
  getVersionLabels?: (version: Key) => string[]
  isPublishing?: boolean
  extraValidationMassage?: string | null
  setSelectedPreviousVersion?: (value: Key) => void
  title?: string
  submitButtonTittle?: string
  descriptorVersionFieldTitle?: string
  descriptorFileFieldTitle?: string
  hideCSVRelatedFields?: boolean
  hideDescriptorField?: boolean
  hideDescriptorVersionField?: boolean
  hideSaveMessageField?: boolean
  hideCopyPackageFields?: boolean
  hidePreviousVersionField?: boolean
  publishButtonDisabled?: boolean
  publishFieldsDisabled?: boolean
  currentPackageKey?: string
}

export const VersionDialogForm: FC<VersionDialogFormProps> = memo<VersionDialogFormProps>((props) => {
  const {
    open,
    setOpen,
    onSubmit,
    control,
    setValue,
    formState,
    selectedWorkspace,
    workspaces,
    areWorkspacesLoading,
    onSetWorkspace,
    onSetTargetPackage,
    onSetTargetVersion,
    onSetTargetStatus,
    onSetTargetLabels,
    onWorkspacesFilter,
    arePackagesLoading,
    areVersionsLoading,
    onVersionsFilter,
    onPackagesFilter,
    packages,
    packagesTitle,
    versions,
    previousVersions,
    getVersionLabels,
    packagePermissions,
    releaseVersionPattern,
    isPublishing,
    extraValidationMassage,
    setSelectedPreviousVersion,
    title,
    submitButtonTittle,
    descriptorVersionFieldTitle,
    descriptorFileFieldTitle,
    hideCSVRelatedFields = true,
    hideDescriptorField,
    hideDescriptorVersionField,
    hideSaveMessageField,
    hidePreviousVersionField,
    hideCopyPackageFields,
    publishButtonDisabled,
    publishFieldsDisabled,
    currentPackageKey,
  } = props

  const { errors } = formState

  const workspace = useWatch({ control: control, name: 'workspace' })
  const targetPackage = useWatch({ control: control, name: 'package' })
  const status = useWatch({ control: control, name: 'status' })
  const previousVersion = useWatch({ control: control, name: 'previousVersion' })
  const descriptorFile = useWatch({ control: control, name: 'descriptorFile' })
  const isReleaseStatus = status === RELEASE_VERSION_STATUS
  const onWorkspacesChange = useCallback((_: SyntheticEvent, value: string): void => onWorkspacesFilter?.(value), [onWorkspacesFilter])
  const onPackagesChange = useCallback((_: SyntheticEvent, value: string): void => onPackagesFilter?.(value), [onPackagesFilter])
  const onVersionsChange = useCallback((_: SyntheticEvent, value: string): void => {
    onSetTargetVersion?.(value)
    onVersionsFilter?.(value)
  }, [onVersionsFilter, onSetTargetVersion])
  const onLabelsChange = useCallback((_: SyntheticEvent, value: string[]): void => onSetTargetLabels?.(value), [onSetTargetLabels])
  const onStatusChange = useCallback((_: SyntheticEvent, value: VersionStatus): void => onSetTargetStatus?.(value), [onSetTargetStatus])
  const [warningApiProcessorState, setWarningApiProcessorState] = useState(false)

  const debouncedOnWorkspacesChange = useMemo(() => debounce(onWorkspacesChange, DEFAULT_DEBOUNCE), [onWorkspacesChange])
  const debouncedOnPackagesChange = useMemo(() => debounce(onPackagesChange, DEFAULT_DEBOUNCE), [onPackagesChange])
  const debouncedOnVersionsChange = useMemo(() => debounce(onVersionsChange, DEFAULT_DEBOUNCE), [onVersionsChange])

  const [descriptorContent, setDescriptorContent] = useState<string | null>(null)
  const [isFileReading, setIsFileReading] = useState<boolean>(false)
  const onFileContentLoaded = useCallback((event: ProgressEvent<FileReader>): void => {
    setDescriptorContent(event?.target?.result ? String(event.target.result) : null)
    setIsFileReading(false)
  }, [])

  useEffect(() => {
    if (selectedWorkspace?.key) {
      setValue('workspace', selectedWorkspace)
    }
  }, [selectedWorkspace, selectedWorkspace?.key, setValue])

  useEffect(() => {
    if (!descriptorFile) {
      return
    }

    const reader = new FileReader()
    reader.onload = onFileContentLoaded
    reader.onerror = onFileContentLoaded
    setIsFileReading(true)
    reader.readAsText(descriptorFile)
  }, [descriptorFile, onFileContentLoaded])

  const showTopDivider = useMemo(
    () => !hideSaveMessageField || !hideDescriptorVersionField || !hideDescriptorField,
    [hideDescriptorField, hideDescriptorVersionField, hideSaveMessageField],
  )
  const isPublishFieldsDisabled = useMemo(() => {
    const isCopyPackageEmpty = !hideCopyPackageFields && !targetPackage
    const isCSVWorkspaceEmpty = !hideCSVRelatedFields && !workspace

    return publishFieldsDisabled || isCopyPackageEmpty || isCSVWorkspaceEmpty
  }, [publishFieldsDisabled, hideCopyPackageFields, targetPackage, hideCSVRelatedFields, workspace])

  /* todo move upload file text field to separated component */
  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={onSubmit}
    >
      <DialogTitle data-testid="DialogTitle">
        {title ?? 'Publish'}
      </DialogTitle>

      <DialogContent sx={{ width: 440 }}>

        {!hideSaveMessageField && <>
          <Typography variant="button">
            Save
          </Typography>
          <Controller
            name="message"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                multiline required
                autoComplete="on"
                rows="4"
                type="text"
                label="Message"
                data-testid="MessageTextField"
              />
            )}
          />
          <Typography variant="button">
            Publish
          </Typography>
        </>}

        {!hideDescriptorVersionField && (
          <Controller
            name="descriptorVersion"
            control={control}
            rules={{
              validate: {
                restrictedSymbols: (value) => checkVersionRestrictedSymbols(value ?? ''),
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value ?? ''}
                required
                label={descriptorVersionFieldTitle ?? 'Descriptor Version'}
                error={!!errors.descriptorVersion}
                onChange={(event) => setValue('descriptorVersion', event.target.value ?? '')}
                data-testid="DescriptorVersionTextField"
              />
            )}
          />
        )}

        {!hideDescriptorField && (
          <Controller
            name="descriptorFile"
            control={control}
            rules={{
              validate: {
                correctUpload: () => checkFileUpload(descriptorContent),
              },
            }}
            render={({ field }) => (
              <Box
                component="label"
                htmlFor="contained-button-file"
              >
                <Box
                  component="input"
                  id="contained-button-file"
                  display="none"
                  multiple
                  type="file"
                  onChange={({ target: { files } }: ChangeEvent<HTMLInputElement>) => {
                    setValue('descriptorFile', files?.[0] ?? null)
                  }}
                />
                <TextField
                  {...field}
                  sx={{
                    'label': { height: '100%', width: '100%' },
                  }}
                  value={field.value?.name ?? ''}
                  label={descriptorFileFieldTitle ?? 'Descriptor File'}
                  error={!!errors.descriptorFile}
                  helperText={errors.descriptorFile?.message}
                  required
                  InputProps={{
                    endAdornment: (
                      <Box display="flex" flexDirection="row" sx={{ cursor: 'pointer' }}>
                        {field.value ? <EditIcon/> : <CloudUploadIcon fontSize="small" sx={{ color: '#353C4E' }}/>}
                        {!!errors.descriptorFile && <ErrorRoundedIcon color="error"/>}
                      </Box>
                    ),
                    inputProps: {
                      readOnly: true,
                    },
                  }}
                  data-testid="DescriptorFileTextField"
                />
              </Box>
            )}
          />
        )}

        {showTopDivider && (
          <Divider sx={{ mx: 0, mt: 1, mb: 0.5 }} orientation="horizontal"/>
        )}

        {!hideCSVRelatedFields && (
          <>
            <Box display="flex" gap={0.5} alignItems="center" pb={1}>
              <Box sx={{ lineHeight: 1 }}>
                <Typography variant="button" component="span">Dashboard Version Config</Typography>
                <Typography variant="button" component="span" color="#FF5260">*</Typography>
              </Box>
              <Tooltip
                disableHoverListener={false}
                placement="right"
                title={DASHBOARD_VERSION_CONFIG_TITLE}
                PopperProps={{
                  sx: { '.MuiTooltip-tooltip': { maxWidth: '600px' } },
                }}
              >
                <InfoContextIcon fontSize="extra-small"/>
              </Tooltip>
            </Box>

            <Controller
              name="file"
              rules={{
                required: 'Please upload a file',
                validate: {
                  checkFileType: (file) => checkFileType(file!, [CSV_FILE_EXTENSION]),
                },
              }}
              control={control}
              render={({ field: { value, onChange } }) => <FileUploadField
                errorMessage={errors.file?.message}
                uploadedFile={value}
                setUploadedFile={value => onChange(value)}
                downloadAvailable={false}
                acceptableExtensions={[CSV_FILE_EXTENSION]}
              />}
            />

            <Box display="flex" gap={0.5} alignItems="center" pt={2}>
              <Typography variant="button">Package Search Scope for Dashboard Version</Typography>
              <Tooltip
                disableHoverListener={false}
                placement="right"
                title={PACKAGE_SEARCH_SCOPE_TITLE}
                PopperProps={{
                  sx: { '.MuiTooltip-tooltip': { maxWidth: '600px' } },
                }}
              >
                <InfoContextIcon fontSize="extra-small"/>
              </Tooltip>
            </Box>

            <Controller
              name="workspace"
              control={control}
              render={({ field: { value } }) => <Autocomplete
                value={value}
                options={workspaces ?? []}
                loading={areWorkspacesLoading}
                isOptionEqualToValue={(option, value) => option.key === value.key}
                getOptionLabel={(option) => option?.name ?? ''}
                renderOption={(props, { key, name }) => <OptionItem
                  key={key}
                  props={props}
                  title={name}
                  subtitle={key}
                />}
                onChange={(_, value) => {
                  setValue('workspace', value ?? null)
                  setValue('package', null)
                  onSetWorkspace?.(value)
                }}
                onInputChange={createOnInputChange(debouncedOnWorkspacesChange)}
                onClose={clearFilter(onWorkspacesFilter)}
                renderInput={(params) =>
                  <TextField
                    required
                    {...params}
                    label="Workspace"
                  />
                }
                data-testid="WorkspaceAutocomplete"
              />}
            />
            <Box sx={{ lineHeight: 1 }} pt={2}>
              <Typography variant="button">Publish Info</Typography>
            </Box>
          </>
        )}

        {!hideCopyPackageFields && (
          <>
            <Typography sx={{ mb: 1 }} variant="body2">Target {packagesTitle}</Typography>
            <Controller
              name="workspace"
              control={control}
              render={({ field: { value } }) => <Autocomplete
                value={value}
                options={workspaces ?? []}
                loading={areWorkspacesLoading}
                isOptionEqualToValue={(option, value) => option.key === value.key}
                getOptionLabel={(option) => option?.name ?? ''}
                renderOption={(props, { key, name }) => <OptionItem
                  key={key}
                  props={props}
                  title={name}
                  subtitle={key}
                />}
                onChange={(_, value) => {
                  setValue('workspace', value ?? null)
                  setValue('package', null)
                  onSetWorkspace?.(value)
                }}
                onClose={clearFilter(onWorkspacesFilter)}
                onInputChange={createOnInputChange(debouncedOnWorkspacesChange)}
                renderInput={(params) =>
                  <TextField
                    required
                    {...params}
                    label="Workspace"
                  />
                }
                data-testid="WorkspaceAutocomplete"
              />}
            />

            <Controller
              name="package"
              control={control}
              render={({ field: { value } }) => <Autocomplete
                value={value}
                disabled={!workspace}
                isOptionEqualToValue={(option, value) => option.key === value.key}
                options={packages ?? []}
                loading={arePackagesLoading}
                filterOptions={disableAutocompleteSearch}
                getOptionLabel={(option) => option?.name ?? ''}
                renderOption={(props, { key, name }) => <OptionItem
                  key={key}
                  props={props}
                  title={name}
                  subtitle={key}
                />}
                onInputChange={createOnInputChange(debouncedOnPackagesChange)}
                renderInput={(params) => <TextField
                  {...params}
                  required
                  label={packagesTitle}
                />
                }
                onChange={(_, value) => {
                  setValue('package', value)
                  onSetTargetPackage?.(value)
                  previousVersion !== NO_PREVIOUS_RELEASE_VERSION_OPTION && setValue('previousVersion', NO_PREVIOUS_RELEASE_VERSION_OPTION)
                  setWarningApiProcessorState(false)
                }}
                onClose={clearFilter(onPackagesFilter)}
                data-testid="PackageAutocomplete"
              />}
            />

            <Typography sx={{ mb: 1, mt: 2 }} variant="body2">Target Version Info</Typography>
          </>
        )}

        <Controller
          name="version"
          control={control}
          rules={{
            validate: {
              checkSpaces: (version) => {
                if (!isReleaseStatus) {
                  return true
                }
                if (!releaseVersionPattern) {
                  return true
                }
                return checkReleaseVersionFormat(version, releaseVersionPattern)
              },
              restrictedSymbols: checkVersionRestrictedSymbols,
              notEqualToPrevious: (version) => checkVersionNotEqualToPrevious(version, getSplittedVersionKey(previousVersion).versionKey),
            },
          }}
          render={({ field }) => (
            <Autocomplete
              freeSolo
              disabled={!field || !getVersionLabels || isPublishFieldsDisabled}
              value={field.value || ''}
              options={versions ?? []}
              loading={areVersionsLoading}
              renderOption={(props, versionKey) => <ListItem {...props} key={versionKey}>{versionKey}</ListItem>}
              onInputChange={createOnInputChange(debouncedOnVersionsChange)}
              filterOptions={disableAutocompleteSearch}
              renderInput={(params) => (
                <TextField
                  {...field}
                  {...params}
                  required
                  label="Version"
                  error={!!errors.version}
                />
              )}
              onChange={(_, value) => {
                setValue('version', value ?? '')
                onSetTargetVersion?.(value ?? '')
              }}
              onClose={clearFilter(onVersionsFilter)}
              data-testid="VersionAutocomplete"
            />
          )}
        />

        <Controller
          name="status"
          control={control}
          render={({ field: { value } }) => (
            <Autocomplete
              disableClearable
              value={value ?? null}
              options={VERSION_STATUSES}
              getOptionDisabled={(option) => !packagePermissions.includes(VERSION_STATUS_MANAGE_PERMISSIONS[option])}
              disabled={isPublishFieldsDisabled}
              renderOption={(props, option) =>
                <ListItem
                  {...props}
                  key={option}
                  data-testid={`Option-${option}`}
                >
                  <CustomChip value={option}/>
                </ListItem>
              }
              onChange={(_, value) => {
                onStatusChange(_, value as VersionStatus || DRAFT_VERSION_STATUS)
                setValue('status', value as VersionStatus)
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Status"
                  required
                  InputProps={{
                    ...params.InputProps,
                    // These styles hide the text in the input for correct view
                    sx: {
                      ['& .MuiInputBase-input']: {
                        color: 'transparent',
                        caretColor: 'transparent',
                        '::selection': {
                          background: 'transparent',
                          color: 'transparent',
                        },
                      },
                      ['& .Mui-disabled']: {
                        WebkitTextFillColor: 'transparent',
                      },
                    },
                    startAdornment: status ? <CustomChip sx={{ height: 16, mb: 1 }} value={status}/> : null,
                  }}
                />
              )}
              data-testid="StatusAutocomplete"
            />
          )}
        />

        <Controller
          name="labels"
          control={control}
          render={({ field }) => (
            <LabelsAutocomplete
              disabled={isPublishFieldsDisabled}
              onChange={(_, value) => {
                onLabelsChange(_, value)
                setValue('labels', value ?? [])
              }}
              value={field.value}
            />
          )}
        />

        {!hidePreviousVersionField && (
          <>
            <Divider sx={{ mx: 0, mt: 1, mb: 0.5 }} orientation="horizontal"/>
            <Controller
              name="previousVersion"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  disabled={isPublishFieldsDisabled}
                  value={field.value ?? null}
                  options={previousVersions ?? []}
                  getOptionLabel={value => getSplittedVersionKey(value).versionKey}
                  isOptionEqualToValue={(option, value) => option === getSplittedVersionKey(value).versionKey}
                  renderOption={(props, versionKey) => (
                    <ListItem {...props} key={versionKey}>
                      {getSplittedVersionKey(versionKey).versionKey}
                    </ListItem>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      label="Previous release version"
                      helperText={extraValidationMassage}
                    />
                  )}
                  onChange={(_, value) => {
                    setValue('previousVersion', value ?? NO_PREVIOUS_RELEASE_VERSION_OPTION)
                    setSelectedPreviousVersion?.(value ?? NO_PREVIOUS_RELEASE_VERSION_OPTION)
                    if (!value || value === NO_PREVIOUS_RELEASE_VERSION_OPTION) {
                      setWarningApiProcessorState(false)
                    }

                  }}
                  data-testid="PreviousReleaseVersionAutocomplete"
                />
              )}
            />
          </>
        )}

        {errors.version?.message && (
          <Box pt={2}>
            <ErrorTypography>{errors.version?.message}</ErrorTypography>
          </Box>
        )}
        <WarningApiProcessorVersion
          versionKey={NO_PREVIOUS_RELEASE_VERSION_OPTION !== previousVersion ? previousVersion : undefined}
          packageKey={targetPackage?.key || currentPackageKey}
          type={WARNING_API_PROCESSOR_TEXT}
          onWarningTextChange={(value) => setWarningApiProcessorState(!!value)}/>
      </DialogContent>
      <DialogActions>
        <LoadingButton
          variant="contained"
          type="submit"
          loading={isPublishing}
          disabled={isFileReading || publishButtonDisabled || publishFieldsDisabled || warningApiProcessorState}
          data-testid={submitButtonTittle ? `${submitButtonTittle}Button` : 'PublishButton'}
        >
          {submitButtonTittle ?? 'Publish'}
        </LoadingButton>
        <Button
          variant="outlined"
          onClick={() => setOpen(false)}
          data-testid="CancelButton"
        >
          Close
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

export function replaceEmptyPreviousVersion(previousVersion: Key): Key {
  return previousVersion === NO_PREVIOUS_RELEASE_VERSION_OPTION
    ? EMPTY_VERSION_KEY
    : previousVersion
}

export function usePreviousVersionOptions(versions: PackageVersions): VersionKey[] {
  const versionsWithoutRevision = handleVersionsRevision(versions)

  return useMemo(() => ([
    NO_PREVIOUS_RELEASE_VERSION_OPTION,
    ...versionsWithoutRevision.filter(({ status }) => status === RELEASE_VERSION_STATUS).map(({ key }) => key),
  ]), [versionsWithoutRevision])
}

export function getVersionOptions(versionLabelsMap: Record<string, string[]>, targetVersion: string): VersionKey[] {
  const versions: string[] = Object.keys(versionLabelsMap)
  if (targetVersion && !versions.includes(targetVersion)) {
    versions.unshift(targetVersion)
  }
  return versions
}

export function getPackageOptions(packages: Packages, existingPackage: Package | null, isFiltered: boolean): Packages {
  if (!isFiltered && existingPackage && packages && !packages.some(packageOption => packageOption.key === existingPackage.key)) {
    return [existingPackage, ...packages]
  }
  return packages
}

export const EMPTY_VERSION_KEY: Key = ''

function checkFileUpload(descriptorContent: string | null): boolean {
  return !!descriptorContent
}

const DASHBOARD_VERSION_CONFIG_TITLE = 'CSV file must have the following information: "serviceName" and "serviceVersion". Published dashboard version will include package release versions (from selected workspace) for specified services. Additionally, "method" and "path" of REST API operations for services can be defined in the file. In this case, the system will create operations group with the operations for specified method and path.'
const PACKAGE_SEARCH_SCOPE_TITLE = 'The workspace in which package versions for services from the CSV configuration will be searched. The package versions found in this workspace will be included into the dashboard version.'

function createOnInputChange(onChange: (_: SyntheticEvent, value: string) => void) {
  return (event: SyntheticEvent, value: string, reason: AutocompleteInputChangeReason) => {
    if (reason === 'input') {
      onChange(event, value)
    }
  }
}

function clearFilter(onFilter?: (value: string) => void) {
  return () => {
    onFilter?.('')
  }
}
