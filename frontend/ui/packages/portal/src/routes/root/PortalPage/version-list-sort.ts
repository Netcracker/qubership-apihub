import type { PackageVersionsSortBy, SortOrder } from '@netcracker/qubership-apihub-ui-shared/types/sorting'
import {
  ASC_ORDER,
  DESC_ORDER,
  SORT_BY_CREATED_AT,
  SORT_BY_FIRST_PUBLISHED_AT,
  SORT_BY_VERSION,
} from '@netcracker/qubership-apihub-ui-shared/types/sorting'

export type VersionListSort = Readonly<{
  sortBy: PackageVersionsSortBy
  sortOrder: SortOrder
}>

export type VersionListSortOption = VersionListSort & Readonly<{
  label: string
}>

const LAST_REVISION_DATE_NEWEST: VersionListSortOption = {
  label: 'Last revision date (Newest)',
  sortBy: SORT_BY_CREATED_AT,
  sortOrder: DESC_ORDER,
}
const LAST_REVISION_DATE_OLDEST: VersionListSortOption = {
  label: 'Last revision date (Oldest)',
  sortBy: SORT_BY_CREATED_AT,
  sortOrder: ASC_ORDER,
}
const PUBLICATION_DATE_NEWEST: VersionListSortOption = {
  label: 'Publication Date (Newest)',
  sortBy: SORT_BY_FIRST_PUBLISHED_AT,
  sortOrder: DESC_ORDER,
}
const PUBLICATION_DATE_OLDEST: VersionListSortOption = {
  label: 'Publication Date (Oldest)',
  sortBy: SORT_BY_FIRST_PUBLISHED_AT,
  sortOrder: ASC_ORDER,
}
const VERSION_NAME_ASC: VersionListSortOption = {
  label: 'Version Name (A-Z)',
  sortBy: SORT_BY_VERSION,
  sortOrder: ASC_ORDER,
}
const VERSION_NAME_DESC: VersionListSortOption = {
  label: 'Version Name (Z-A)',
  sortBy: SORT_BY_VERSION,
  sortOrder: DESC_ORDER,
}

// The order matches the dropdown in the mockup
export const VERSION_LIST_SORT_OPTIONS: ReadonlyArray<VersionListSortOption> = [
  LAST_REVISION_DATE_NEWEST,
  LAST_REVISION_DATE_OLDEST,
  PUBLICATION_DATE_NEWEST,
  PUBLICATION_DATE_OLDEST,
  VERSION_NAME_ASC,
  VERSION_NAME_DESC,
]

export const DEFAULT_VERSION_LIST_SORT: VersionListSortOption = PUBLICATION_DATE_NEWEST

export function getVersionListSortKey({ sortBy, sortOrder }: VersionListSort): string {
  return `${sortBy}-${sortOrder}`
}

export function isSameVersionListSort(first: VersionListSort, second: VersionListSort): boolean {
  return first.sortBy === second.sortBy && first.sortOrder === second.sortOrder
}

// Accepts a raw value (e.g. from local storage) and returns a known option only,
// so an outdated or corrupted value never reaches the API request.
export function findVersionListSortOption(sort: Partial<VersionListSort> | null | undefined): VersionListSortOption | undefined {
  return VERSION_LIST_SORT_OPTIONS.find(option => option.sortBy === sort?.sortBy && option.sortOrder === sort?.sortOrder)
}
