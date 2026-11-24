import { IconButton, TextField } from '@mui/material'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import type { FC } from 'react'
import { memo, useEffect, useState } from 'react'
import type { StandardTextFieldProps } from '@mui/material/TextField/TextField'
import { useDebounce } from 'react-use'

export type SearchValue = string

export type SearchBarProps = StandardTextFieldProps & {
  value?: string
  onValueChange?: (value: string) => void
}

export const SearchBar: FC<SearchBarProps> = memo<SearchBarProps>(({
  placeholder = 'Search',
  value = '',
  onValueChange,
  inputProps,
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
        ...inputProps,
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
