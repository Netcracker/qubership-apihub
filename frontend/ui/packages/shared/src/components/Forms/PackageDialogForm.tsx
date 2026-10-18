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

import type { FC } from 'react'
import { memo, useEffect, useMemo } from 'react'
import type { Package, PackageKind } from '../../entities/packages'
import { EMPTY_PACKAGE, WORKSPACE_KIND } from '../../entities/packages'
import {
  Autocomplete,
  Button,
  Checkbox,
  debounce,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  ListItem,
  TextField,
} from '@mui/material'
import { DEFAULT_DEBOUNCE } from '../../utils/constants'
import { Controller, useForm } from 'react-hook-form'
import { DialogForm } from '../DialogForm'
import { disableAutocompleteSearch } from '../../utils/mui'
import { GroupIcon } from '../../icons/GroupIcon'
import { ALIAS_VALIDATION_RULES } from '../../utils/validations'
import { LoadingButton } from '@mui/lab'
import ListItemIcon from '@mui/material/ListItemIcon'
import WorkspacesOutlinedIcon from '@mui/icons-material/WorkspacesOutlined'
import ListItemText from '@mui/material/ListItemText'

export type PackageDialogFormProps = {
  open: boolean
  setOpen: (value: boolean) => void
  onSubmit: (value: Package) => void
  title: string
  kind: PackageKind
  currentWorkspace?: Package
  isLoading?: boolean
  parentPackage?: Package | null
  packages?: ReadonlyArray<Package>
  arePackagesLoading?: boolean
  submitError?: Error | null
  packageSearch?: string
  onPackageSearch?: (testFilter: string) => void
  submitText?: string
}

export const PackageDialogForm: FC<PackageDialogFormProps> = memo<PackageDialogFormProps>(({
  open,
  setOpen,
  onSubmit,
  title,
  currentWorkspace,
  isLoading = false,
  parentPackage,
  kind,
  packages = [],
  arePackagesLoading = false,
  submitError,
  packageSearch = '',
  onPackageSearch,
  submitText = 'Submit',
}) => {
  const isWorkspace = kind === WORKSPACE_KIND
  const debouncedOnPackageInputChange = useMemo(
    () => debounce((_, value: string) => onPackageSearch?.(value), DEFAULT_DEBOUNCE),
    [onPackageSearch],
  )

  const includeSelectedWorkspace = currentWorkspace && currentWorkspace.name.toLowerCase().includes(packageSearch.toLowerCase())

  const defaultValues: Partial<Package> = useMemo(() => ({
    ...EMPTY_PACKAGE,
    kind: kind,
    parentGroup: parentPackage?.key,
  }), [parentPackage, kind])

  const { handleSubmit, control, setValue, reset, formState: { errors } } = useForm<Package>({ defaultValues })

  useEffect(() => {
    !open && reset()
  }, [open, reset])

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit(onSubmit)}
    >
      <DialogTitle>{title}</DialogTitle>

      <DialogContent>
        <Controller
          name="name"
          control={control}
          render={({ field }) => <TextField {...field} autoFocus required label="Name" data-testid="NameTextField"/>}
        />
        {!isWorkspace && <Controller
          name="parentGroup"
          control={control}
          render={() => <Autocomplete<Package>
            options={includeSelectedWorkspace ? [currentWorkspace, ...packages] : packages}
            loading={arePackagesLoading}
            filterOptions={disableAutocompleteSearch}
            defaultValue={parentPackage}
            getOptionLabel={({ name }) => name}
            renderOption={(props, { key, name, kind }) => (
              <ListItem {...props} key={key}>
                <ListItemIcon sx={{ minWidth: 3, mr: 1 }}>
                  {kind === WORKSPACE_KIND ? <WorkspaceIcon/> : <GroupIcon/>}
                </ListItemIcon>
                <ListItemText>
                  {name}
                </ListItemText>
              </ListItem>
            )}
            isOptionEqualToValue={(option, value) => option.key === value.key}
            renderInput={(params) => <TextField {...params} required label="Workspace/Parent Group"/>}
            onChange={(_, value) => setValue('parentGroup', value?.key ?? '')}
            onInputChange={debouncedOnPackageInputChange}
            data-testid="ParentAutocomplete"
          />}
        />}
        <Controller
          name="alias"
          control={control}
          rules={{ validate: ALIAS_VALIDATION_RULES }}
          render={({ field }) => (
            <TextField
              {...field}
              required
              label="Alias"
              error={!!errors.alias || !!submitError}
              helperText={!!errors.alias && errors.alias?.message || !!submitError && submitError.message}
              data-testid="AliasTextField"
            />
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field }) => <TextField {...field} multiline rows="4" type="text" label="Description" data-testid="DescriptionTextField"/>}
        />
        <Controller
          name="packageVisibility"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              {...field}
              control={<Checkbox data-testid="PackageVisibilityCheckbox"/>}
              label="Private"
            />
          )}
        />
      </DialogContent>

      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={isLoading} data-testid={`${submitText}Button`}>
          {submitText}
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)} data-testid="CancelButton">
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

export const WorkspaceIcon: FC = memo(() => (
  <WorkspacesOutlinedIcon
    sx={{
      height: '20px',
      width: '20px',
    }}
  />
))
