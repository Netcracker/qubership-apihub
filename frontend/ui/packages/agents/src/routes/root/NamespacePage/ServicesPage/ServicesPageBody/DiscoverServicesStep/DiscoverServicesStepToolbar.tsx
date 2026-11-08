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
import { memo, useCallback, useEffect, useState } from 'react'
import { LoadingButton } from '@mui/lab'
import { Box } from '@mui/material'
import { DISCOVER_SERVICES_STEP_KEY } from '../../ServicesPageProvider/servicesSteps'
import { useResetStepsAfter, useSetStepStatus } from '../../ServicesPageProvider/ServicesStepsProvider'
import { useServices } from '../../../useServices'
import { useRunDiscovery } from './useRunDiscovery'
import { useCreateSnapshotPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import type { SearchValue } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import {
  COMPLETE_DISCOVERY_STATUS,
  ERROR_DISCOVERY_STATUS,
  RUNNING_DISCOVERY_STATUS,
} from '@agents/entities/statuses'
import type { IsError, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

export type DiscoverServicesStepToolbarProps = {
  onSearch?: (value: SearchValue) => void
}

export const DiscoverServicesStepToolbar: FC<DiscoverServicesStepToolbarProps> = memo<DiscoverServicesStepToolbarProps>(({ onSearch }) => {
  const { resetCreateSnapshotPublicationOptions } = useCreateSnapshotPublicationOptions()
  const [runDiscovery, isLoading] = useRunDiscovery()
  const resetStepsAfter = useResetStepsAfter()
  const [isDiscoverServicesRunning, isDiscoverServicesSuccess] = useDiscoverServicesStepStatus()

  const onDiscovery = useCallback(() => {
    resetCreateSnapshotPublicationOptions()
    resetStepsAfter(DISCOVER_SERVICES_STEP_KEY)
    runDiscovery()
  }, [resetCreateSnapshotPublicationOptions, resetStepsAfter, runDiscovery])

  const [searchValue, setSearchValue] = useState('')
  useEffect(() => onSearch?.(searchValue), [onSearch, searchValue])

  return (
    <Box display="flex" gap={2} pt={1}>
      <LoadingButton
        data-testid={isDiscoverServicesSuccess ? 'RestartDiscoveryButton' : 'RunDiscoveryButton'}
        disabled={isDiscoverServicesRunning}
        variant={isDiscoverServicesSuccess ? 'outlined' : 'contained'}
        onClick={onDiscovery}
        loading={isLoading || isDiscoverServicesRunning}
      >
        {isDiscoverServicesSuccess ? 'Restart Discovery' : 'Run Discovery'}
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

function useDiscoverServicesStepStatus(): [
  IsLoading,
  IsSuccess,
  IsError,
] {
  const [{ status: discoveryStatus }] = useServices()
  const setStepStatus = useSetStepStatus()

  useEffect(() => setStepStatus(DISCOVER_SERVICES_STEP_KEY, discoveryStatus), [discoveryStatus, setStepStatus])

  return [
    discoveryStatus === RUNNING_DISCOVERY_STATUS,
    discoveryStatus === COMPLETE_DISCOVERY_STATUS,
    discoveryStatus === ERROR_DISCOVERY_STATUS,
  ]
}
