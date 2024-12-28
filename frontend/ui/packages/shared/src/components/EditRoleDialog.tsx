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
import * as React from 'react'
import { memo, useCallback, useMemo } from 'react'
import {
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputLabel,
  TextField,
} from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import type { PopupProps } from './PopupDelegate'
import { PopupDelegate } from './PopupDelegate'
import type { Permission } from '../types/permissions'
import type { ControllerRenderProps } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'
import { DialogForm } from './DialogForm'
import type { Role } from '../types/roles'
import { CheckboxCheckedIcon } from '../icons/CheckboxCheckedIcon'
import { CheckboxDisabledCheckedIcon } from '../icons/CheckboxDisabledCheckedIcon'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import { READ_PERMISSION } from '../entities/package-permissions'

export const EditRoleDialog: FC = memo(() => {
  return (
    <PopupDelegate
      type={SHOW_EDIT_ROLE_DIALOG}
      render={props => <EditRolePopup {...props}/>}
    />
  )
})

export const SHOW_EDIT_ROLE_DIALOG = 'show-edit-role-dialog'

export type ShowEditRoleDetail = {
  permissions: ReadonlyArray<Permission>
  role?: Role
  onConfirm: (role: Role) => void
  isRoleUnique?: (roleName: string) => boolean
}

export type EditRoleForm = Readonly<{
  role: string
  permissions: Permission[]
}>

export const EditRolePopup: FC<PopupProps> = memo<PopupProps>(({ open, setOpen, detail }) => {
  const [permissions, role, onConfirm, isRoleUnique] = useMemo(() => {
    const { permissions, role, onConfirm, isRoleUnique } = detail as ShowEditRoleDetail
    return [permissions, role, onConfirm, isRoleUnique]
  }, [detail])

  const { handleSubmit, control, formState: { errors, isDirty } } = useForm<EditRoleForm>({
    defaultValues: {
      permissions: permissions.filter(({ permission }) =>
        role?.permissions.includes(permission) || permission === READ_PERMISSION,
      ),
      role: role?.role,
    },
  })

  const onConfirmCallback = useCallback((value: EditRoleForm): void => {
    setOpen(false)
    onConfirm({
      key: role?.key || '',
      role: value.role,
      permissions: value.permissions.map((p) => p.permission),
    })
  }, [onConfirm, role?.key, setOpen])

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  const renderPermissions = useCallback(({ field: { value, onChange } }: {
    field: ControllerRenderProps<EditRoleForm, 'permissions'>
  }) => {
    const onToggleCheckbox = (checked: boolean, permission: Permission): void => {
      if (checked) {
        return onChange([...value, permission])
      }
      onChange(value.filter((value) => value.permission !== permission.permission))
    }
    return <>
      {permissions.map(
        (permission) => <PermissionControl
          key={permission.permission}
          permission={permission}
          onToggleCheckbox={onToggleCheckbox}
          checked={value.some((existingValue) => existingValue.permission === permission.permission)}
        />,
      )}
    </>
  }, [permissions])

  const confirmButtonName = role ? 'Update' : 'Create'
  const dialogTitle = role ? 'Edit Role' : 'Create Role'

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit(onConfirmCallback)}
      width="440px"
    >
      <DialogTitle>
        {dialogTitle}
        <IconButton
          sx={{ position: 'absolute', right: 8, top: 8, color: '#626D82' }}
          onClick={onClose}
        >
          <CloseOutlinedIcon fontSize="small"/>
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{
        display: 'flex',
        flexDirection: 'column',
        width: 'auto',
        minWidth: 'unset',
      }}>
        <Controller
          name="role"
          rules={{
            required: 'The field must be filled',
            validate: role ? {} : {
              alreadyExists: (role) => isRoleUnique?.(role) || 'Role already exists',
            },
          }}
          control={control}
          render={({ field }) => <TextField
            {...field}
            sx={{ mt: '4px', mb: '12px' }}
            required
            inputProps={{ required: false }} // disables "please fill out this field" prompt
            value={field.value}
            disabled={!!role}
            label="Role Name"
            error={!!errors.role}
            helperText={errors.role?.message}
            InputProps={errors.role ? { endAdornment: <ErrorOutlinedIcon color="error" data-testid="ErrorIcon"/> } : {}}
            data-testid="RoleNameTextField"
          />}
        />
        <InputLabel required sx={{ fontWeight: 500, color: '#000000' }}>Select permissions</InputLabel>
        <Controller
          name="permissions"
          control={control}
          render={renderPermissions}
        />
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          type="submit"
          disabled={role && !isDirty}
          data-testid={`${confirmButtonName}Button`}
        >
          {confirmButtonName}
        </Button>
        <Button
          variant="outlined"
          onClick={onClose}
          data-testid="CancelButton"
        >
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

export const PermissionControl: FC<{
  permission: Permission
  checked: boolean
  onToggleCheckbox: (checked: boolean, permission: Permission) => void
}> = memo(({ permission, checked, onToggleCheckbox }) => {
  const { permission: permissionKey, name: permissionName } = permission
  const disabled = permissionKey === READ_PERMISSION

  function handleToggle(_: React.ChangeEvent<HTMLInputElement>, checked: boolean): void {
    onToggleCheckbox(checked, permission)
  }

  return (
    <FormControlLabel
      key={permissionKey}
      label={permissionName}
      sx={{ mt: '6px' }}
      control={
        <Checkbox
          value={permission}
          disabled={disabled}
          checked={checked}
          onChange={handleToggle}
          checkedIcon={disabled ? <CheckboxDisabledCheckedIcon/> : <CheckboxCheckedIcon/>}
          data-testid={`${permission.permission}Checkbox`}
        />
      }
    />
  )
})
