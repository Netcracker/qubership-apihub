import { type FC, memo } from 'react'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'

import { EmptyState, READY_EMPTY_STATE_VARIANT } from '@agents/components/EmptyState/EmptyState'
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
          variant={READY_EMPTY_STATE_VARIANT}
          title="Select source and destination"
          lines={['Choose cloud and namespace under From, then select a portal workspace under To']}
          data-testid="SelectSourceAndDestinationState"
        />
      }
    />
  )
})
