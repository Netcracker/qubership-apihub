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
