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
import { useCallback, useMemo, useState } from 'react'

import { Box } from '@mui/material'
import { ActivityType } from '../../entities/activity-enums'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { DropdownButton } from '../DropdownButton'
import { FilterIcon } from '@netcracker/qubership-apihub-ui-shared/icons/FilterIcon'

export type ActivityListFiltersProps = Partial<{
  text: string
  types: ReadonlyArray<ActivityType>
  onChangeFilters?: (filters: {
    types?: ReadonlyArray<ActivityType>
    textFilter?: string
  }) => void
}>

// First Order Component //
export const ActivityListFilters: FC<ActivityListFiltersProps> = ({
  text,
  types,
  onChangeFilters,
}: ActivityListFiltersProps) => {

  const [selectedFilters, setSelectedFilters] = useState<ReadonlyArray<ActivityType>>(types ?? [])

  const setNewSelectedFilters = useCallback((filter: string) => {
    let newSelectedFilters
    const filterIndex = selectedFilters.indexOf(filter as ActivityType)
    if (filterIndex !== -1) {
      newSelectedFilters = [...selectedFilters]
      newSelectedFilters.splice(filterIndex, 1)
    } else {
      newSelectedFilters = [...selectedFilters, filter] as ActivityType[]
    }

    setSelectedFilters(newSelectedFilters)
    onChangeFilters?.({ textFilter: text, types: newSelectedFilters })
  }, [selectedFilters, onChangeFilters, text])

  const filterButtonOptions = useMemo(() => {
    return Object.entries(ActivityType).map(([filterId, filterName]) => {
      const filterKey = filterId.toLowerCase()
      return ({
        key: filterKey,
        label: filterName,
        selected: selectedFilters.includes(filterKey as ActivityType),
        testId: filterKey,
        method: () => setNewSelectedFilters(filterKey as ActivityType),
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilters])

  return (
    <Box display="flex" gap={2}>
      <SearchBar
        placeholder="Search"
        value={text}
        onValueChange={(text) => onChangeFilters?.({ textFilter: text, types: selectedFilters })}
        data-testid="SearchInHistory"
      />
      <DropdownButton
        icon={<FilterIcon/>}
        disabled={false}
        disableHint={true}
        options={filterButtonOptions}
        closeOnClick={false}
        testId="FilterButton"
      />
    </Box>
  )
}
