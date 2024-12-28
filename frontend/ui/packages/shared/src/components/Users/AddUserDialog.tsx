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
import React, { memo, useCallback, useState } from 'react'
import type { Role, Roles } from '../../types/roles'
import type { PopupProps } from '../PopupDelegate'
import { PopupDelegate } from '../PopupDelegate'
import { DialogForm } from '../DialogForm'
import type { User } from '../../types/user'
import { Box, Button, Chip, DialogActions, DialogContent, DialogTitle, ListItem } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { useDebounce } from 'react-use'
import { CheckIcon } from '../../icons/CheckIcon'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { UserAvatar } from './UserAvatar'
import { DEFAULT_DEBOUNCE } from '../../utils/constants'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { MultipleSelectorAutocomplete } from '../MultipleSelectorAutocomplete'
import { SHOW_ADD_USER_DIALOG } from '../../types/dialogs'

export type AddUserDialogProps = {
  users: ReadonlyArray<User> | undefined
  roles: Roles
  onConfirm: (users: User[], roles: Role[]) => void
  setUserSearch: (search: string) => void
  isUsersLoading: boolean
}

export const AddUserDialog: FC<AddUserDialogProps> = memo((props) => {
  const {
    users,
    roles,
    onConfirm,
    setUserSearch,
    isUsersLoading,
  } = props
  return (
    <PopupDelegate
      type={SHOW_ADD_USER_DIALOG}
      render={props =>
        <AddUserPopup
          {...props}
          users={users}
          roles={roles}
          onConfirm={onConfirm}
          setUserSearch={setUserSearch}
          isUsersLoading={isUsersLoading}
        />}
    />
  )
})

type AddUserPopupProps = PopupProps & AddUserDialogProps

type AddUserForm = {
  users: User[]
  roles: Role[]
}

export const AddUserPopup: FC<AddUserPopupProps> = memo<AddUserPopupProps>((props) => {
  const {
    open,
    setOpen,
    users,
    roles,
    onConfirm,
    setUserSearch,
    isUsersLoading,
  } = props

  const { handleSubmit, control } = useForm<AddUserForm>()

  const [searchValue, setSearchValue] = useState('')
  useDebounce(() => setUserSearch(searchValue), DEFAULT_DEBOUNCE, [searchValue])

  const onConfirmCallback = useCallback((formData: AddUserForm): void => {
    const { users, roles } = formData
    onConfirm(users, roles)
    setOpen(false)
  }, [onConfirm, setOpen])

  const onClose = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  return (
    <DialogForm
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit(onConfirmCallback)}
    >
      <DialogTitle>
        Add User
      </DialogTitle>
      <DialogContent>
        <Controller
          name="users"
          control={control}
          render={({ field: { value, onChange } }) =>
            <MultipleSelectorAutocomplete<User>
              id="user-selector"
              options={users ?? []}
              value={value}
              inputLabel="User"
              icon={<SearchOutlinedIcon/>}
              isLoading={isUsersLoading}
              onChange={onChange}
              getOptionLabel={(option) => option.name ?? option}
              setInputSearch={setSearchValue}
              renderOption={(props, { key, name, avatarUrl }) => {
                const selected = value?.some(user => user.key === key)
                return (
                  <ListItem {...props} key={name} sx={{ pointerEvents: selected ? 'none' : '' }}>
                    {selected ? <CheckIcon/> : null}
                    <UserAvatar
                      sx={{
                        marginLeft: selected ? '6px' : '21px',
                        marginRight: '6px',
                      }}
                      name={name}
                      src={avatarUrl}
                      size="small"
                    />
                    {name}
                  </ListItem>
                )
              }}
              renderTags={(value: User[], getTagProps) =>
                value.map((option: User, index: number) => (
                  <Chip
                    variant="outlined"
                    size="small"
                    sx={DEFAULT_CHIP_STYLE}
                    avatar={<CheckIcon/>}
                    deleteIcon={<CloseOutlinedIcon/>}
                    label={option?.name} {...getTagProps({ index })}
                    data-testid="UserChip"
                  />
                ))}
              testId="UsersAutocomplete"
            />
          }
        />
        <Controller
          name="roles"
          control={control}
          render={({ field: { value, onChange } }) =>
            <MultipleSelectorAutocomplete<Role>
              id="roles-selector"
              options={roles ?? []}
              value={value}
              inputLabel="Role"
              onChange={onChange}
              getOptionLabel={(option) => option.role ?? option}
              renderOption={(props, { key, role }) => {
                const selected = value?.some(role => role.key === key)
                return (
                  <ListItem {...props} key={role} sx={{ pointerEvents: selected ? 'none' : '' }} data-testid={`${role}ListItem`}>
                    {selected ? <CheckIcon/> : null}
                    <Box sx={{ marginLeft: selected ? '6px' : '21px' }}>
                      {role}
                    </Box>
                  </ListItem>
                )
              }}
              renderTags={(value: Roles, getTagProps) =>
                value.map((option: Role, index: number) => (
                  <Chip
                    variant="outlined"
                    size="small"
                    sx={DEFAULT_CHIP_STYLE}
                    avatar={<CheckIcon/>}
                    deleteIcon={<CloseOutlinedIcon/>}
                    label={option?.role} {...getTagProps({ index })}
                  />
                ))
              }
              testId="RolesAutocomplete"
            />
          }
        />
      </DialogContent>
      <DialogActions>
        <Button variant="contained" type="submit" data-testid="AddButton">
          Add
        </Button>
        <Button variant="outlined" onClick={() => setOpen(false)} data-testid="CancelButton">
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

const DEFAULT_CHIP_STYLE = {
  border: 'none',
  width: '350px',
  display: 'flex',
  justifyContent: 'space-between',
  '.MuiChip-label': {
    mr: 'auto',
  },
  '&:hover': {
    backgroundColor: '#2E3A5217',
    '& .MuiChip-deleteIcon': {
      display: 'block',
    },
  },
  '& .MuiChip-deleteIcon': {
    display: 'none',
  },
}
