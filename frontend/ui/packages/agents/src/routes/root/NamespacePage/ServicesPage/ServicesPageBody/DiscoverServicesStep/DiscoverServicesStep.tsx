import { LoadingButton } from '@mui/lab'
import { type FC, memo, useCallback, useEffect } from 'react'

import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import {
  EmptyState,
  FAILED_EMPTY_STATE_VARIANT,
  READY_EMPTY_STATE_VARIANT,
} from '@agents/components/EmptyState/EmptyState'
import { RUNNING_DISCOVERY_STATUS } from '@agents/entities/statuses'
import { useShowErrorNotification } from '../../../../BasePage/NotificationHandler'
import { useServices } from '../../../useServices'
import { useCreateSnapshotPublicationOptions } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { DISCOVER_SERVICES_STEP_KEY } from '../../ServicesPageProvider/servicesSteps'
import { useResetStepsAfter, useSetStepStatus } from '../../ServicesPageProvider/ServicesStepsProvider'
import { DiscoveredServices } from './DiscoveredServices'
import {
  discoveryViewOf,
  FAILED_DISCOVERY_VIEW,
  LOADING_DISCOVERY_VIEW,
  NO_SERVICES_DISCOVERY_VIEW,
  NOT_RUN_DISCOVERY_VIEW,
  SERVICES_DISCOVERY_VIEW,
} from './useDiscoveryView'
import { useRunDiscovery } from './useRunDiscovery'

type StartDiscovery = () => void

export const DiscoverServicesStep: FC = memo(() => {
  const [discovery, isLoading] = useServices()
  const { status, services } = discovery
  const setStepStatus = useSetStepStatus()
  const [startDiscovery, isStarting] = useStartDiscovery()

  // Every view writes the status, so the tab of the step follows the discovery in the empty states too
  useEffect(() => setStepStatus(DISCOVER_SERVICES_STEP_KEY, status), [setStepStatus, status])

  switch (discoveryViewOf(discovery, isLoading)) {
    case LOADING_DISCOVERY_VIEW:
      return <LoadingIndicator/>
    case NOT_RUN_DISCOVERY_VIEW:
      return (
        <EmptyState
          variant={READY_EMPTY_STATE_VARIANT}
          title="No Services Discovered Yet"
          lines={['Run discovery to load services and API documents from the selected cluster']}
          action={
            <LoadingButton
              variant="contained"
              loading={isStarting}
              onClick={startDiscovery}
              data-testid="RunDiscoveryButton"
            >
              Run Discovery
            </LoadingButton>
          }
          data-testid="DiscoveryNotRunState"
        />
      )
    case FAILED_DISCOVERY_VIEW:
      return (
        <EmptyState
          variant={FAILED_EMPTY_STATE_VARIANT}
          title="Discovery failed"
          lines={[
            'The agent could not complete discovery.',
            'Check that the agent is running in the selected cluster and try again',
          ]}
          action={
            <LoadingButton
              variant="contained"
              loading={isStarting}
              onClick={startDiscovery}
              data-testid="RetryDiscoveryButton"
            >
              Try Again
            </LoadingButton>
          }
          data-testid="DiscoveryFailedState"
        />
      )
    case NO_SERVICES_DISCOVERY_VIEW:
      return (
        <EmptyState
          variant={READY_EMPTY_STATE_VARIANT}
          title="No Services Found"
          lines={[
            'Discovery did not find any services in the selected cloud and namespace.',
            'Verify cloud and namespace, then run discovery again',
          ]}
          data-testid="NoServicesFoundState"
        />
      )
    case SERVICES_DISCOVERY_VIEW:
      return (
        <DiscoveredServices
          services={services}
          isDiscoveryRunning={isStarting || status === RUNNING_DISCOVERY_STATUS}
          onRestartDiscovery={startDiscovery}
        />
      )
  }
})

DiscoverServicesStep.displayName = 'DiscoverServicesStep'

// Steps 2 and 3 start over, since their snapshot and promotion came from the last result of the discovery
function useStartDiscovery(): [StartDiscovery, IsLoading] {
  const { resetCreateSnapshotPublicationOptions } = useCreateSnapshotPublicationOptions()
  const resetStepsAfter = useResetStepsAfter()
  const showErrorNotification = useShowErrorNotification()
  // The Agents SPA shows no failed request by itself, so a failed start would leave the step without a sign
  const [runDiscovery, isStarting] = useRunDiscovery(error => showErrorNotification({ message: error.message }))

  const startDiscovery = useCallback(() => {
    resetCreateSnapshotPublicationOptions()
    resetStepsAfter(DISCOVER_SERVICES_STEP_KEY)
    runDiscovery()
  }, [resetCreateSnapshotPublicationOptions, resetStepsAfter, runDiscovery])

  return [startDiscovery, isStarting]
}
