import { type FC, memo } from 'react'

import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'

import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'

type HistorySearchFieldProps = {
  value: string
  onChange: (value: string) => void
}

export const HistorySearchField: FC<HistorySearchFieldProps> = memo(({ value, onChange }) => {
  return (
    <SearchFieldRoot>
      <SearchBar
        placeholder="Search"
        value={value}
        onValueChange={onChange}
        data-testid="AiAssistantHistorySearchField"
        inputProps={{
          'aria-label': 'Search',
        }}
      />
    </SearchFieldRoot>
  )
})

HistorySearchField.displayName = 'HistorySearchField'

const SearchFieldRoot = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 3, 0.5),
  flexShrink: 0,
  width: '100%',
}))
