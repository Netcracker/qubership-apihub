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
import { memo, useEffect, useState } from 'react'
import { Box, Button, MenuItem, Skeleton, Typography } from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { NAVIGATION_PLACEHOLDER_AREA, NO_SEARCH_RESULTS, Placeholder } from './Placeholder'
import { SearchBar } from './SearchBar'
import { CustomChip } from './CustomChip'
import type { TestableProps } from './Testable'
import type { Key } from '../entities/keys'
import { MenuButtonItems } from './Buttons/MenuButton'
import { isNotEmpty } from '../utils/arrays'

const TEXT_DISABLED_COLOR = '#00000026'

export type SelectorProps = {
  title: string
  value?: SelectorOption
  options?: SelectorOption[]
  isSearching?: boolean
  disabled?: boolean
  onChange?: (value: SelectorOption) => void
  onSearch?: (value: SearchValue) => void
} & TestableProps

export type SearchValue = string

export type SelectorOption = {
  value: string
  key?: Key
  badge?: string
}

export const Selector: FC<SelectorProps> = memo<SelectorProps>(({
  options,
  value,
  onChange,
  title,
  onSearch,
  isSearching,
  disabled = false,
  testId = 'Select',
}) => {
  const [searchValue, setSearchValue] = useState('')
  const [anchor, setAnchor] = useState<HTMLElement>()

  useEffect(() => onSearch?.(searchValue), [onSearch, searchValue])

  return (
    <Box data-testid={testId} display="flex" alignItems="center" gap={2} overflow="hidden">
      <Typography variant="subtitle3" color={disabled ? TEXT_DISABLED_COLOR : 'default'}>{title}</Typography>

      <Button
        sx={{ p: 0 }}
        variant="text"
        disabled={disabled}
        onClick={({ currentTarget }) => setAnchor(currentTarget)}
        endIcon={<KeyboardArrowDownOutlinedIcon/>}
      >
        {value?.value}
        <MenuButtonItems
          anchorEl={anchor}
          open={!!anchor}
          onClick={event => event.stopPropagation()}
          onClose={() => setAnchor(undefined)}
        >
          <Box
            sx={{ p: 2 }}
            overflow="hidden"
            display="grid"
            gap={2}
            gridTemplateRows="max-content max-content"
            gridTemplateColumns="256px"
            gridTemplateAreas="
              'searchbar'
              'content'
            "
          >
            <Box gridArea="searchbar" overflow="hidden">
              <SearchBar onValueChange={setSearchValue}/>
            </Box>
            <Box gridArea="content" overflow="auto" maxHeight={400}>
              {isSearching
                ? <Skeleton variant="text" width={'100%'}/>
                : <Placeholder
                  invisible={isNotEmpty(options)}
                  area={NAVIGATION_PLACEHOLDER_AREA}
                  message={NO_SEARCH_RESULTS}
                >
                  {options?.map((option) => (
                    <MenuItem
                      key={crypto.randomUUID()}
                      onClick={() => {
                        onChange?.(option)
                        setAnchor(undefined)
                      }}
                    >
                      <Box display="flex" width="100%" gap={2}>
                        <Box flex={1}>{option.value}</Box>
                        {option.badge && <CustomChip value={option.badge}/>}
                      </Box>
                    </MenuItem>
                  ))}
                </Placeholder>
              }
            </Box>
          </Box>
        </MenuButtonItems>
      </Button>
    </Box>
  )
})
