export const DRAFT_VERSION_STATUS = 'draft'
export const RELEASE_VERSION_STATUS = 'release'
export const ARCHIVED_VERSION_STATUS = 'archived'

export type VersionStatus =
  | typeof DRAFT_VERSION_STATUS
  | typeof RELEASE_VERSION_STATUS
  | typeof ARCHIVED_VERSION_STATUS

export type VersionStatuses = ReadonlyArray<VersionStatus>
