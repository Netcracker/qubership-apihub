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

import type { Key } from '../utils/types'
import type { Principal } from './principals'
import type { VersionStatus } from './version-status'
import { isNotEmpty } from '../utils/arrays'
import type { PublishMeta, PublishMetaDto } from './publish-meta'

export type Revisions = Readonly<Revision[]>

export type Revision = Readonly<{
  revision: number
  version: Key
  latestRevision: boolean
  status: VersionStatus
  createdBy: Principal
  createdAt: string
  revisionLabels?: string[]
  publishMeta?: PublishMeta
}>

export type RevisionDto = Readonly<{
  revision: number
  version: Key
  notLatestRevision?: boolean
  status: VersionStatus
  createdBy: Principal
  createdAt: string
  revisionLabels?: string[]
  publishMeta?: PublishMetaDto
}>

export type RevisionsDto = Readonly<{
  revisions: ReadonlyArray<RevisionDto>
}>

export function toRevisions(value: RevisionsDto): Revisions {
  return value.revisions.map(revision => {
    const { publishMeta } = revision
    const isPublishMetaNotEmpty = publishMeta && isNotEmpty(Object.keys(publishMeta))

    const commonData = {
      ...revision,
      latestRevision: !revision.notLatestRevision,
      createdBy: {
        key: revision.createdBy.id,
        ...revision.createdBy,
      },
    }

    if (isPublishMetaNotEmpty) {
      return {
        ...commonData,
        publishMeta: {
          ...revision.publishMeta,
          commitKey: revision.publishMeta?.commitId,
        },
      }
    }

    return commonData
  })
}
