import type { FC } from 'react'
import { useActiveTabContentContext } from './ProfilePage'
import { LayoutWithTabs } from '@netcracker/qubership-apihub-ui-shared/components/PageLayouts/LayoutWithTabs'
import { PersonalAccessTokensTab } from './tabs/PersonalAccessTokensTab'
import { PERSONAL_ACCESS_TOKENS_PAGE } from '../../../routes'
import { ProfileNavigation } from './ProfileNavigation'

export const ProfileBody: FC = () => {
  const activeTab = useActiveTabContentContext()
  return (
    <LayoutWithTabs
      tabs={<ProfileNavigation/>}
      body={
        <>
          {
            {
              [PERSONAL_ACCESS_TOKENS_PAGE]: <PersonalAccessTokensTab/>,
            }[activeTab]
          }
        </>
      }
    />
  )
}
