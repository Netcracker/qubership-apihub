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
import React, { memo, useCallback, useMemo, useState } from 'react'
import { Box, IconButton, InputAdornment, TextField, Typography } from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { Controller, useForm } from 'react-hook-form'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'

const DEFAULT_TENANT = 'cloud-common'

export type IdpAuthTokenFormData = {
  idpUrl: string
  username: string
  password: string
  tenant: string
}

export type IdpAuthTokenForm = {
  onGetUdpAuthToken: (data: IdpAuthTokenFormData) => void
  isLoading: boolean
  defaultIdpUrl?: string
  onIdpChange?: (value: string) => void
}

//First Order Component
export const IdpAuthTokenForm: FC<IdpAuthTokenForm> = memo<IdpAuthTokenForm>(({
  onGetUdpAuthToken,
  isLoading,
  defaultIdpUrl = '',
  onIdpChange,
}) => {
  const [passwordVisible, setPasswordVisible] = useState(false)

  const defaultValues = useMemo(() => ({
    idpUrl: defaultIdpUrl,
    username: '',
    password: '',
    tenant: DEFAULT_TENANT,
  }), [defaultIdpUrl])

  const {
    handleSubmit,
    control,
    setValue,
    formState,
  } = useForm<IdpAuthTokenFormData>({ defaultValues })

  const onHandleSubmit = useCallback(async (data: IdpAuthTokenFormData): Promise<void> => {
    onGetUdpAuthToken(data)
  }, [onGetUdpAuthToken])

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onHandleSubmit)}
      display="flex"
      flexWrap="wrap"
      alignItems="center"
      gap="10px 20px"
      width="100%"
    >
      <Box
        width={340}
        display="flex"
        gap={2}
        alignItems="center"
        maxWidth="max-content"
        justifyContent="center"
      >
        <Typography variant="caption" minWidth="max-content">Identity Provide URL*</Typography>
        <Controller
          name="idpUrl"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value}
              size="small"
              sx={{
                margin: 0,
                input: {
                  padding: '0px 10px',
                  margin: 0,
                  width: '200px',
                },
              }}
              disabled={isLoading}
              required
              placeholder="Identity Provider URL"
              error={!!formState.errors.idpUrl}
              onChange={(event) => {
                setValue('idpUrl', event.target.value)
                onIdpChange?.(event.target.value)
              }}
            />
          )}
        />
      </Box>

      <Box
        width={280}
        display="flex"
        gap={2}
        alignItems="center"
        maxWidth="max-content"
        justifyContent="center"
      >
        <Typography variant="caption" minWidth="max-content">Tenant*</Typography>
        <Controller
          name="tenant"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              size="small"
              sx={{
                margin: 0,
                input: {
                  padding: '0px 10px',
                  margin: 0,
                  width: '200px',
                },
              }}
              placeholder="Tenant"
              value={field.value}
              disabled={isLoading}
              required
              error={!!formState.errors.username}
              onChange={(event) => setValue('tenant', event.target.value)}
            />
          )}
        />
      </Box>

      <Box
        width={280}
        display="flex"
        gap={2}
        alignItems="center"
        maxWidth="max-content"
        justifyContent="center"
      >
        <Typography variant="caption" minWidth="max-content">Username*</Typography>
        <Controller
          name="username"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              size="small"
              sx={{
                margin: 0,
                input: {
                  padding: '0px 10px',
                  margin: 0,
                  width: '200px',
                },
              }}
              placeholder="Username"
              value={field.value}
              disabled={isLoading}
              required
              error={!!formState.errors.username}
              onChange={(event) => setValue('username', event.target.value)}
            />
          )}
        />
      </Box>

      <Box
        width={280}
        display="flex"
        gap={2}
        alignItems="center"
        maxWidth="max-content"
        justifyContent="center"
      >
        <Typography variant="caption" minWidth="max-content">Password*</Typography>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              size="small"
              sx={{
                margin: 0,
                input: {
                  padding: '0px 10px',
                  margin: 0,
                  width: '200px',
                },
              }}
              value={field.value}
              disabled={isLoading}
              required
              placeholder="Password"
              type={passwordVisible ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton edge="end" onClick={() => setPasswordVisible(!passwordVisible)}>
                      {passwordVisible ? <VisibilityOffOutlinedIcon/> : <VisibilityOutlinedIcon/>}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              error={!!formState.errors.password}
              onChange={(event) => setValue('password', event.target.value)}
            />
          )}
        />
      </Box>
      <Box>
        <LoadingButton
          sx={{ p: '15px 20px', mt: '1px' }}
          loading={isLoading}
          variant="contained"
          type="submit"
        >
          Authenticate
        </LoadingButton>
      </Box>
    </Box>
  )
})
