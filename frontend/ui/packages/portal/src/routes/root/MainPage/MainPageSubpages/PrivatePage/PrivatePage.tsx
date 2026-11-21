import type { FC } from 'react'
import React, { memo } from 'react'
import { useDocumentTitle } from '@netcracker/qubership-apihub-ui-shared/hooks/common/useDocumentTitle'
import { usePrivateWorkspace } from './usePrivateWorkspaceUser'
import { PrivatePagePlaceholder } from './PrivatePagePlaceholder'
import { PrivatePageTable } from './PrivatePageTable'
import { PAGE_TITLES } from '@portal/routes/pageTitles'

export const PrivatePage: FC = memo(() => {
  useDocumentTitle(PAGE_TITLES.private())

  const [workspaceId, isLoading] = usePrivateWorkspace({ cacheTime: 1000 })

  return workspaceId
    ? <PrivatePageTable workspaceId={workspaceId} isIdLoading={isLoading}/>
    : <PrivatePagePlaceholder/>
})
