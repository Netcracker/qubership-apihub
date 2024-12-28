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
import { memo, useState } from 'react'
import { Box, Button, List, ListItem, ListItemButton, ListItemText } from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import type { Key } from '../entities/keys'
import { MenuButtonItems } from './Buttons/MenuButton'
import { NAVIGATION_PLACEHOLDER_AREA, NO_SEARCH_RESULTS, Placeholder } from './Placeholder'
import { SearchBar } from './SearchBar'
import { isNotEmpty } from '../utils/arrays'
import { LoadingIndicator } from './LoadingIndicator'
import type { PackageReference } from '../entities/version-references'

export interface DropdownPackageReferenceSelectorProps {
  searchValue: string
  loading: boolean
  references: PackageReference[]
  onSearch: (value: string) => void
  selectedPackage: PackageReference | null
  defaultPackageKey: string | undefined
  onSearchParam: (key: Key | undefined) => void
}

// First Order Component //
export const DropdownPackageReferenceSelector: FC<DropdownPackageReferenceSelectorProps> = memo(({
  selectedPackage,
  references,
  loading,
  searchValue,
  onSearch,
  defaultPackageKey,
  onSearchParam,
}) => {
  const [anchor, setAnchor] = useState<HTMLElement>()

  return (
    <Box display="flex" alignItems="center" gap={2} overflow="hidden" data-testid="PackageSelector">
      <Button
        sx={{
          minWidth: 4,
          maxWidth: '200px',
          width: '200px',
          height: 20,
          p: 0,
          textOverflow: 'ellipsis',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        }}
        variant="text"
        onClick={({ currentTarget }) => setAnchor(currentTarget)}
        endIcon={<KeyboardArrowDownOutlinedIcon/>}
      >
        <span style={{
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          width: '100%',
        }}>
          {`${selectedPackage?.name ?? ''}`}
        </span>
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
            gap={1}
            gridTemplateAreas="
              'searchbar'
              'content'
            "
          >
            <Box gridArea="searchbar" overflow="hidden">
              <SearchBar value={searchValue} onValueChange={onSearch} data-testid="SearchPackage"/>
            </Box>
            <Box gridArea="content">
              {loading
                ? <LoadingIndicator/>
                : (
                  <Placeholder
                    invisible={isNotEmpty(references)}
                    area={NAVIGATION_PLACEHOLDER_AREA}
                    message={searchValue ? NO_SEARCH_RESULTS : 'No package references'}
                  >
                    <List>
                      {references.map(reference => {
                        return (
                          <ListItem key={reference.key} sx={{ p: 0 }}>
                            <ListItemButton
                              sx={{
                                height: '36px',
                                alignItems: 'center',
                              }}
                              selected={reference.key === defaultPackageKey}
                              onClick={() => onSearchParam(reference.key)}
                            >
                              <ListItemText
                                primary={reference.name}
                                primaryTypographyProps={{ sx: { mt: 1 } }}
                              />
                            </ListItemButton>
                          </ListItem>
                        )
                      })}
                    </List>
                  </Placeholder>
                )}
            </Box>
          </Box>
        </MenuButtonItems>
      </Button>
    </Box>
  )
})
