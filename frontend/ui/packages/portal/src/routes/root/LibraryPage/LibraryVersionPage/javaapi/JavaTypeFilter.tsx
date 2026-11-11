import { Autocomplete, Box, InputLabel, styled, TextField } from '@mui/material'
import { type FC, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

import { OptionItem } from '@netcracker/qubership-apihub-ui-shared/components/OptionItem'

import { JAVA_TYPE_FILTER_SEARCH_PARAM, JAVA_TYPE_FILTER_TITLES, type JavaTypeFilterValue } from './java-api'

const JAVA_TYPE_FILTER_OPTIONS: JavaTypeFilterValue[] = ['CLASS', 'INTERFACE', 'ENUM', 'ANNOTATION']
type SetJavaTypeFilter = (value?: JavaTypeFilterValue) => void

export function useJavaTypeFilter(): [JavaTypeFilterValue | undefined, SetJavaTypeFilter] {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get(JAVA_TYPE_FILTER_SEARCH_PARAM)
  const value = JAVA_TYPE_FILTER_OPTIONS.find(option => option === raw)
  const setValue: SetJavaTypeFilter = useCallback(next => {
    setSearchParams(params => {
      if (next) params.set(JAVA_TYPE_FILTER_SEARCH_PARAM, next)
      else params.delete(JAVA_TYPE_FILTER_SEARCH_PARAM)
      return params
    })
  }, [setSearchParams])
  return [value, setValue]
}

export const JavaTypeFilter: FC = () => {
  const [value, setValue] = useJavaTypeFilter()
  return (
    <FilterBox>
      <InputLabel htmlFor="library-java-type-filter">Filter by Java type</InputLabel>
      <Autocomplete
        id="library-java-type-filter"
        forcePopupIcon
        value={value ?? null}
        options={JAVA_TYPE_FILTER_OPTIONS}
        renderOption={(props, option) => (
          <OptionItem
            key={option}
            props={props}
            title={JAVA_TYPE_FILTER_TITLES[option]}
            data-testid={`Option-${option}`}
          />
        )}
        isOptionEqualToValue={(option, selected) => option === selected}
        renderInput={params => <TextField {...params} placeholder="All" sx={INPUT_PADDING_SX} />}
        getOptionLabel={option => JAVA_TYPE_FILTER_TITLES[option]}
        onChange={(_, option) => setValue(option ?? undefined)}
        data-testid="JavaTypeFilter"
      />
    </FilterBox>
  )
}
JavaTypeFilter.displayName = 'JavaTypeFilter'

const FilterBox = styled(Box)(({ theme }) => ({ padding: theme.spacing(2) }))

// The same compact input as the other sidebar filters, such as ApiKindFilter.
const INPUT_PADDING_SX = { '& .MuiInputBase-root': { pt: '1px', pb: '1px' } }
