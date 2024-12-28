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

import type { FC, SyntheticEvent } from 'react'
import * as React from 'react'
import { memo } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  debounce,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import type { Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import type { Operation, OperationData, OperationsData } from '../entities/operations'
import { disableAutocompleteSearch } from '../utils/mui'
import { DEFAULT_DEBOUNCE } from '../utils/constants'
import type { IsLoading } from '../utils/aliases'
import type { TestableProps } from './Testable'
import { OperationOptionItem } from './OperationOptionItem'
import { DialogForm } from './DialogForm'
import { Swapper } from './Swapper'

export type CompareOperationPathsDialogFormData = {
  originalOperation: OperationData | null
  changedOperation: OperationData | null
}

export type CompareOperationPathsDialogData = {
  control: Control<CompareOperationPathsDialogFormData>
  originalOperationOptions: OperationsData
  changedOperationOptions: OperationsData
  onSwap: () => void
  onSubmit: () => void
  isOriginalOperationsLoading: boolean
  isChangedOperationsLoading: boolean
}

export type CompareOperationPathsDialogFormProps = CompareOperationPathsDialogData & {
  open: boolean
  setOpen: (value: boolean) => void
  onOriginalInputChange: (event: SyntheticEvent, value: string) => void
  onChangedInputChange: (event: SyntheticEvent, value: string) => void
}

// First Order Component //
export const CompareOperationPathsDialogForm: FC<CompareOperationPathsDialogFormProps> = memo(({
  open,
  setOpen,
  control,
  originalOperationOptions,
  changedOperationOptions,
  onSwap,
  onSubmit,
  isOriginalOperationsLoading,
  isChangedOperationsLoading,
  onOriginalInputChange,
  onChangedInputChange,
}) => {
  return (
    <DialogForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmit={onSubmit}
      maxWidth="md"
    >
      <DialogTitle>
        Select Operations to Compare
      </DialogTitle>
      <DialogContent sx={DIALOG_CONTENT_STYLES}>
        <Typography variant="button" sx={{ gridArea: 'originalTitle' }}>
          Original
        </Typography>
        <OperationController
          name="originalOperation"
          control={control}
          options={originalOperationOptions}
          isLoading={isOriginalOperationsLoading}
          onInputChange={onOriginalInputChange}
          testId="OriginalOperationAutocomplete"
        />

        <Box sx={{ gridArea: 'swapper', alignSelf: 'center' }}>
          <Swapper onSwap={onSwap}/>
        </Box>

        <Typography variant="button" sx={{ gridArea: 'changedTitle' }}>
          Changed
        </Typography>
        <OperationController
          name="changedOperation"
          control={control}
          options={changedOperationOptions}
          isLoading={isChangedOperationsLoading}
          onInputChange={onChangedInputChange}
          testId="ChangedOperationAutocomplete"
        />
      </DialogContent>
      <DialogActions>
        <Button variant="contained" type="submit" data-testid="CompareButton">
          Compare
        </Button>
        <Button variant="outlined" onClick={() => setOpen(false)} data-testid="CancelButton">
          Cancel
        </Button>
      </DialogActions>
    </DialogForm>
  )
})

type OperationControllerProps = {
  name: keyof CompareOperationPathsDialogFormData
  control: Control<CompareOperationPathsDialogFormData, unknown>
  options: OperationsData
  isLoading: IsLoading
  onInputChange: (event: SyntheticEvent, value: string) => void
} & TestableProps

const OperationController: FC<OperationControllerProps> = memo<OperationControllerProps>(({
  name,
  control,
  options,
  isLoading,
  testId,
  onInputChange,
}) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <Autocomplete
          autoSelect
          filterOptions={disableAutocompleteSearch}
          onInputChange={debounce(onInputChange, DEFAULT_DEBOUNCE)}
          sx={{ gridArea: name }}
          loading={isLoading}
          value={value}
          options={options}
          getOptionLabel={({ title }: Operation) => title}
          isOptionEqualToValue={(option, value) => option.operationKey === value.operationKey}
          renderOption={(props, operation) => <OperationOptionItem
            key={crypto.randomUUID()}
            props={props}
            operation={operation}
          />}
          renderInput={(params) => <TextField {...params} required label="Operation"/>}
          onChange={(_, value) => onChange(value)}
          data-testid={testId}
        />
      )}
    />
  )
})

const DIALOG_CONTENT_STYLES = {
  display: 'grid',
  columnGap: 1,
  gridTemplateRows: 'repeat(2, max-content)',
  gridTemplateColumns: '400px max-content 400px',
  gridTemplateAreas: `
    'originalTitle        originalTitle     changedTitle'
    'originalOperation    swapper           changedOperation'
  `,
}
