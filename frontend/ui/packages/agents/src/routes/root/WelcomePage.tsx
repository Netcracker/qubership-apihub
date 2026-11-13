import { type FC, memo } from 'react'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import {
  EmptyState,
  NO_DATA_EMPTY_STATE_VARIANT,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder/EmptyState'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'

import { NamespaceToolbar } from './NamespacePage/NamespaceToolbar'

export const WelcomePage: FC = memo(() => {
  return (
    <PageLayout
      toolbar={
        <Toolbar
          header={<NamespaceToolbar />}
        />
      }
      body={
        <EmptyState
          variant={NO_DATA_EMPTY_STATE_VARIANT}
          title="Select source and destination"
          lines={['Choose cloud and namespace under From, then select a portal workspace under To']}
          data-testid="SelectSourceAndDestinationState"
        />
      }
    />
  )
})
