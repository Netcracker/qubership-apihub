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
import { ReferenceList } from './ReferenceList'
import { useProjectVersionContent } from '../root/useProjectVersionContent'
import { useParams } from 'react-router-dom'
import { useProject } from '../root/useProject'

export const References: FC = memo(() => {
  const { versionId } = useParams()
  const [project] = useProject()
  const packageKey = project?.packageKey
  const [versionContent, isLoading] = useProjectVersionContent({
    projectKey: packageKey,
    versionKey: versionId ?? undefined,
  })

  return (
    <ReferenceList
      isLoading={isLoading}
      references={versionContent?.refs ?? []}
    />
  )
})
