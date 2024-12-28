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
import { ProjectEditorToolbar } from './ProjectEditorToolbar/ProjectEditorToolbar'
import { ProjectEditorSidebar } from './ProjectEditorSidebar/ProjectEditorSidebar'
import { ProjectEditorBody } from './ProjectEditorBody/ProjectEditorBody'

import { ConflictedBlobKeyProvider } from './ConflictedBlobKeyProvider'
import { BranchEditingWebSocketProvider } from './BranchEditingWebSocketProvider'
import { FileEditingWebSocketProvider } from './FileEditingWebSocketProvider'
import { MonacoContentProvider } from './MonacoContentProvider'
import { useBranchSearchParam } from '../../useBranchSearchParam'
import { BwcVersionKeyProvider } from './BwcVersionKeyProvider'
import { useGitlabIntegrationCheck } from '../useGitlabIntegrationCheck'
import { useBranchCache } from './useBranchCache'
import { usePublishableBranchFileKeys } from './usePublishableBranchFileKeys'
import { useFileProblemsMap } from './useFileProblems'
import { NoIntegrationPlaceholder } from '@netcracker/qubership-apihub-ui-shared/components/NoIntegrationPlaceholder'
import { PageLayout } from '@netcracker/qubership-apihub-ui-shared/components/PageLayout'

export const ProjectEditorPage: FC = memo(() => {
  const integration = useGitlabIntegrationCheck()
  const [branchSearchParam] = useBranchSearchParam()
  const [, isBranchCacheLoading] = useBranchCache()
  const publishableFileKeys = usePublishableBranchFileKeys()
  const [, isFileProblemsMapLoading] = useFileProblemsMap(publishableFileKeys)

  const isBranchIndexing = isBranchCacheLoading || isFileProblemsMapLoading

  if (!integration) {
    return <NoIntegrationPlaceholder/>
  }

  return (
    <BranchEditingWebSocketProvider key={branchSearchParam!}>
      <FileEditingWebSocketProvider>
        <ConflictedBlobKeyProvider>
          <BwcVersionKeyProvider key={branchSearchParam!}>
            <MonacoContentProvider>
              <PageLayout
                toolbar={<ProjectEditorToolbar isBranchIndexing={isBranchIndexing}/>}
                navigation={<ProjectEditorSidebar/>}
                body={<ProjectEditorBody/>}
                sx={{ navigation: { paddingBottom: '0' } }}
              />
            </MonacoContentProvider>
          </BwcVersionKeyProvider>
        </ConflictedBlobKeyProvider>
      </FileEditingWebSocketProvider>
    </BranchEditingWebSocketProvider>
  )
})
