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

import { type FC, memo, type SyntheticEvent, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  debounce,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItem,
  TextField,
  Typography,
} from '@mui/material'
import type { Control, UseFormSetValue } from 'react-hook-form'
import { Controller, useWatch } from 'react-hook-form'
import { LoadingButton } from '@mui/lab'
import { DialogForm } from './DialogForm'
import { DASHBOARD_KIND, PACKAGE_KIND, type Package } from '../entities/packages'
import { DEFAULT_DEBOUNCE } from '../utils/constants'
import type { PackageVersion } from '../entities/versions'
import { disableAutocompleteSearch } from '../utils/mui'
import { getSplittedVersionKey } from '../utils/versions'
import { Swapper } from './Swapper'
import { VersionErrorFormMessage } from './ErrorIndicators/VersionErrorFormMessage'
import { VersionErrorIndicator } from './ErrorIndicators/VersionErrorIndicator'
import { VersionSelectorAutocomplete } from './Autocompletes/VersionSelectorAutocomplete'
import { VersionOptionItem } from './VersionOptionItem'
import { useVersionProblemDetails } from '../hooks/versions/useVersionProblemDetails'
import { VERSION_PROBLEM_DIALOG_SURFACE } from '../hooks/versions/versionProblemDetails'

//todo need retest (without nested value)
export type CompareVersionsDialogFormData = {
  originalWorkspace: Package | null
  changedWorkspace: Package | null
  originalPackage: Package | null
  changedPackage: Package | null
  originalVersion: PackageVersion | null
  changedVersion: PackageVersion | null
}

export type CompareVersionsDialogData = {
  control: Control<CompareVersionsDialogFormData>
  setValue: UseFormSetValue<CompareVersionsDialogFormData>
  workspaces: ReadonlyArray<Package>
  originalPackageOptions: ReadonlyArray<Package>
  changedPackageOptions: ReadonlyArray<Package>
  originalVersionOptions: ReadonlyArray<PackageVersion>
  changedVersionOptions: ReadonlyArray<PackageVersion>
  onSubmit: () => void
  onSwap: () => void
  isApiTypeFetching: boolean
  isOriginalPackagesLoading: boolean
  isChangedPackagesLoading: boolean
  isOriginalPackageVersionsLoading: boolean
  isChangedPackageVersionsLoading: boolean
  isDefaultOriginalPackageLoading: boolean
  isDashboard: boolean
  arePackagesDifferent: boolean
}

export type CompareVersionsDialogFormProps = CompareVersionsDialogData & {
  open: boolean
  setOpen: (value: boolean) => void
  onOriginalPackageInputChange: (event: SyntheticEvent, value: string) => void
  onChangedPackageInputChange: (event: SyntheticEvent, value: string) => void
  onOriginalPackageVersionInputChange: (event: SyntheticEvent, value: string) => void
  onChangedPackageVersionInputChange: (event: SyntheticEvent, value: string) => void
}

// First Order Component //
export const CompareVersionsDialogForm: FC<CompareVersionsDialogFormProps> = memo(({
  open,
  setOpen,
  setValue,
  control,
  workspaces,
  originalPackageOptions,
  changedPackageOptions,
  originalVersionOptions,
  changedVersionOptions,
  onSubmit,
  onSwap,
  isApiTypeFetching,
  isOriginalPackagesLoading,
  isChangedPackagesLoading,
  isDashboard,
  onOriginalPackageInputChange,
  onChangedPackageInputChange,
  onOriginalPackageVersionInputChange,
  onChangedPackageVersionInputChange,
  isOriginalPackageVersionsLoading,
  isChangedPackageVersionsLoading,
  isDefaultOriginalPackageLoading,
  arePackagesDifferent,
}) => {
  const [packageMode, setPackageMode] = useState(arePackagesDifferent)

  const packageFieldLabel = isDashboard ? 'Dashboard' : 'Package'
  const changeButtonLabel = isDashboard ? 'Change Dashboards' : 'Change Packages'
  const previousVersion = useWatch({ control: control, name: 'originalVersion' })
  const previousPackage = useWatch({ control: control, name: 'originalPackage' })
  const currentVersion = useWatch({ control: control, name: 'changedVersion' })
  const currentPackage = useWatch({ control: control, name: 'changedPackage' })
  const kind = isDashboard ? DASHBOARD_KIND : PACKAGE_KIND
  const originalVersionPackageKey = previousPackage?.key
  const changedVersionPackageKey = packageMode ? currentPackage?.key : previousPackage?.key
  const {
    isBlocking: isPreviousVersionBlocking,
    formHelperText: previousVersionFormHelperText,
    hasProblems: previousVersionHasProblems,
  } = useVersionProblemDetails({
    packageKey: originalVersionPackageKey,
    versionKey: previousVersion?.key,
    hasErrors: previousVersion?.hasErrors,
    changelogHasErrors: previousVersion?.changelogHasErrors,
    apiProcessorVersion: previousVersion?.apiProcessorVersion,
    kind: kind,
    surface: VERSION_PROBLEM_DIALOG_SURFACE.COMPARE_PREVIOUS_VERSION,
  })
  const {
    isBlocking: isCurrentVersionBlocking,
    formHelperText: currentVersionFormHelperText,
    hasProblems: currentVersionHasProblems,
  } = useVersionProblemDetails({
    packageKey: changedVersionPackageKey,
    versionKey: currentVersion?.key,
    hasErrors: currentVersion?.hasErrors,
    changelogHasErrors: currentVersion?.changelogHasErrors,
    apiProcessorVersion: currentVersion?.apiProcessorVersion,
    kind: kind,
    surface: VERSION_PROBLEM_DIALOG_SURFACE.COMPARE_CURRENT_VERSION,
  })

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={onSubmit}
      maxWidth="md"
    >
      <DialogTitle>
        Select Versions To Compare
      </DialogTitle>

      <DialogContent
        sx={DIALOG_CONTENT_STYLES}
      >
        <Typography
          sx={{ gridArea: 'originalTitle' }}
          variant="button"
        >
          Previous
        </Typography>

        {packageMode &&
          <>
            <Controller
              name="originalWorkspace"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Autocomplete
                  sx={{ gridArea: 'originalWorkspace' }}
                  value={value}
                  options={workspaces}
                  isOptionEqualToValue={(option, value) => option.key === value.key}
                  getOptionLabel={({ name }: Package) => name}
                  renderOption={(props, { key, name }) => <ListItem {...props} key={key}>{name}</ListItem>}
                  renderInput={(params) => <TextField {...params} required label="Workspace"/>}
                  onChange={(_, value) => {
                    setValue('originalPackage', null)
                    setValue('originalVersion', null)
                    onChange(value)
                  }}
                  data-testid="PreviousWorkspaceAutocomplete"
                />
              )}
            />
            <Controller
              name="originalPackage"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Autocomplete
                  autoSelect
                  filterOptions={disableAutocompleteSearch}
                  onInputChange={debounce(onOriginalPackageInputChange, DEFAULT_DEBOUNCE)}
                  sx={{ gridArea: 'originalPackage' }}
                  value={value}
                  loading={isOriginalPackagesLoading}
                  options={originalPackageOptions}
                  getOptionLabel={({ name }: Package) => name}
                  renderOption={(props, { key, name }) => <ListItem {...props} key={key}>{name}</ListItem>}
                  renderInput={(params) => <TextField {...params} required label={packageFieldLabel}/>}
                  onChange={(_, value) => {
                    setValue('originalVersion', null)
                    onChange(value)
                  }}
                  data-testid="PreviousPackageAutocomplete"
                />
              )}
            />
          </>
        }

        <Controller
          name="originalVersion"
          control={control}
          render={({ field: { value, onChange } }) => {
            const { versionKey } = getSplittedVersionKey(value?.key, value?.latestRevision)
            return (
              <VersionSelectorAutocomplete
                filterOptions={disableAutocompleteSearch}
                onInputChange={debounce(onOriginalPackageVersionInputChange, DEFAULT_DEBOUNCE)}
                sx={{ gridArea: 'originalVersion' }}
                inputIndicator={previousVersionHasProblems && previousVersion && (
                  <VersionErrorIndicator
                    versionKey={previousVersion.key}
                    hasErrors={previousVersion.hasErrors}
                    changelogHasErrors={previousVersion.changelogHasErrors}
                    apiProcessorVersion={previousVersion.apiProcessorVersion}
                    kind={kind}
                  />
                )}
                value={value ? { ...value, key: value.latestRevision ? versionKey : value.key } : null}
                loading={isOriginalPackageVersionsLoading}
                options={originalVersionOptions}
                isOptionEqualToValue={(option, value) => option.key === value.key}
                getOptionLabel={({ key }: PackageVersion) => key}
                renderOption={(props, version) => (
                  <VersionOptionItem key={version.key} props={props} version={version}/>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Version"
                    error={isPreviousVersionBlocking}
                  />
                )}
                onChange={(_, value) => onChange(value)}
                data-testid="PreviousVersionAutocomplete"
              />
            )
          }}
        />

        <Box
          sx={{ gridArea: 'swapper', alignSelf: 'center' }}
        >
          <Swapper onSwap={onSwap}/>
        </Box>

        <Typography
          sx={{ gridArea: 'changedTitle' }}
          variant="button"
        >
          Current
        </Typography>

        {packageMode &&
          <>
            <Controller
              name="changedWorkspace"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Autocomplete
                  sx={{ gridArea: 'changedWorkspace' }}
                  value={value}
                  options={workspaces}
                  isOptionEqualToValue={(option, value) => option.key === value.key}
                  getOptionLabel={({ name }: Package) => name}
                  renderOption={(props, { key, name }) => <ListItem {...props} key={key}>{name}</ListItem>}
                  renderInput={(params) => <TextField {...params} required label="Workspace"/>}
                  onChange={(_, value) => {
                    setValue('changedPackage', null)
                    setValue('changedVersion', null)
                    onChange(value)
                  }}
                  data-testid="CurrentWorkspaceAutocomplete"
                />
              )}
            />
            <Controller
              name="changedPackage"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Autocomplete
                  autoSelect
                  filterOptions={disableAutocompleteSearch}
                  onInputChange={debounce(onChangedPackageInputChange, DEFAULT_DEBOUNCE)}
                  sx={{ gridArea: 'changedPackage' }}
                  value={value}
                  loading={isChangedPackagesLoading}
                  options={changedPackageOptions}
                  getOptionLabel={({ name }: Package) => name}
                  renderOption={(props, { key, name }) => <ListItem {...props} key={key}>{name}</ListItem>}
                  renderInput={(params) => <TextField {...params} required label={packageFieldLabel}/>}
                  onChange={(_, value) => {
                    setValue('changedVersion', null)
                    onChange(value)
                  }}
                  data-testid="CurrentPackageAutocomplete"
                />
              )}
            />
          </>
        }

        <Controller
          name="changedVersion"
          control={control}
          render={({ field: { value, onChange } }) => {
            const { versionKey } = getSplittedVersionKey(value?.key, value?.latestRevision)
            return (
              <VersionSelectorAutocomplete
                filterOptions={disableAutocompleteSearch}
                onInputChange={debounce(onChangedPackageVersionInputChange, DEFAULT_DEBOUNCE)}
                sx={{ gridArea: 'changedVersion' }}
                inputIndicator={currentVersionHasProblems && currentVersion && (
                  <VersionErrorIndicator
                    versionKey={currentVersion.key}
                    hasErrors={currentVersion.hasErrors}
                    changelogHasErrors={currentVersion.changelogHasErrors}
                    apiProcessorVersion={currentVersion.apiProcessorVersion}
                    kind={kind}
                  />
                )}
                value={value ? { ...value, key: value.latestRevision ? versionKey : value.key } : null}
                loading={isChangedPackageVersionsLoading}
                options={changedVersionOptions}
                isOptionEqualToValue={(option, value) => option.key === value.key}
                getOptionLabel={({ key }: PackageVersion) => key}
                renderOption={(props, version) => (
                  <VersionOptionItem key={version.key} props={props} version={version}/>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Version"
                    error={isCurrentVersionBlocking}
                  />
                )}
                onChange={(_, value) => onChange(value)}
                data-testid="CurrentVersionAutocomplete"
              />
            )
          }}
        />
      </DialogContent>
      <Box sx={{ maxWidth: '692px', padding: '0 24px' }}>
        <VersionErrorFormMessage
          data-testid="CompareVersionsFormMessage"
          message={currentVersionFormHelperText ?? previousVersionFormHelperText}
        />
      </Box>
      <DialogActions>

        <LoadingButton
          variant="contained"
          type="submit"
          loading={isApiTypeFetching}
          disabled={isPreviousVersionBlocking || isCurrentVersionBlocking}
          data-testid="CompareButton"
        >
          Compare
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)} data-testid="CancelButton">
          Cancel
        </Button>
        <Box sx={{ marginLeft: 'auto' }}>
          <LoadingButton
            variant="outlined"
            onClick={() => setPackageMode(!packageMode)}
            disabled={packageMode}
            loading={isDefaultOriginalPackageLoading}
            data-testid="ChangePackagesButton"
          >
            {changeButtonLabel}
          </LoadingButton>
        </Box>
      </DialogActions>
    </DialogForm>
  )
})

CompareVersionsDialogForm.displayName = 'CompareVersionsDialogForm'

const DIALOG_CONTENT_STYLES = {
  display: 'grid',
  columnGap: 1,
  gridTemplateRows: 'repeat(3, max-content)',
  gridTemplateColumns: '300px max-content 300px',
  gridTemplateAreas: `
    'originalTitle     originalTitle   changedTitle'
    'originalWorkspace   swapper       changedWorkspace'
    'originalPackage   swapper         changedPackage'
    'originalVersion   swapper         changedVersion'
  `,
}
