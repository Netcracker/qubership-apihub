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

import { Autocomplete, CircularProgress, TextField } from '@mui/material'
import type { HTMLAttributes, ReactElement } from 'react'
import type { AutocompleteRenderGetTagProps } from '@mui/material/Autocomplete/Autocomplete'
import { genericMemo } from '../utils/components'
import type { TestableProps } from './Testable'

export type MultipleSelectorAutocompleteProps<Item extends object> = {
  id: string
  options: ReadonlyArray<Item>
  value: Item[]
  inputLabel: string
  icon?: ReactElement
  isLoading?: boolean
  onChange: (value: Item[]) => void
  getOptionLabel: (option: Item) => string
  renderOption: (props: HTMLAttributes<HTMLLIElement>, value: Item) => ReactElement
  renderTags: (value: Item[], getTagProps: AutocompleteRenderGetTagProps) => ReactElement[]
  setInputSearch?: (search: string) => void
} & TestableProps

function renderMultipleSelectorAutocomplete<Item extends object>(props: MultipleSelectorAutocompleteProps<Item>): ReactElement {
  const {
    options,
    value,
    inputLabel,
    onChange,
    id,
    icon,
    isLoading,
    getOptionLabel,
    renderOption,
    renderTags,
    testId,
    setInputSearch,
  } = props

  return (
    <Autocomplete
      id={id}
      multiple
      disableClearable
      sx={icon ? DEFAULT_AUTOCOMPLETE_STYLE : DEFAULT_AUTOCOMPLETE_STYLE_WITH_DEFAULT_ICON}
      popupIcon={icon}
      loading={isLoading}
      loadingText={<CircularProgress size={16}/>}
      value={value}
      options={options}
      getOptionLabel={(option) => getOptionLabel(option)}
      onChange={(_, value) => {onChange(value)}}
      renderOption={(props, option) => renderOption(props, option)}
      renderTags={(value: Item[], getTagProps) => renderTags(value, getTagProps)}
      renderInput={(params) =>
        <TextField
          {...params}
          label={inputLabel}
          required={!value || value.length === 0}
          onChange={(event) => setInputSearch?.(event?.target?.value ?? '')}
        />
      }
      data-testid={testId}
    />
  )
}

export const MultipleSelectorAutocomplete = genericMemo(renderMultipleSelectorAutocomplete)

const DEFAULT_AUTOCOMPLETE_STYLE = {
  '& .MuiAutocomplete-popupIndicator': {
    transform: 'none',
  },
  '& .MuiAutocomplete-endAdornment': {
    top: '10px',
  },
  '& .MuiFilledInput-root': {
    pl: '2px',
  },
  '& .MuiAutocomplete-tag': {
    mt: 0,
    pl: '8px',
  },
  '& .MuiAutocomplete-input': {
    ml: '8px',
  },
}

const DEFAULT_AUTOCOMPLETE_STYLE_WITH_DEFAULT_ICON = {
  '& .MuiAutocomplete-endAdornment': {
    top: '10px',
  },
  '& .MuiFilledInput-root': {
    pl: '2px',
  },
  '& .MuiAutocomplete-tag': {
    mt: 0,
    pl: '8px',
  },
  '& .MuiAutocomplete-input': {
    ml: '8px',
  },
}
