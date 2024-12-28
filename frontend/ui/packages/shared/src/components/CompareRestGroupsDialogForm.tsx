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
import { DEFAULT_DEBOUNCE } from '../utils/constants'
import { disableAutocompleteSearch } from '../utils/mui'
import { OptionItem } from './OptionItem'
import type { OperationGroup } from '../entities/operation-groups'
import { DialogForm } from './DialogForm'
import { Swapper } from './Swapper'

export type CompareRestGroupsDialogFormData = {
  originalGroup: OperationGroup | null
  changedGroup: OperationGroup | null
}

export type CompareRestGroupsDialogData = {
  control: Control<CompareRestGroupsDialogFormData>
  originalGroupOptions: ReadonlyArray<OperationGroup>
  changedGroupOptions: ReadonlyArray<OperationGroup>
  onSwap: () => void
  onSubmit: () => void
  isLoadingOriginalGroup: boolean
  isLoadingChangedGroup: boolean
}

export type CompareRestGroupsDialogFormProps = CompareRestGroupsDialogData & {
  open: boolean
  setOpen: (value: boolean) => void
  onOriginalInputChange: (event: SyntheticEvent, value: string) => void
  onChangedInputChange: (event: SyntheticEvent, value: string) => void
}

// First Order Component //
export const CompareRestGroupsDialogForm: FC<CompareRestGroupsDialogFormProps> = memo(({
  open,
  setOpen,
  control,
  onSubmit,
  onSwap,
  originalGroupOptions,
  changedGroupOptions,
  isLoadingOriginalGroup,
  isLoadingChangedGroup,
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
        Select REST Groups to Compare
      </DialogTitle>
      <DialogContent sx={DIALOG_CONTENT_STYLES}>
        <Typography variant="button" sx={{ gridArea: 'originalTitle' }}>
          Previous
        </Typography>
        <Controller
          name="originalGroup"
          control={control}
          render={({ field: { value, onChange } }) => {
            return (
              <Autocomplete<OperationGroup>
                autoSelect
                filterOptions={disableAutocompleteSearch}
                onInputChange={debounce(onOriginalInputChange, DEFAULT_DEBOUNCE)}
                sx={{ gridArea: 'originalGroup' }}
                loading={isLoadingOriginalGroup}
                value={value}
                options={originalGroupOptions}
                getOptionLabel={({ groupName }) => groupName}
                renderOption={(props, { groupName }) =>
                  <OptionItem
                    key={groupName}
                    props={props}
                    title={groupName}
                  />
                }
                renderInput={(params) => <TextField {...params} required label="Group"/>}
                onChange={(_, value) => onChange(value)}
                data-testid="OriginalGroupAutocomplete"
              />
            )
          }}
        />

        <Box sx={{ gridArea: 'swapper', alignSelf: 'center' }}>
          <Swapper onSwap={onSwap}/>
        </Box>

        <Typography variant="button" sx={{ gridArea: 'changedTitle' }}>
          Current
        </Typography>
        <Controller
          name="changedGroup"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Autocomplete<OperationGroup>
              autoSelect
              filterOptions={disableAutocompleteSearch}
              onInputChange={debounce(onChangedInputChange, DEFAULT_DEBOUNCE)}
              sx={{ gridArea: 'changedGroup' }}
              loading={isLoadingChangedGroup}
              value={value}
              options={changedGroupOptions}
              getOptionLabel={({ groupName }) => groupName}
              renderOption={(props, { groupName }) =>
                <OptionItem
                  key={groupName}
                  props={props}
                  title={groupName}
                />
              }
              renderInput={(params) => <TextField {...params} required label="Group"/>}
              onChange={(_, value) => onChange(value)}
              data-testid="ChangedGroupAutocomplete"
            />
          )}
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

const DIALOG_CONTENT_STYLES = {
  display: 'grid',
  columnGap: 1,
  gridTemplateRows: 'repeat(2, max-content)',
  gridTemplateColumns: '400px max-content 400px',
  gridTemplateAreas: `
    'originalTitle        originalTitle     changedTitle'
    'originalGroup        swapper           changedGroup'
  `,
}
