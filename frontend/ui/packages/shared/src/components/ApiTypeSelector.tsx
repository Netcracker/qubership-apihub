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

import type { ChangeEvent, FC } from 'react'
import { memo } from 'react'
import type { SelectChangeEvent } from '@mui/material'
import { MenuItem, Select, TextField } from '@mui/material'
import type { ApiType } from '../entities/api-types'
import { API_TYPE_TITLE_MAP, API_TYPES } from '../entities/api-types'

export type ApiTypeSelectorProps = {
  apiType: ApiType
  standard?: boolean
  onChange?: (value: ApiType) => void
}

// First Order Component //
export const ApiTypeSelector: FC<ApiTypeSelectorProps> = memo<ApiTypeSelectorProps>(({
  standard = false,
  apiType,
  onChange,
}) => {

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent): void => {
    onChange?.(event.target.value as ApiType)
  }

  const options = API_TYPES.map(apiType => (
    <MenuItem
      value={apiType}
      data-testid={`MenuItem-${apiType}`}
    >
      {API_TYPE_TITLE_MAP[apiType]}
    </MenuItem>
  ))

  return standard
    ? (
      <Select
        sx={{ ml: 2, mt: 0.5 }}
        variant="standard"
        disableUnderline
        value={apiType}
        onChange={handleChange}
        data-testid="ApiTypeSelector"
      >
        {options}
      </Select>
    )
    : (
      <TextField
        sx={{ height: '32px', m: 0 }}
        select
        variant="filled"
        value={apiType}
        hiddenLabel
        onChange={handleChange}
        data-testid="ApiTypeSelector"
      >
        {options}
      </TextField>
    )
})
