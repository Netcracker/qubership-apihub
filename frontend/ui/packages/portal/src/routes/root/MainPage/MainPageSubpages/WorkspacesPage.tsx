import type { FC } from 'react'
import React from 'react'
import { MainPageCard } from '@portal/routes/root/MainPage/MainPageCard'
import { WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { useDocumentTitle } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useDocumentTitle'
import { WORKSPACES_PAGE_REFERER } from '@portal/entities/referer-pages-names'
import { PAGE_TITLES } from '@portal/routes/pageTitles'

export const WorkspacesPage: FC = () => {
  useDocumentTitle(PAGE_TITLES.workspaces())

  return (
    <MainPageCard
      title="Workspaces"
      hideViewSelector
      flatViewKinds={[WORKSPACE_KIND]}
      pageKey={WORKSPACES_PAGE_REFERER}
    />
  )
}
