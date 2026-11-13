import WorkspacesOutlinedIcon from '@mui/icons-material/WorkspacesOutlined'
import { LoadingButton } from '@mui/lab'
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
  ListItemIcon,
  ListItemText,
  styled,
  TextField,
} from '@mui/material'
import { type FC, type ReactNode, useEffect, useMemo } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

import type { Key } from '../../entities/keys'
import { type Package, WORKSPACE_KIND } from '../../entities/packages'
import { GroupIcon } from '../../icons/GroupIcon'
import { DEFAULT_DEBOUNCE } from '../../utils/constants'
import { disableAutocompleteSearch } from '../../utils/mui'
import { ALIAS_VALIDATION_RULES } from '../../utils/validations'
import { DialogForm } from '../DialogForm'

export type BaseDialogFormValues = {
  name: string
  alias: string
  parentGroup?: Key
  description?: string
  isPrivate: boolean
}

export type BaseDialogFormProps = {
  open: boolean
  setOpen: (value: boolean) => void
  onSubmit: () => void
  title: string
  currentWorkspace?: Package
  parentPackage?: Package | null
  packages?: ReadonlyArray<Package>
  arePackagesLoading?: boolean
  packageSearch?: string
  onPackageSearch?: (textFilter: string) => void
  showParent?: boolean
  submitText?: string
  isLoading?: boolean
  submitDisabled?: boolean
  submitError?: Error | null
  children?: ReactNode
  formError?: ReactNode
}

export const BaseDialogForm: FC<BaseDialogFormProps> = ({
  open,
  setOpen,
  onSubmit,
  title,
  currentWorkspace,
  parentPackage,
  packages = [],
  arePackagesLoading = false,
  packageSearch = '',
  onPackageSearch,
  showParent = true,
  submitText = 'Submit',
  isLoading = false,
  submitDisabled = false,
  submitError,
  children,
  formError,
}) => {
  const { control, reset } = useFormContext<BaseDialogFormValues>()
  const debouncedOnPackageInputChange = useMemo(
    () => debounce((_: unknown, value: string) => onPackageSearch?.(value), DEFAULT_DEBOUNCE),
    [onPackageSearch],
  )
  const includeSelectedWorkspace = currentWorkspace &&
    currentWorkspace.name.toLowerCase().includes(packageSearch.toLowerCase())

  useEffect(() => () => debouncedOnPackageInputChange.clear(), [debouncedOnPackageInputChange])
  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  return (
    <DialogForm open={open} onClose={() => setOpen(false)} onSubmit={onSubmit}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Controller
          name="name"
          control={control}
          render={({ field }) => <TextField {...field} autoFocus required label="Name" data-testid="NameTextField" />}
        />
        {showParent && (
          <Controller
            name="parentGroup"
            control={control}
            render={({ field }) => (
              <Autocomplete<Package>
                options={includeSelectedWorkspace ? [currentWorkspace, ...packages] : packages}
                value={[currentWorkspace, parentPackage, ...packages].find(item => item?.key === field.value) ?? null}
                loading={arePackagesLoading}
                filterOptions={disableAutocompleteSearch}
                getOptionLabel={({ name }) => name}
                renderOption={(props, { key, name, kind }) => (
                  <ListItem {...props} key={key}>
                    <ListItemIcon sx={{ minWidth: 3, mr: 1 }}>
                      {kind === WORKSPACE_KIND ? <WorkspaceIcon /> : <GroupIcon />}
                    </ListItemIcon>
                    <ListItemText>{name}</ListItemText>
                  </ListItem>
                )}
                isOptionEqualToValue={(option, value) => option.key === value.key}
                renderInput={params => <TextField {...params} required label="Workspace/Parent Group" />}
                onChange={(_, value) => field.onChange(value?.key ?? '')}
                onBlur={field.onBlur}
                onInputChange={debouncedOnPackageInputChange}
                data-testid="ParentAutocomplete"
              />
            )}
          />
        )}
        <Controller
          name="alias"
          control={control}
          rules={{ validate: ALIAS_VALIDATION_RULES }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              required
              label="Alias"
              error={!!fieldState.error || !!submitError}
              helperText={fieldState.error?.message || submitError?.message}
              data-testid="AliasTextField"
            />
          )}
        />
        {children}
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ''}
              multiline
              rows={4}
              label="Description"
              data-testid="DescriptionTextField"
            />
          )}
        />
        {formError}
        <Controller
          name="isPrivate"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  name={field.name}
                  checked={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  data-testid="PackageVisibilityCheckbox"
                />
              }
              label="Private"
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <LoadingButton
          variant="contained"
          type="submit"
          loading={isLoading}
          disabled={submitDisabled}
          data-testid={`${submitText}Button`}
        >
          {submitText}
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)} data-testid="CancelButton">Cancel</Button>
      </DialogActions>
    </DialogForm>
  )
}
BaseDialogForm.displayName = 'BaseDialogForm'

const WorkspaceIcon = styled(WorkspacesOutlinedIcon)({ height: '20px', width: '20px' })
