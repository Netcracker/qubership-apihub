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

import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import { LoadingButton } from '@mui/lab'
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItem,
  TextField,
} from '@mui/material'
import type { FC } from 'react'
import React, { memo, useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useDebounce } from 'react-use'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import type { PopupProps } from './PopupDelegate'
import { PopupDelegate } from './PopupDelegate'
import { DialogForm } from './DialogForm'
import { UserAvatar } from './Users/UserAvatar'
import type { User } from '../types/user'
import type { Key } from '../entities/keys'
import { DEFAULT_DEBOUNCE } from '../utils/constants'

export type AddSystemAdministratorDialogProps = {
  users: User[] | undefined
  isUsersDataLoading: boolean
  onConfirm: (userId: Key) => void
  setUserSearch: (search: string) => void
}

export const SHOW_ADD_SYSTEM_ADMINISTRATOR_DIALOG = 'show-add-system-administrator-dialog'

export const AddSystemAdministratorDialog: FC<AddSystemAdministratorDialogProps> = memo(({
  users,
  isUsersDataLoading,
  onConfirm,
  setUserSearch,
}) => {
  return (
    <PopupDelegate
      type={SHOW_ADD_SYSTEM_ADMINISTRATOR_DIALOG}
      render={props =>
        <AddSystemAdministratorPopup
          {...props}
          users={users}
          onConfirm={onConfirm}
          isUsersDataLoading={isUsersDataLoading}
          setUserSearch={setUserSearch}
        />
      }
    />
  )
})

type AddSystemAdministratorPopupProps = PopupProps & AddSystemAdministratorDialogProps

type AddSystemAdministratorForm = {
  user: User
}

// First Order Component
export const AddSystemAdministratorPopup: FC<AddSystemAdministratorPopupProps> = memo<AddSystemAdministratorPopupProps>(({
  open,
  setOpen,
  users,
  isUsersDataLoading,
  setUserSearch,
  onConfirm,
}) => {
  const { handleSubmit, control, reset, formState: { errors } } = useForm<AddSystemAdministratorForm>()
  const [searchValue, setSearchValue] = useState('')

  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  useDebounce(() => setUserSearch(searchValue), DEFAULT_DEBOUNCE, [searchValue])

  const onConfirmCallback = useCallback(
    (formData: AddSystemAdministratorForm): void => {
      const { user } = formData
      onConfirm(user.key)
      setOpen(false)
    },
    [onConfirm, setOpen],
  )

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit(onConfirmCallback)}
    >
      <DialogTitle>
        Add User
      </DialogTitle>
      <DialogContent>
        <Controller
          name="user"
          rules={{
            required: 'The field must be filled',
          }}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Autocomplete
              sx={POPUP_INDICATOR_STYLE}
              value={value}
              loading={isUsersDataLoading}
              loadingText={<CircularProgress size={16}/>}
              options={users ?? []}
              popupIcon={
                <Box display="flex" gap={1} alignItems="center">
                  <SearchOutlinedIcon sx={ICON_STYLE}/>
                  {errors.user && <ErrorOutlinedIcon color="error"/>}
                </Box>
              }
              forcePopupIcon={true}
              getOptionLabel={(option) => option.name}
              onChange={(_, value) => onChange(value)}
              renderOption={(props, { name, avatarUrl }) => {
                return (
                  <ListItem {...props} key={name}>
                    <Box sx={{ pr: '6px' }}>
                      <UserAvatar
                        name={name}
                        src={avatarUrl}
                        size="small"
                      />
                    </Box>
                    {name}
                  </ListItem>
                )
              }}
              renderInput={(params) =>
                <TextField
                  {...params}
                  sx={{ mt: '4px', mb: '12px' }}
                  label="User"
                  onChange={(event) => setSearchValue(event?.target?.value ?? '')}
                  error={!!errors.user}
                  helperText={errors.user?.message}
                />
              }
            />
          )}
        />
      </DialogContent>
      <DialogActions>
        <LoadingButton variant="contained" type="submit" loading={false}>
          Add
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

const ICON_STYLE = {
  fontSize: '20px',
  color: '#626D82',
}

const POPUP_INDICATOR_STYLE = {
  '& .MuiAutocomplete-popupIndicator': {
    transform: 'none',
  },
}
