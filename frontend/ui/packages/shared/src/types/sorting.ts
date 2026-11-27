export const SORT_BY_VERSION = 'version'
export const SORT_BY_CREATED_AT = 'createdAt'
export const SORT_BY_FIRST_PUBLISHED_AT = 'firstPublishedAt'

export type PackageVersionsSortBy =
  | typeof SORT_BY_VERSION
  | typeof SORT_BY_CREATED_AT
  | typeof SORT_BY_FIRST_PUBLISHED_AT

export const ASC_ORDER = 'asc'
export const DESC_ORDER = 'desc'

export type SortOrder = typeof ASC_ORDER | typeof DESC_ORDER
