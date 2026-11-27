import { Box, Button } from '@mui/material'
import { type FC, memo, useEffect, useState } from 'react'

import { SearchBar, type SearchValue } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'

export type DiscoverServicesStepToolbarProps = {
  isRestartDiscoveryDisabled: boolean
  onRestartDiscovery: () => void
  onSearch: (value: SearchValue) => void
}

export const DiscoverServicesStepToolbar: FC<DiscoverServicesStepToolbarProps> = memo<DiscoverServicesStepToolbarProps>((
  {
    isRestartDiscoveryDisabled,
    onRestartDiscovery,
    onSearch,
  },
) => {
  const [searchValue, setSearchValue] = useState('')
  useEffect(() => onSearch(searchValue), [onSearch, searchValue])

  return (
    <Box display="flex" gap={2}>
      <Button
        data-testid="RestartDiscoveryButton"
        variant="outlined"
        disabled={isRestartDiscoveryDisabled}
        onClick={onRestartDiscovery}
      >
        Restart Discovery
      </Button>
      <Box sx={{ alignSelf: 'center', ml: 'auto' }}>
        <SearchBar
          value={searchValue}
          onValueChange={setSearchValue}
        />
      </Box>
    </Box>
  )
})
