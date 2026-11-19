import type { FC } from 'react'
import { memo } from 'react'
import { Button } from '@mui/material'
import { ConfigureDashboardTree } from './ConfigureDashboardTree'
import { PACKAGES_CONFIGURE_DASHBOARD_TAB } from './configure-dashboard'
import { useActiveTabConfigureDashboard } from './ConfigureDashboardSubPage'
import { useEventBus } from '@portal/routes/EventBusProvider'
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
