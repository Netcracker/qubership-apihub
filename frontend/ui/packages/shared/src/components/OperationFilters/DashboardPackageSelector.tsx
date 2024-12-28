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
import { memo, useCallback, useMemo, useState } from 'react'
import { Autocomplete, debounce, InputLabel, TextField } from '@mui/material'
import { OptionItem } from '../OptionItem'
import { disableAutocompleteSearch } from '../../utils/mui'
import { DEFAULT_DEBOUNCE } from '../../utils/constants'
import type { PackageReference } from '../../entities/version-references'
import type { Key } from '../../entities/keys'

const PACKAGE_FILTER_LABEL_TEXT = 'Filter by Package'

export type DashboardPackageSelectorProps = {
  defaultPackageKey?: Key
  required?: boolean
  labelText?: string
  disableClearable?: boolean
  onSelectPackage: (packageRef: PackageReference | null) => void
  references: PackageReference[]
  isLoading: boolean
}

export const DashboardPackageSelector: FC<DashboardPackageSelectorProps> = memo<DashboardPackageSelectorProps>((props) => {
  const {
    onSelectPackage, defaultPackageKey, required = true, disableClearable = false,
    labelText = PACKAGE_FILTER_LABEL_TEXT, references, isLoading,
  } = props

  const [searchValue, setSearchValue] = useState<string>('')
  const onInputChange = useCallback((_: SyntheticEvent, value: string) => setSearchValue(value), [])

  const filteredReferences = useMemo(
    () => (searchValue ? references.filter(ref => ref.name?.toLowerCase().includes(searchValue.toLowerCase())) : references),
    [references, searchValue],
  )

  const value = useMemo(
    () => references.find((ref) => ref.key === defaultPackageKey) ?? null,
    [defaultPackageKey, references],
  )

  return (
    <>
      <InputLabel required={required} htmlFor="package-select">{labelText}</InputLabel>
      <Autocomplete
        freeSolo
        loading={isLoading}
        disableClearable={disableClearable}
        forcePopupIcon={true}
        options={filteredReferences}
        filterOptions={disableAutocompleteSearch}
        value={value}
        renderOption={(props, { key, name }) => <OptionItem key={key} props={props} title={name!}/>}
        getOptionLabel={(option) => option.name ?? ''}
        isOptionEqualToValue={(option, value) => option.key === value.key}
        onInputChange={debounce(onInputChange, DEFAULT_DEBOUNCE)}
        onChange={(_, option) => onSelectPackage(option)}
        renderInput={(params) => (
          <TextField
            {...params}
            id="package-select"
            placeholder="Package"
            sx={{
              '& .MuiInputBase-root': {
                pt: '1px',
                pb: '1px',
              },
            }}
            value={searchValue}
            onKeyDown={event => event.stopPropagation()}
          />
        )}
        data-testid="PackageFilter"
      />
    </>
  )
})


