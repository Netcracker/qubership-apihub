import type { FC } from 'react'
import React, { memo } from 'react'
import { usePrivateWorkspace } from './usePrivateWorkspaceUser'
import { PrivatePagePlaceholder } from './PrivatePagePlaceholder'
import { PrivatePageTable } from './PrivatePageTable'

export const PrivatePage: FC = memo(() => {
  const [workspaceId, isLoading] = usePrivateWorkspace({ cacheTime: 1000 })

  return workspaceId
    ? <PrivatePageTable workspaceId={workspaceId} isIdLoading={isLoading}/>
    : <PrivatePagePlaceholder/>
})
