export const DRAFT_VERSION_STATUS = 'draft'
export const RELEASE_VERSION_STATUS = 'release'

export type VersionStatus =
  | typeof DRAFT_VERSION_STATUS
  | typeof RELEASE_VERSION_STATUS
