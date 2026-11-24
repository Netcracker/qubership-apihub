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
import { useDocumentTitle } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useDocumentTitle'
import { PAGE_TITLES } from '@portal/routes/pageTitles'

export const SettingsPage: FC = memo(() => {
  const [menuItem] = useActiveTabs()
  useDocumentTitle(PAGE_TITLES.portalSettings(menuItem))
  const isSuperAdmin = useSuperAdminCheck()
  const [, setActiveTab] = useState<SettingsPageRoute>(USER_ROLES_PAGE)

  return <LayoutWithToolbar
    toolbar={isSuperAdmin ? <SettingsToolbar/> : null}
    body={
      <Placeholder
        invisible={isSuperAdmin}
        area={CONTENT_PLACEHOLDER_AREA}
        message={NO_PERMISSION}
        data-testid="NoPermissionPlaceholder"
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
