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
import { styled } from '@mui/material/styles'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import type { Key } from '../entities/keys'
import { MenuButtonItems } from './Buttons/MenuButton'
import { NAVIGATION_PLACEHOLDER_AREA, NO_SEARCH_RESULTS, Placeholder } from './Placeholder'
import { SearchBar } from './SearchBar'
import { isNotEmpty } from '../utils/arrays'
import { getReferenceVersionLabel } from '../utils/versions'
import { useVersionProblemProcessorContext } from '../hooks/versions/useVersionProblemProcessorContext'
import { hasVersionProblems } from '../hooks/versions/versionProblemDetails'
import { LoadingIndicator } from './LoadingIndicator'
import type { PackageReference } from '../entities/version-references'
import { PackageReferenceErrorIndicator } from './ErrorIndicators/PackageReferenceErrorIndicator'

export interface DropdownPackageReferenceSelectorProps {
  searchValue: string
  loading: boolean
  references: PackageReference[]
  // The reference that an option shows, by package key: its version, status and error icon. A package without an
  // entry shows its own reference.
  problemReferences?: ReadonlyMap<Key, PackageReference>
  onSearch: (value: string) => void
  selectedPackage: PackageReference | null
  defaultPackageKey: string | undefined
  onSearchParam: (key: Key | undefined) => void
}

// First Order Component //
export const DropdownPackageReferenceSelector: FC<DropdownPackageReferenceSelectorProps> = memo(({
  selectedPackage,
  references,
  problemReferences,
  loading,
  searchValue,
  onSearch,
  defaultPackageKey,
  onSearchParam,
}) => {
  const [anchor, setAnchor] = useState<HTMLElement>()
  const processorContext = useVersionProblemProcessorContext()

  return (
    <Box display="flex" alignItems="center" gap={2} overflow="hidden" data-testid="PackageSelector">
      <Button
        sx={{
          minWidth: 4,
          maxWidth: '200px',
          height: 20,
          p: 0,
          textOverflow: 'ellipsis',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
          '& .MuiButton-endIcon': {
            flexShrink: 0,
            ml: 0.5,
          },
        }}
        variant="text"
        onClick={({ currentTarget }) => {
          // Clear on open, not on close: the search bar reports its text with a delay and stays mounted while the menu
          // closes, so text typed just before closing would otherwise come back on the next open.
          setAnchor(currentTarget)
          onSearch('')
        }}
        endIcon={<KeyboardArrowDownOutlinedIcon/>}
      >
        <span style={{
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {`${selectedPackage?.name ?? ''}`}
        </span>
        {selectedPackage && (
          <SelectedPackageErrorIndicator
            reference={getProblemReference(selectedPackage, problemReferences)}
            tabIndex={-1}
          />
        )}
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
                        // The version line and the icon appear only for a version with a problem.
                        const problemReference = getProblemReference(reference, problemReferences)
                        const hasProblems = hasVersionProblems(problemReference, processorContext)
                        return (
                          <ListItem key={reference.key} sx={{ p: 0 }}>
                            <PackageItemButton
                              selected={reference.key === defaultPackageKey}
                              onClick={() => onSearchParam(reference.key)}
                            >
                              <PackageItemContent>
                                <ListItemText
                                  primary={reference.name}
                                  secondary={hasProblems ? getReferenceVersionLabel(problemReference) : undefined}
                                />
                                {hasProblems && (
                                  <OptionErrorIndicator
                                    reference={problemReference}
                                    fontSize="extra-small"
                                    showTooltip={false}
                                  />
                                )}
                              </PackageItemContent>
                            </PackageItemButton>
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

const SelectedPackageErrorIndicator = styled(PackageReferenceErrorIndicator)(({ theme }) => ({
  marginLeft: theme.spacing(0.5),
}))

const PackageItemButton = styled(ListItemButton)(({ theme }) => ({
  justifyContent: 'center',
  height: 'auto',
  minHeight: theme.spacing(4.5),
  paddingTop: theme.spacing(0.5),
  paddingBottom: theme.spacing(0.5),
}))

const PackageItemContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  width: '100%',
  gap: theme.spacing(1),
}))

// The icon stands at the bottom of the row, on the line of the version.
const OptionErrorIndicator = styled(PackageReferenceErrorIndicator)({
  alignSelf: 'flex-end',
})

function getProblemReference(
  reference: PackageReference,
  problemReferences: ReadonlyMap<Key, PackageReference> | undefined,
): PackageReference {
  const problemReference = reference.key === undefined ? undefined : problemReferences?.get(reference.key)
  return problemReference ?? reference
}
