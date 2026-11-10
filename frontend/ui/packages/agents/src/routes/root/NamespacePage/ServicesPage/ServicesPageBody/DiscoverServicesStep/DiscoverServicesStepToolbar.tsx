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
