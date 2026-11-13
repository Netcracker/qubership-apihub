import { LayoutWithToolbar } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithToolbar'
import type { Dispatch, FC, SetStateAction } from 'react'
import { createContext, memo, useContext, useState } from 'react'
import { PERSONAL_ACCESS_TOKENS_PAGE, type ProfilePageRoute } from '../../../routes'
import { ProfileBody } from './ProfileBody'
import { ProfileToolbar } from './ProfileToolbar'
import { useActiveTabs } from '@netcracker/qubership-apihub-ui-shared/hooks/pathparams/useActiveTabs'
import { useDocumentTitle } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useDocumentTitle'
import { PAGE_TITLES } from '@portal/routes/pageTitles'

export const ProfilePage: FC = memo(() => {
  const [menuItem] = useActiveTabs()
  useDocumentTitle(PAGE_TITLES.profile(menuItem))
  const [, setActiveTab] = useState<ProfilePageRoute>(PERSONAL_ACCESS_TOKENS_PAGE)

  return (
    <LayoutWithToolbar
      toolbar={<ProfileToolbar />}
      body={
        <ActiveTabContentContext.Provider value={menuItem as ProfilePageRoute}>
          <SetActiveTabContentContext.Provider value={setActiveTab}>
            <ProfileBody />
          </SetActiveTabContentContext.Provider>
        </ActiveTabContentContext.Provider>
      }
    />
  )
})

const ActiveTabContentContext = createContext<ProfilePageRoute>()
const SetActiveTabContentContext = createContext<Dispatch<SetStateAction<ProfilePageRoute>>>()

export function useActiveTabContentContext(): ProfilePageRoute {
  return useContext(ActiveTabContentContext)
}

export function useSetActiveTabContentContext(): Dispatch<SetStateAction<ProfilePageRoute>> {
  return useContext(SetActiveTabContentContext)
}
