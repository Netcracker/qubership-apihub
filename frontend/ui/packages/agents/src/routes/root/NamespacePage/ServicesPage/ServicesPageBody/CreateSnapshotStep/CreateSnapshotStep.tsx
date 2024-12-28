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
import { Autocomplete, Box, Button, TextField, Typography } from '@mui/material'
import type { Control, FieldErrors } from 'react-hook-form'
import { Controller, useForm } from 'react-hook-form'
import { LoadingButton } from '@mui/lab'
import type { CreateSnapshot } from './useCreateSnapshot'
import { useCreateSnapshot } from './useCreateSnapshot'
import { useCreateSnapshotStepStatus } from './useCreateSnapshotStepStatus'
import { CreateSnapshotStepTable } from './CreateSnapshotStepTable'
import { useSetSnapshotTableSelectable, useSnapshotTableSelectable } from '../../SnapshotTableProvider'
import { useVersionOptions } from '../../../AutomationPage/useVersionOptions'
import { useBaselineOptions } from '../../../useBaselineOptions'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import type { IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useCreateSnapshotPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import {
  ERROR_STEP_STATUS,
  INITIAL_STEP_STATUS, RUNNING_STEP_STATUS, SUCCESS_STEP_STATUS,
  useCreateSnapshotStep,
  usePromoteVersionStep,
  useValidationResultsStep,
} from '../../ServicesPageProvider/ServicesStepsProvider'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { ServiceKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'

export const CreateSnapshotStep: FC = memo(() => {
  const [createSnapshot, isLoading] = useCreateSnapshot()
  const [
    control,
    nameOptions,
    baselineOptions,
    onSubmit,
    onReset,
    isCreateSnapshotRunning,
    isCreateSnapshotSuccess,
    isCreateSnapshotAvailable,
    isCreateSnapshotFinished,
    baseline,
    formErrors,
  ] = useToolbarData(createSnapshot)

  const isTableSelectable = useSnapshotTableSelectable()
  const setIsTableSelectable = useSetSnapshotTableSelectable()

  useEffect(() => {
    setIsTableSelectable(!isCreateSnapshotRunning && !isCreateSnapshotFinished)
  }, [isCreateSnapshotFinished, isCreateSnapshotRunning, setIsTableSelectable])

  const [searchValue, setSearchValue] = useState('')

  return (
    <Box
      height="100%"
      component="form"
      onSubmit={onSubmit}
    >
      <Box
        sx={{
          gap: 2,
          alignItems: 'top',
          display: 'grid',
          gridTemplateRows: 'max-content',
          gridTemplateColumns: '200px 200px 280px 1fr',
        }}
      >
        <Controller
          name="name"
          control={control}
          rules={{
            validate: {
              notEqualToBaseline: (snapshotName) => snapshotName !== baseline || 'Snapshot name must not be the same as baseline',
            },
          }}
          render={({ field: { value, onChange } }) => (
            <Autocomplete
              data-testid="SnapshotNameAutocomplete"
              disabled={isCreateSnapshotRunning || isCreateSnapshotFinished}
              freeSolo
              value={value}
              options={nameOptions}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Snapshot Name"
                  variant="outlined"
                  onChange={onChange}
                />
              )}
              onChange={(_, value) => onChange(value)}
            />
          )}
        />

        <Controller
          name="baseline"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Autocomplete
              data-testid="BaselineAutocomplete"
              disabled={isCreateSnapshotRunning || isCreateSnapshotFinished}
              freeSolo
              value={value}
              options={baselineOptions}
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="Baseline (Release Version)"
                  variant="outlined"
                  onChange={onChange}
                />
              )}
              onChange={(_, value) => onChange(value)}
            />
          )}
        />

        <Box sx={{ ml: 'auto', alignSelf: 'center' }}>
          <Button
            data-testid="ResetButton"
            variant="outlined"
            sx={{ width: 90, mr: 2 }}
            disabled={isCreateSnapshotRunning}
            onClick={() => {
              onReset()
              setIsTableSelectable(true)
            }}
          >
            Reset
          </Button>

          <LoadingButton
            data-testid="CreateSnapshotButton"
            sx={{ width: 156 }}
            disabled={!isCreateSnapshotAvailable || isCreateSnapshotSuccess}
            variant={isCreateSnapshotSuccess ? 'outlined' : 'contained'}
            loading={isLoading || isCreateSnapshotRunning}
            onClick={() => {
              setIsTableSelectable(false)
            }}
            type="submit"
          >
            Create Snapshot
          </LoadingButton>
        </Box>

        <Box sx={{ alignSelf: 'center', ml: 'auto' }}>
          <SearchBar
            value={searchValue}
            onValueChange={setSearchValue}
          />
        </Box>
      </Box>
      <Typography
        data-testid="SnapshotNameErrorTypography"
        noWrap
        variant="subtitle2"
        color="#FF5260"
      >
        {formErrors.name?.message}
      </Typography>

      <Controller
        name="serviceKeys"
        control={control}
        render={({ field: { onChange, value } }) => (
          <CreateSnapshotStepTable
            selectable={isTableSelectable}
            selected={value}
            onSelect={onChange}
            searchValue={searchValue}
          />
        )}
      />
    </Box>
  )
})

type FormData = {
  name: string
  baseline: string
  serviceKeys: ServiceKey[]
}

type NameOptions = string[]
type BaselineOptions = string[]
type OnSubmit = () => void
type OnReset = () => void
type IsCreateAvailable = boolean
type IsCreateFinished = boolean

function useToolbarData(
  createSnapshot: CreateSnapshot,
): [
  Control<FormData>,
  NameOptions,
  BaselineOptions,
  OnSubmit,
  OnReset,
  IsLoading,
  IsSuccess,
  IsCreateAvailable,
  IsCreateFinished,
  FormData['baseline'],
  FieldErrors<FormData>,
] {
  const {
    createSnapshotPublicationOptions,
    resetCreateSnapshotPublicationOptions,
  } = useCreateSnapshotPublicationOptions()

  const defaultValues: FormData = useMemo(() => ({
    name: createSnapshotPublicationOptions.name,
    baseline: createSnapshotPublicationOptions.baseline,
    serviceKeys: createSnapshotPublicationOptions.serviceKeys,
  }), [createSnapshotPublicationOptions])

  const form = useForm<FormData>({ defaultValues })

  useEffect(() => form.reset(defaultValues), [defaultValues, form])

  const [, setValidationResultsStep] = useValidationResultsStep()
  const [, setPromoteVersionStep] = usePromoteVersionStep()

  const onSubmit = useMemo(
    () => form.handleSubmit(publishOptions => {
      setValidationResultsStep(prevState => ({ ...prevState, status: INITIAL_STEP_STATUS }))
      setPromoteVersionStep(prevState => ({ ...prevState, status: INITIAL_STEP_STATUS }))
      createSnapshot(publishOptions)
    }),
    [form, createSnapshot, setPromoteVersionStep, setValidationResultsStep],
  )

  const versionOptions = useVersionOptions()
  const baselineOptions = useBaselineOptions(true)

  const [, setCreateSnapshotStep] = useCreateSnapshotStep()
  const status = useCreateSnapshotStepStatus()
  useEffect(() => setCreateSnapshotStep(prevState => ({ ...prevState, status })), [setCreateSnapshotStep, status])

  const onReset = useCallback(() => {
    form.reset({
      name: '',
      baseline: '',
      serviceKeys: [],
    })
    resetCreateSnapshotPublicationOptions()
    setValidationResultsStep(prevState => ({ ...prevState, status: INITIAL_STEP_STATUS }))
    setPromoteVersionStep(prevState => ({ ...prevState, status: INITIAL_STEP_STATUS }))
  }, [form, resetCreateSnapshotPublicationOptions, setPromoteVersionStep, setValidationResultsStep])

  const { name, baseline, serviceKeys } = form.watch()

  const isCreateSnapshotAvailable = !!name && !!baseline && isNotEmpty(serviceKeys)

  return [
    form.control,
    versionOptions,
    baselineOptions,
    onSubmit,
    onReset,
    status === RUNNING_STEP_STATUS,
    status === SUCCESS_STEP_STATUS,
    isCreateSnapshotAvailable,
    status === SUCCESS_STEP_STATUS || status === ERROR_STEP_STATUS,
    baseline,
    form.formState.errors,
  ]
}
