import type { FC } from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import { LoadingButton } from '@mui/lab'
import { Box } from '@mui/material'
import type { StepStatus } from '../../ServicesPageProvider/ServicesStepsProvider'
import {
  ERROR_STEP_STATUS,
  INITIAL_STEP_STATUS,
  RUNNING_STEP_STATUS,
  SUCCESS_STEP_STATUS,
  useCreateSnapshotStep,
  useDiscoverServicesStep,
  usePromoteVersionStep,
  useValidationResultsStep,
} from '../../ServicesPageProvider/ServicesStepsProvider'
import { useServices } from '../../../useServices'
import { useRunDiscovery } from './useRunDiscovery'
import { useCreateSnapshotPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import type { SearchValue } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import { SearchBar } from '@netcracker/qubership-apihub-ui-shared/components/SearchBar'
import type { DiscoveryStatus } from '@agents/entities/statuses'
import {
  COMPLETE_DISCOVERY_STATUS,
  ERROR_DISCOVERY_STATUS,
  NONE_DISCOVERY_STATUS,
  RUNNING_DISCOVERY_STATUS,
} from '@agents/entities/statuses'
import type { IsError, IsLoading, IsSuccess } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

export type DiscoverServicesStepToolbarProps = {
  onSearch?: (value: SearchValue) => void
}

export const DiscoverServicesStepToolbar: FC<DiscoverServicesStepToolbarProps> = memo<DiscoverServicesStepToolbarProps>(({ onSearch }) => {
  const { resetCreateSnapshotPublicationOptions } = useCreateSnapshotPublicationOptions()
  const [runDiscovery, isLoading] = useRunDiscovery()
  const [, setCreateSnapshotStep] = useCreateSnapshotStep()
  const [, setValidationResultsStep] = useValidationResultsStep()
  const [, setPromoteVersionStep] = usePromoteVersionStep()
  const [isDiscoverServicesRunning, isDiscoverServicesSuccess] = useDiscoverServicesStepStatus()

  const onDiscovery = useCallback(() => {
    resetCreateSnapshotPublicationOptions()
    setCreateSnapshotStep(prevState => ({ ...prevState, status: INITIAL_STEP_STATUS }))
    setValidationResultsStep(prevState => ({ ...prevState, status: INITIAL_STEP_STATUS }))
    setPromoteVersionStep(prevState => ({ ...prevState, status: INITIAL_STEP_STATUS }))
    runDiscovery()
  }, [resetCreateSnapshotPublicationOptions, runDiscovery, setCreateSnapshotStep, setPromoteVersionStep, setValidationResultsStep])

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

const DISCOVERY_STATUS_TO_STEP_STATUS_MAP: Record<DiscoveryStatus, StepStatus> = {
  [NONE_DISCOVERY_STATUS]: INITIAL_STEP_STATUS,
  [RUNNING_DISCOVERY_STATUS]: RUNNING_STEP_STATUS,
  [COMPLETE_DISCOVERY_STATUS]: SUCCESS_STEP_STATUS,
  [ERROR_DISCOVERY_STATUS]: ERROR_STEP_STATUS,
}

function useDiscoverServicesStepStatus(): [
  IsLoading,
  IsSuccess,
  IsError,
] {
  const [{ status: discoveryStatus }] = useServices()
  const [, setDiscoverServicesStep] = useDiscoverServicesStep()

  useEffect(() => {
    setDiscoverServicesStep(prevState => ({
      ...prevState,
      status: DISCOVERY_STATUS_TO_STEP_STATUS_MAP[discoveryStatus],
    }))
  }, [discoveryStatus, setDiscoverServicesStep])

  return [
    discoveryStatus === RUNNING_DISCOVERY_STATUS,
    discoveryStatus === COMPLETE_DISCOVERY_STATUS,
    discoveryStatus === ERROR_DISCOVERY_STATUS,
  ]
}
