import { Button } from '@mui/material'
import { type FC, memo, type ReactElement, useCallback, useEffect } from 'react'

import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import type { IsError, IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'

import {
  EmptyState,
  FAILED_EMPTY_STATE_VARIANT,
  NO_DATA_EMPTY_STATE_VARIANT,
} from '@agents/components/EmptyState/EmptyState'
import { type DiscoveryStatus, ERROR_DISCOVERY_STATUS, RUNNING_DISCOVERY_STATUS } from '@agents/entities/statuses'
import { useShowErrorNotification } from '../../../../BasePage/NotificationHandler'
import { useServices } from '../../../useServices'
import { useSetDiscoveryStartView } from '../../ServicesPageProvider/DiscoveryStartViewProvider'
import { useSnapshotPublications } from '../../ServicesPageProvider/ServicesPublicationOptionsProvider'
import { DISCOVER_SERVICES_STEP_KEY } from '../../ServicesPageProvider/servicesSteps'
import { useResetStepsAfter, useSetStepStatus } from '../../ServicesPageProvider/ServicesStepsProvider'
import { useIsCreateSnapshotStepRunning } from '../CreateSnapshotStep/useCreateSnapshotStepStatus'
import { DiscoveredServices } from './DiscoveredServices'
import {
  type DiscoveryView,
  FAILED_DISCOVERY_VIEW,
  LOADING_DISCOVERY_VIEW,
  NO_SERVICES_DISCOVERY_VIEW,
  NOT_RUN_DISCOVERY_VIEW,
  SERVICES_DISCOVERY_VIEW,
  useDiscoveryView,
} from './useDiscoveryView'
import { useRunDiscovery } from './useRunDiscovery'

type StartDiscovery = () => void

export const DiscoverServicesStep: FC = memo((): ReactElement => {
  const [{ status, services }, , isError] = useServices()
  const view = useDiscoveryView()
  const setStepStatus = useSetStepStatus()
  const [startDiscovery, isStarting] = useStartDiscovery(view)
  const isCreateSnapshotStepRunning = useIsCreateSnapshotStepRunning()

  // The start request counts as the run, so the tab spins and the buttons stay disabled from the click on
  const isDiscoveryRunning = isStarting || status === RUNNING_DISCOVERY_STATUS
  const stepStatus = getStepStatus(status, isDiscoveryRunning, isError)
  useEffect(() => setStepStatus(DISCOVER_SERVICES_STEP_KEY, stepStatus), [setStepStatus, stepStatus])

  switch (view) {
    case LOADING_DISCOVERY_VIEW:
      return <LoadingIndicator/>
    case NOT_RUN_DISCOVERY_VIEW:
      return (
        <EmptyState
          variant={NO_DATA_EMPTY_STATE_VARIANT}
          title="No Services Discovered Yet"
          lines={['Run discovery to load services and API documents from the selected cluster']}
          action={
            <Button
              variant="contained"
              disabled={isDiscoveryRunning}
              onClick={startDiscovery}
              data-testid="RunDiscoveryButton"
            >
              Run Discovery
            </Button>
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
            <Button
              variant="contained"
              disabled={isDiscoveryRunning}
              onClick={startDiscovery}
              data-testid="RetryDiscoveryButton"
            >
              Try Again
            </Button>
          }
          data-testid="DiscoveryFailedState"
        />
      )
    case NO_SERVICES_DISCOVERY_VIEW:
      return (
        <EmptyState
          variant={NO_DATA_EMPTY_STATE_VARIANT}
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
          // A new discovery clears the snapshots of the wizard, so it waits until Create Snapshot stops running: the
          // outcome of a running publication would show nowhere, and a create request answered later would add its
          // snapshot to the new discovery
          isRestartDiscoveryDisabled={isDiscoveryRunning || isCreateSnapshotStepRunning}
          onRestartDiscovery={startDiscovery}
        />
      )
  }
})

DiscoverServicesStep.displayName = 'DiscoverServicesStep'

function useStartDiscovery(view: DiscoveryView): [StartDiscovery, IsLoading] {
  const { resetSnapshotPublications } = useSnapshotPublications()
  const resetStepsAfter = useResetStepsAfter()
  const setStartView = useSetDiscoveryStartView()
  const showErrorNotification = useShowErrorNotification()
  // The Agents SPA reports no failed request on its own, so the error of a failed start is shown here
  const [runDiscovery, isStarting] = useRunDiscovery(error => showErrorNotification({ message: error.message }))

  const startDiscovery = useCallback(() => {
    // Steps 2 and 3 start over, since their snapshot and promotion used the services of the previous discovery
    resetSnapshotPublications()
    resetStepsAfter(DISCOVER_SERVICES_STEP_KEY)
    setStartView(view)
    runDiscovery()
  }, [resetSnapshotPublications, resetStepsAfter, runDiscovery, setStartView, view])

  return [startDiscovery, isStarting]
}

function getStepStatus(status: DiscoveryStatus, isDiscoveryRunning: boolean, isError: IsError): DiscoveryStatus {
  if (isDiscoveryRunning) {
    return RUNNING_DISCOVERY_STATUS
  }
  // A failed services request shows "Discovery failed", so the tab of the step shows "Failed" with it
  return isError ? ERROR_DISCOVERY_STATUS : status
}
