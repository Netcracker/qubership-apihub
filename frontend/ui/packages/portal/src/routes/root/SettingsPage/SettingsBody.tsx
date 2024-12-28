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
import { ROLES_HIERARCHY_PAGE, SYSTEM_ADMINISTRATORS_PAGE, SYSTEM_TOKENS_PAGE, USER_ROLES_PAGE } from '../../../routes'
import { useActiveTabContentContext } from './SettingsPage'
import { SettingsNavigation } from './SettingsNavigation'
import { UserRolesSettingsTab } from './UserRolesSettingsTab'
import { SystemTokensTab } from './SystemTokensTab'
import { LayoutWithTabs } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithTabs'
import { RolesHierarchySettingsTab } from '@apihub/routes/root/RolesHierarchySettingsTab'
import {
  SystemAdministratorsTab,
} from '@apihub/routes/root/SettingsPage/SystemAdministratorsTab/SystemAdministratorsTab'

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
            }[activeTab]
          }
        </>
      }
    />
  )
})
