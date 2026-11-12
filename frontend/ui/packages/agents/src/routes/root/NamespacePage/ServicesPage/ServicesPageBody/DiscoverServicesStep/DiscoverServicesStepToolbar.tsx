import { LoadingButton } from '@mui/lab'
import { Box } from '@mui/material'
import { type FC, memo, useEffect, useState } from 'react'

import { SearchBar, type SearchValue } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'

export type DiscoverServicesStepToolbarProps = {
  isDiscoveryRunning: boolean
  onRestartDiscovery: () => void
  onSearch: (value: SearchValue) => void
}

export const DiscoverServicesStepToolbar: FC<DiscoverServicesStepToolbarProps> = memo<DiscoverServicesStepToolbarProps>((
  {
    isDiscoveryRunning,
    onRestartDiscovery,
    onSearch,
  },
) => {
  const [searchValue, setSearchValue] = useState('')
  useEffect(() => onSearch(searchValue), [onSearch, searchValue])

  return (
    <Box display="flex" gap={2} pt={1}>
      <LoadingButton
        data-testid="RestartDiscoveryButton"
        variant="outlined"
        loading={isDiscoveryRunning}
        onClick={onRestartDiscovery}
      >
        Restart Discovery
      </LoadingButton>
      <Box sx={{ alignSelf: 'center', ml: 'auto' }}>
        <SearchBar
          value={searchValue}
          onValueChange={setSearchValue}
        />
      </Box>
    </Box>
  )
})
