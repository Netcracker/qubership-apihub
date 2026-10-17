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

import { debounce, InputLabel, TextField } from '@mui/material'
import { styled } from '@mui/material/styles'
import { type FC, memo, type SyntheticEvent, useCallback, useMemo, useState } from 'react'

import type { Key } from '../../entities/keys'
import type { PackageReference } from '../../entities/version-references'
import { useVersionProblemProcessorContext } from '../../hooks/versions/useVersionProblemProcessorContext'
import { hasVersionProblems } from '../../hooks/versions/versionProblemDetails'
import { DEFAULT_DEBOUNCE } from '../../utils/constants'
import { disableAutocompleteSearch } from '../../utils/mui'
import { getReferenceVersionLabel } from '../../utils/versions'
import { VersionSelectorAutocomplete } from '../Autocompletes/VersionSelectorAutocomplete'
import { PackageReferenceErrorIndicator } from '../ErrorIndicators/PackageReferenceErrorIndicator'
import { OptionItem } from '../OptionItem'

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

  const processorContext = useVersionProblemProcessorContext()

  return (
    <>
      <InputLabel required={required} htmlFor="package-select">{labelText}</InputLabel>
      <VersionSelectorAutocomplete
        freeSolo
        loading={isLoading}
        disableClearable={disableClearable}
        forcePopupIcon={true}
        options={filteredReferences}
        filterOptions={disableAutocompleteSearch}
        value={value}
        sx={inputPaddingSx}
        inputIndicator={value && hasVersionProblems(value, processorContext) && (
          <PackageReferenceErrorIndicator reference={value} />
        )}
        renderOption={(props, reference) => {
          // The version line and the icon appear only for a version with a problem.
          const hasProblems = hasVersionProblems(reference, processorContext)
          return (
            <OptionItem
              key={`${reference.key}@${reference.version}`}
              props={props}
              title={reference.name ?? ''}
              subtitle={hasProblems ? getReferenceVersionLabel(reference) : undefined}
              chipAlignSelf="flex-end"
              chip={hasProblems && (
                <OptionErrorIndicator
                  reference={reference}
                  fontSize="extra-small"
                  showTooltip={false}
                />
              )}
            />
          )
        }}
        getOptionLabel={(option) => option.name ?? ''}
        isOptionEqualToValue={(option, value) => option.key === value.key}
        onInputChange={debounce(onInputChange, DEFAULT_DEBOUNCE)}
        onChange={(_, option) => onSelectPackage(option)}
        renderInput={(params) => (
          <TextField
            {...params}
            id="package-select"
            placeholder="Package"
            value={searchValue}
            onKeyDown={event => event.stopPropagation()}
          />
        )}
        data-testid="PackageFilter"
      />
    </>
  )
})

// The padding lives on the autocomplete, not on the text field: both are rules for the same MUI selector, and a rule
// that emotion adds later wins. A rule on the text field loses to the one the autocomplete adds when an indicator
// appears after the first render.
const inputPaddingSx = {
  '& .MuiInputBase-root': {
    pt: '1px',
    pb: '1px',
  },
}

// A block, so that the box around the icon is as high as the icon and the icon stands on the line of the version.
const OptionErrorIndicator = styled(PackageReferenceErrorIndicator)({
  display: 'flex',
})
