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
import { memo, useCallback } from 'react'
import { Autocomplete, Box, debounce, InputLabel, TextField } from '@mui/material'
import type { AutocompleteValue } from '@mui/base'
import type { TestableProps } from './Testable'
import { OptionItem } from './OptionItem'
import { DEFAULT_DEBOUNCE } from '../utils/constants'
import type { Package, Packages } from '../entities/packages'
import type { AutocompleteInputChangeReason } from '@mui/base/AutocompleteUnstyled/useAutocomplete'

export type PackageSelectorProps = Readonly<{
  key: string
  title?: string
  placeholder: string
  value: Package | null
  options: Packages
  onInput: (text: string | undefined) => void
  onSelect: (value: Package | null) => void
  loading?: boolean
  disabled?: boolean
}> & TestableProps

// First Order Component //
export const PackageSelector: FC<PackageSelectorProps> = memo<PackageSelectorProps>(({
  title,
  placeholder,
  value,
  options,
  onInput,
  onSelect,
  loading = false,
  disabled = false,
  testId,
}) => {
  const onInputChange = useCallback((_: SyntheticEvent, value: string, reason: AutocompleteInputChangeReason) =>
      onInput(reason === 'input' ? value : ''),
    [onInput])

  const onChange = useCallback(
    (_: SyntheticEvent, value: AutocompleteValue<Package, false, false, false>) => onSelect(value ?? null),
    [onSelect],
  )

  return (
    <Box width={240}>
      {title && <InputLabel sx={{ mb: 1 }}>{title}</InputLabel>}
      <Autocomplete<Package>
        loading={loading}
        forcePopupIcon={true}
        value={value}
        disabled={disabled}
        options={options}
        renderOption={(props, dashboard) => (
          <OptionItem
            key={dashboard.key}
            props={props}
            title={dashboard.name}
            subtitle={dashboard.key}
          />
        )}
        isOptionEqualToValue={(option, value) => option.key === value.key}
        getOptionLabel={(option) => option?.name ?? ''}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            sx={{ m: 0, '& .MuiInputBase-root': { pt: '1px', pb: '1px' } }}
          />
        )}
        onInputChange={debounce(onInputChange, DEFAULT_DEBOUNCE)}
        onChange={onChange}
        data-testid={testId}
      />
    </Box>
  )
})
