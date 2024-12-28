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
import { memo, useMemo } from 'react'
import { useProjectVersionContent } from '../root/useProjectVersionContent'
import { useGroupVersionContent } from '../root/useGroupVersionContent'
import type { RefKind } from '@apihub/entities/refs'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ApiDocument } from '@apihub/components/ApiDocumentList'
import { ApiDocumentList } from '@apihub/components/ApiDocumentList'
import type { PublishedSpec } from '@apihub/entities/published-specs'
import { DOC_SPEC_VIEW_MODE } from '@netcracker/qubership-apihub-ui-shared/components/SpecViewToggler'

export type RefSpecListProps = {
  kind?: RefKind
  refKey?: Key
  versionKey?: Key
}

export const RefSpecList: FC<RefSpecListProps> = memo<RefSpecListProps>(({ kind, refKey, versionKey }) => {
  if (kind === 'group') {
    return (
      <GroupSpecList
        groupKey={refKey}
        versionKey={versionKey}
      />
    )
  }

  return (
    <ProjectSpecList
      projectKey={refKey}
      versionKey={versionKey}
    />
  )
})

export type GroupSpecListProps = {
  groupKey?: Key
  versionKey?: Key
}

const GroupSpecList: FC<GroupSpecListProps> = memo<GroupSpecListProps>(({ groupKey, versionKey }) => {
  const [versionContent, isLoading] = useGroupVersionContent({ groupKey, versionKey })

  // TODO: Need to calculate `projectKey`, but how...
  const apiDocuments = useMemo(
    () => toApiDocuments(versionContent?.specs, undefined!, versionKey!),
    [versionContent?.specs, versionKey],
  )

  return (
    <ApiDocumentList
      isLoading={isLoading}
      value={apiDocuments}
    />
  )
})

type ProjectSpecListProps = {
  projectKey?: Key
  versionKey?: Key
}

const ProjectSpecList: FC<ProjectSpecListProps> = memo<ProjectSpecListProps>(({ projectKey, versionKey }) => {
  const [versionContent, isLoading] = useProjectVersionContent({ projectKey, versionKey })

  const apiDocuments = useMemo(
    () => toApiDocuments(versionContent?.specs, projectKey!, versionKey!),
    [projectKey, versionContent?.specs, versionKey],
  )

  return (
    <ApiDocumentList
      isLoading={isLoading}
      value={apiDocuments}
    />
  )
})

function toApiDocuments(specs: ReadonlyArray<PublishedSpec> | undefined, projectKey: Key, version: Key): ApiDocument[] {
  if (!specs) {
    return []
  }
  return specs.map(({ title, type, key, slug }) => ({
    title: title,
    type: type,
    subtitle: key,
    url: {
      pathname: `/portal/projects/${encodeURIComponent(projectKey!)}/${encodeURIComponent(version!)}/${encodeURIComponent(slug)}`,
      search: `mode=${DOC_SPEC_VIEW_MODE}`,
    },
  }))
}

