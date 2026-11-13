import type { FC } from 'react'
import { memo } from 'react'
import {
  ROLES_HIERARCHY_PAGE,
  RULESET_MANAGEMENT_PAGE,
  SYSTEM_ADMINISTRATORS_PAGE,
  SYSTEM_TOKENS_PAGE,
  USER_ROLES_PAGE,
} from '../../../routes'
import { useActiveTabContentContext } from './SettingsPage'
import { SettingsNavigation } from './SettingsNavigation'
import { UserRolesSettingsTab } from './UserRolesSettingsTab'
import { SystemTokensTab } from './SystemTokensTab'
import { LayoutWithTabs } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithTabs'
import { RolesHierarchySettingsTab } from '@portal/routes/root/RolesHierarchySettingsTab'
import {
  SystemAdministratorsTab,
} from '@portal/routes/root/SettingsPage/SystemAdministratorsTab/SystemAdministratorsTab'
import { RulesetManagementTab } from './RulesetManagementTab/RulesetManagementTab'

export const SettingsBody: FC = memo(() => {
  const activeTab = useActiveTabContentContext()
  return (
    <LayoutWithTabs
      tabs={<SettingsNavigation/>}
      body={
        <>
          {
            {
              [USER_ROLES_PAGE]: <UserRolesSettingsTab/>,
              [ROLES_HIERARCHY_PAGE]: <RolesHierarchySettingsTab/>,
              [SYSTEM_ADMINISTRATORS_PAGE]: <SystemAdministratorsTab/>,
              [SYSTEM_TOKENS_PAGE]: <SystemTokensTab/>,
              [RULESET_MANAGEMENT_PAGE]: <RulesetManagementTab/>,
            }[activeTab]
          }
        </>
      }
    />
  )
})
