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
import { memo, useCallback, useState } from 'react'
import { Autocomplete, Box, capitalize, CircularProgress, ListItem, TextField, Typography } from '@mui/material'
import { Controller, useForm } from 'react-hook-form'
import { DisplayToken } from './DisplayToken'
import { reverseTokenRoleMapping } from '../entities/tokens'
import type { GenerateApiKeyValue, TokenDataForm } from '../types/tokens'
import type { Key } from '../entities/keys'
import type { IsLoading } from '../utils/aliases'
import { ButtonWithHint } from './Buttons/ButtonWithHint'
import { UserAvatar } from './Users/UserAvatar'
import type { User } from '../types/user'
import { useDebounce } from 'react-use'
import { DEFAULT_DEBOUNCE } from '../utils/constants'

export type GenerateTokenFormProps = {
  roles: string[]
  users: User[] | undefined
  defaultUser: User | undefined
  disabled?: boolean
  isLoading: IsLoading
  generatedApiKey: Key
  generateApiKey: (data: GenerateApiKeyValue) => void
  setUserSearch: (search: string) => void
}

//First Order Component
export const GenerateTokenForm: FC<GenerateTokenFormProps> = memo(({
  roles,
  users,
  defaultUser,
  disabled = false,
  isLoading,
  generateApiKey,
  generatedApiKey,
  setUserSearch,
}) => {
  const { handleSubmit, setValue, control, reset } = useForm<TokenDataForm>({
    defaultValues: {
      name: '',
      createdFor: defaultUser ?? EMPTY_USER,
    },
  })

  const [searchValue, setSearchValue] = useState('')

  useDebounce(() => setUserSearch(searchValue), DEFAULT_DEBOUNCE, [searchValue])

  const onConfirmCallback = useCallback((value: TokenDataForm): void => {
    const { name, roles, createdFor } = value
    const mappedRoles = roles?.map(role => reverseTokenRoleMapping[role])

    generateApiKey({ name: name, roles: mappedRoles, createdFor: createdFor.key })
    reset()
  }, [generateApiKey, reset])

  if (generatedApiKey) {
    return <DisplayToken generatedApiKey={generatedApiKey}/>
  }

  return (
    <Box component="form" marginBottom={1} onSubmit={handleSubmit(onConfirmCallback)}>
      <Typography variant="body2">
        Enter the name of your application and select role for the token
      </Typography>
      <Box display="flex" alignItems="flex-start" gap={2}>
        <Controller
          name="name"
          rules={{
            required: 'The field must be filled',
          }}
          control={control}
          render={({ field }) => <TextField
            {...field}
            required
            disabled={disabled}
            sx={{ width: '260px' }}
            value={field.value}
            label="Name"
            onChange={field.onChange}
            data-testid="NameTextField"
          />}
        />
        <Controller
          name="roles"
          control={control}
          render={({ field: { value } }) => (
            <Autocomplete<string, true>
              multiple
              disabled={disabled}
              sx={{ width: '260px' }}
              value={value ?? []}
              options={roles}
              renderOption={(props, option) => <ListItem
                {...props}
                key={option}
                data-testid={`ListItem-${option}`}
              >
                {capitalize(option)}
              </ListItem>}
              renderTags={(values) =>
                values.map((value, index) =>
                  <Typography fontSize="13px">
                    {capitalize(value)} {index === values.length - 1 ? undefined : ', '}
                  </Typography>,
                )
              }
              onChange={(_, roles) => setValue('roles', roles)}
              renderInput={(params) =>
                <TextField
                  {...params}
                  label="Roles"
                  inputProps={{
                    ...params.inputProps,
                    readOnly: true,
                  }}
                />
              }
              data-testid="RolesAutocomplete"
            />
          )}
        />
        <Controller
          name="createdFor"
          rules={{
            required: 'The field must be filled',
          }}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Autocomplete
              isOptionEqualToValue={(option, value) => option.key === value.key}
              value={value}
              disabled={disabled}
              sx={{ width: '260px' }}
              loading={isLoading}
              loadingText={<CircularProgress size={16}/>}
              options={users ?? []}
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
                  required
                  label="Created For"
                  onChange={(event) => setSearchValue(event?.target?.value ?? '')}
                />
              }
              data-testid="CreatedForAutocomplete"
            />
          )}
        />
        <ButtonWithHint
          variant="contained"
          size="large"
          sx={{ mt: 1.2 }}
          disabled={disabled}
          disableHint={!disabled}
          hint="You do not have permission to generate token"
          isLoading={isLoading}
          title="Generate"
          type="submit"
          testId="GenerateButton"
        />
      </Box>
    </Box>
  )
})

const EMPTY_USER: User = {
  key: '',
  name: '',
  avatarUrl: '',
}
