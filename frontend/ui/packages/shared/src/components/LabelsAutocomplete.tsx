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
import { memo } from 'react'
import type { AutocompleteValue } from '@mui/material'
import { Autocomplete, TextField } from '@mui/material'

export type LabelsAutocompleteProps = {
  onChange: (event: SyntheticEvent, value: AutocompleteValue<string, true, false, true>) => void
  value: string[] | undefined
}

export const LabelsAutocomplete: FC<LabelsAutocompleteProps> = memo<LabelsAutocompleteProps>(({ onChange, value }) => {
  return (
    <Autocomplete
      sx={AUTOCOMPLETE_STYLE}
      open={false}
      value={value}
      options={[]}
      autoSelect
      multiple
      freeSolo
      renderInput={(params) => (
        <TextField
          multiline
          maxRows={Infinity}
          autoComplete="on"
          {...params}
          label="Labels"
        />
      )}
      onChange={onChange}
      data-testid="LabelsAutocomplete"
    />
  )
})

const AUTOCOMPLETE_STYLE = {
  '& .MuiAutocomplete-tag': {
    height: '24px',
    marginTop: '4px',
  },
}

