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
  hasErrors?: boolean
  changelogHasErrors?: boolean
  apiProcessorVersion?: string
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
  hasErrors?: boolean
  changelogHasErrors?: boolean
  apiProcessorVersion?: string
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
