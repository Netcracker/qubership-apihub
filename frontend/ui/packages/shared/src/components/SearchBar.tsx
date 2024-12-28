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

import { IconButton, TextField } from '@mui/material'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import type { FC } from 'react'
import { memo, useEffect, useState } from 'react'
import type { StandardTextFieldProps } from '@mui/material/TextField/TextField'
import { useDebounce } from 'react-use'

export type SearchBarProps = StandardTextFieldProps & {
  value?: string
  onValueChange?: (value: string) => void
}

export const SearchBar: FC<SearchBarProps> = memo<SearchBarProps>(({
  placeholder = 'Search',
  value = '',
  onValueChange,
  ...props
}) => {
  const [searchValue, setSearchValue] = useState('')
  useEffect(() => setSearchValue(value), [value])

  useDebounce(
    () => onValueChange?.(searchValue),
    500,
    [searchValue],
  )

  return (
    <TextField
      data-testid="SearchBar"
      {...props}
      value={searchValue}
      placeholder={placeholder}
      variant="filled"
      sx={{ ...props.sx, m: 0 }}
      inputProps={{
        style: {
          padding: '4px 11px',
        },
      }}
      onKeyDown={event => event.stopPropagation()}
      InputProps={{
        endAdornment: searchValue
          ? (
            <IconButton
              sx={{ p: 0 }}
              onClick={() => setSearchValue('')}
            >
              <CancelOutlinedIcon sx={ICON_STYLE}/>
            </IconButton>
          )
          : <SearchOutlinedIcon sx={ICON_STYLE}/>,
      }}
      onChange={({ target: { value } }) => setSearchValue(value)}
    />
  )
})

const ICON_STYLE = {
  fontSize: '20px',
  color: '#353C4E',
}
