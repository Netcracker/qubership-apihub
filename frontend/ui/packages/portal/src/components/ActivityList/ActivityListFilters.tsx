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
        method: () => setNewSelectedFilters(filterKey as ActivityType),
        'data-testid': filterKey,
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
        data-testid="FilterButton"
      />
    </Box>
  )
}
