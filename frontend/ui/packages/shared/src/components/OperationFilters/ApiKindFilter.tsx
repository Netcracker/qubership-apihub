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
import * as React from 'react'
import { memo } from 'react'
import { Autocomplete, InputLabel, TextField } from '@mui/material'
import { OptionItem } from '../OptionItem'
import type { ApiKind } from '../../entities/operations'
import { API_KINDS } from '../../entities/operations'

export type ApiKindFilterProps = {
  onSelectApiKind: (value?: ApiKind) => void
  value?: ApiKind
  required?: boolean
  labelText?: string
}

const FILTER_API_KIND_LABEL = 'Filter by API Kind'

export const ApiKindFilter: FC<ApiKindFilterProps> = memo<ApiKindFilterProps>((props) => {
  const { value, onSelectApiKind, required = false, labelText } = props
  return (
    <>
      <InputLabel required={required}>
        {labelText ?? FILTER_API_KIND_LABEL}
      </InputLabel>
      <Autocomplete
        forcePopupIcon={true}
        value={value}
        options={Object.keys(API_KINDS).map(apiKind => apiKind as ApiKind)}
        renderOption={(props, apiKind) => (
          <OptionItem
            key={apiKind}
            props={props}
            title={API_KINDS[apiKind as ApiKind]!}
            testId={`Option-${apiKind}`}
          />
        )}
        isOptionEqualToValue={(option, value) => option === value}
        renderInput={(params) => (
          <TextField
            {...params}
            id="api-kind-filter"
            placeholder="API Kind"
            sx={{ '& .MuiInputBase-root': { pt: '1px', pb: '1px' } }}
          />
        )}
        getOptionLabel={(option: ApiKind) => API_KINDS[option] ?? ''}
        onChange={(_, option) => onSelectApiKind(option ?? undefined)}
        data-testid="ApiKindFilter"
      />
    </>
  )
})
