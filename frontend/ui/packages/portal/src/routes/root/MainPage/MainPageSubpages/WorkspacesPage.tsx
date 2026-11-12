import type { FC } from 'react'
import React from 'react'
import { MainPageCard } from '@portal/routes/root/MainPage/MainPageCard'
import { WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { WORKSPACES_PAGE_REFERER } from '@portal/entities/referer-pages-names'

export const WorkspacesPage: FC = () => {
  return (
    <MainPageCard
      title="Workspaces"
      hideViewSelector
      flatViewKinds={[WORKSPACE_KIND]}
      pageKey={WORKSPACES_PAGE_REFERER}
    />
  )
}
