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
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { DialogForm } from '../DialogForm'
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import { Controller, useForm } from 'react-hook-form'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { ErrorTypography } from '../Typography/ErrorTypography'

export type RunReportFormData = {
  idpUrl: string
  username: string
  password: string
}

export type RunReportDialogForm = {
  open: boolean
  setOpen: (value: boolean) => void
  onRunReport: (data: RunReportFormData) => void
  isRunning: boolean
  defaultIdpUrl?: string
  onIdpChange?: (value: string) => void
  errorMessage?: string
}
export const RunReportDialogForm: FC<RunReportDialogForm> = memo<RunReportDialogForm>(({
  open,
  setOpen,
  onRunReport,
  isRunning,
  defaultIdpUrl = '',
  onIdpChange,
  errorMessage,
}) => {
  const [passwordVisible, setPasswordVisible] = useState(false)

  const defaultValues = useMemo(() => ({
    idpUrl: defaultIdpUrl,
    username: '',
    password: '',
  }), [defaultIdpUrl])

  const {
    handleSubmit,
    control,
    setValue,
    formState,
  } = useForm<RunReportFormData>({ defaultValues })

  const onRunCallback = useCallback(async (data: RunReportFormData): Promise<void> => {
    onRunReport(data)
  }, [onRunReport])

  useEffect(() => {
    setValue('idpUrl', defaultIdpUrl)
  }, [defaultIdpUrl, setValue])

  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={handleSubmit(onRunCallback)}
    >
      <DialogTitle>
        Run Gateway Routing Report
      </DialogTitle>
      <DialogContent>
        <Controller
          name="idpUrl"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value}
              required
              disabled={isRunning}
              label="Identity Provider URL"
              error={!!formState.errors.idpUrl}
              onChange={(event) => {
                setValue('idpUrl', event.target.value)
                onIdpChange?.(event.target.value)
              }}
              data-testid="IdpUrlTextField"
            />
          )}
        />
        <Controller
          name="username"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value}
              required
              disabled={isRunning}
              label="Username"
              error={!!formState.errors.username}
              onChange={(event) => setValue('username', event.target.value)}
              data-testid="UsernameTextField"
            />
          )}
        />
        {/*todo take out password input to shared*/}
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value}
              required
              disabled={isRunning}
              label="Password"
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
              data-testid="PasswordTextField"
            />
          )}
        />
        {errorMessage && (
          <Box pt={2}>
            <ErrorTypography>{errorMessage}</ErrorTypography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <LoadingButton
          variant="contained"
          type="submit"
          loading={isRunning}
          data-testid="RunReportButton"
        >
          Run Report
        </LoadingButton>
        <Button variant="outlined" onClick={() => setOpen(false)} data-testid="CancelButton">
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})
