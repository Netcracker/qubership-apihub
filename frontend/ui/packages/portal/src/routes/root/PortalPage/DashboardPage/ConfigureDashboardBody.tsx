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
import { memo } from 'react'
import { Button } from '@mui/material'
import { ConfigureDashboardTree } from './ConfigureDashboardTree'
import { PACKAGES_CONFIGURE_DASHBOARD_TAB } from './configure-dashboard'
import { useActiveTabConfigureDashboard } from './ConfigureDashboardSubPage'
import { useEventBus } from '@apihub/routes/EventBusProvider'
import { BodyCard } from '@netcracker/qubership-apihub-ui-shared/components/BodyCard'

export const ConfigureDashboardBody: FC = memo(() => {
  const activeTab = useActiveTabConfigureDashboard()
  const { showAddPackageDialog } = useEventBus()

  // TODO: take out an object
  return (
    <>
      {
        {
          [PACKAGES_CONFIGURE_DASHBOARD_TAB]: (
            <BodyCard
              header="Configure Dashboard"
              body={<ConfigureDashboardTree/>}
              action={<Button
                variant="contained"
                onClick={showAddPackageDialog}
                data-testid="AddPackageButton"
              >
                Add Package
              </Button>}
            />),
        }[activeTab]
      }
    </>
  )
})
