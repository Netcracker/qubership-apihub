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

import type { Dispatch, FC, SetStateAction } from 'react'
import React, { createContext, memo, useContext, useState } from 'react'
import { SettingsBody } from './SettingsBody'
import { SettingsToolbar } from './SettingsToolbar'
import type { SettingsPageRoute } from '../../../routes'
import { USER_ROLES_PAGE } from '../../../routes'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { useSuperAdminCheck } from '@netcracker/qubership-apihub-ui-shared/hooks/user-roles/useSuperAdminCheck'
import { LayoutWithToolbar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithToolbar'
import { CONTENT_PLACEHOLDER_AREA, NO_PERMISSION, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'

export const SettingsPage: FC = memo(() => {
  const [menuItem] = useActiveTabs()
  const isSuperAdmin = useSuperAdminCheck()
  const [, setActiveTab] = useState<SettingsPageRoute>(USER_ROLES_PAGE)

  return <LayoutWithToolbar
    toolbar={isSuperAdmin ? <SettingsToolbar/> : null}
    body={
      <Placeholder
        invisible={isSuperAdmin}
        area={CONTENT_PLACEHOLDER_AREA}
        message={NO_PERMISSION}
      >
        <ActiveTabContentContext.Provider value={menuItem as SettingsPageRoute}>
          <SetActiveTabContentContext.Provider value={setActiveTab}>
            <SettingsBody/>
          </SetActiveTabContentContext.Provider>
        </ActiveTabContentContext.Provider>
      </Placeholder>
    }
  />
})

const ActiveTabContentContext = createContext<SettingsPageRoute>()
const SetActiveTabContentContext = createContext<Dispatch<SetStateAction<SettingsPageRoute>>>()

export function useActiveTabContentContext(): SettingsPageRoute {
  return useContext(ActiveTabContentContext)
}

export function useSetActiveTabContentContext(): Dispatch<SetStateAction<SettingsPageRoute>> {
  return useContext(SetActiveTabContentContext)
}
