import { useGroupComparisons } from './VersionPage/useGroupComparisons'
import type { VersionsComparison } from '@netcracker/qubership-apihub-api-processor'
import { useVersionWithRevision } from '../useVersionWithRevision'
import type { Key, VersionKey } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { IsLoading } from '@netcracker/qubership-apihub-ui-shared/utils/aliases'
import { useChangesSummaryContext } from '@portal/routes/root/PortalPage/VersionPage/ChangesSummaryProvider'
import type { VersionChangesSummary } from '@netcracker/qubership-apihub-ui-shared/entities/version-changes-summary'

export type UseCompareGroupsOptions = Partial<{
  changedPackageKey: Key
  changedVersionKey: VersionKey
  originPackageKey: Key
  originVersionKey: VersionKey
  currentGroup: Key
  previousGroup: Key
}>

export function useCompareGroups(options: UseCompareGroupsOptions): [VersionsComparison, IsLoading] {
  const {
    originPackageKey,
    changedVersionKey,
    currentGroup,
    previousGroup,
  } = options

  const [changesSummary, isContextValid, setChangesSummary] = useChangesSummaryContext(options)

  const { fullVersion } = useVersionWithRevision(changedVersionKey, originPackageKey)
  const [groupsComparisons, isLoading] = useGroupComparisons({
    packageKey: originPackageKey,
    versionKey: fullVersion,
    currentGroup: currentGroup,
    previousGroup: previousGroup,
  })

  if (groupsComparisons && !changesSummary && isContextValid) {
    setChangesSummary({ operationTypes: groupsComparisons[0].operationTypes } as VersionChangesSummary)
  }

  return [groupsComparisons ? groupsComparisons[0] : EMPTY_VERSIONS_COMPARISON, isLoading]
}

export const EMPTY_VERSIONS_COMPARISON: VersionsComparison = {
  notifications: [],
  comparisonFileId: '',
  comparisonInternalDocuments: [],
  packageId: '',
  version: '',
  revision: 0,
  previousVersion: '',
  previousVersionPackageId: '',
  fromCache: false,
  operationTypes: [],
  data: [],
}
