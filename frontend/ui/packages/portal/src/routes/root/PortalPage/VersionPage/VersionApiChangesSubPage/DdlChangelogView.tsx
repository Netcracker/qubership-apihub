import type { FC } from 'react'
import { memo, useMemo } from 'react'

import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { CONTRACT_TYPE_DDL } from '@netcracker/qubership-apihub-ui-shared/entities/contract-types'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { DdlChangesViewTable } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/components/DdlChangesViewTable'
import {
  usePreviousReleasePackageKey,
  usePreviousReleaseVersion,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/components/PreviousReleaseOptionsProvider'

import { useCurrentPackage } from '@apihub/components/CurrentPackageProvider'
import { useRefSearchParam } from '@apihub/routes/root/PortalPage/useRefSearchParam'

import { useDdlChanges } from '../api/useDdlChanges'
import { useFlatDdlChanges } from '../api/useFlatDdlChanges'
import { useOperationsComparisonBrowseLinkHandlers } from '../useOperationsComparisonBrowseLinkHandlers'
import { useOrderedComparisonFiltersSummary } from '../useOrderedComparisonFiltersSummary'
import { DdlEntityChangesSubTableWrapper } from './DdlEntityChangesSubTableWrapper'

export type DdlChangelogViewProps = {
  versionKey: Key
  packageKey: Key
  searchValue?: string
}

export const DdlChangelogView: FC<DdlChangelogViewProps> = memo<DdlChangelogViewProps>((props) => {
  const { versionKey, packageKey, searchValue } = props

  const [severityFilters] = useSeverityFiltersSearchParam()
  const changes = useOrderedComparisonFiltersSummary({ apiType: CONTRACT_TYPE_DDL })
  const [refKey] = useRefSearchParam()
  const previousReleaseVersion = usePreviousReleaseVersion()
  const previousReleasePackageKey = usePreviousReleasePackageKey()
  const currentPackage = useCurrentPackage()
  const onLinkClick = useOperationsComparisonBrowseLinkHandlers()

  const {
    data: ddlChangelog,
    isLoading,
    fetchNextPage,
    isFetchingNextPage: isNextPageFetching,
    hasNextPage,
    isChangelogReady,
  } = useDdlChanges({
    packageKey: packageKey,
    versionKey: versionKey,
    previousVersionKey: previousReleaseVersion,
    previousVersionPackageKey: previousReleasePackageKey,
    textFilter: searchValue,
    severityFilters: severityFilters,
    refPackageId: refKey,
    page: 1,
    limit: 100,
  })

  const flatDdlChangelog = useFlatDdlChanges(ddlChangelog, isChangelogReady || !isLoading)
  const { entities: ddlChanges } = flatDdlChangelog

  const hasChanges = useMemo(
    () => !!changes && Object.values(changes).some(Boolean),
    [changes],
  )

  return (
    <Placeholder
      invisible={!changes || isNotEmpty(ddlChanges) || isLoading && hasChanges}
      area={CONTENT_PLACEHOLDER_AREA}
      message={searchValue ? NO_SEARCH_RESULTS : 'No changes'}
      data-testid={searchValue ? 'NoSearchResultsPlaceholder' : 'NoChangesPlaceholder'}
    >
      <DdlChangesViewTable
        value={ddlChanges}
        packageKey={packageKey}
        versionKey={versionKey}
        packageObject={currentPackage}
        fetchNextPage={fetchNextPage}
        isNextPageFetching={isNextPageFetching}
        hasNextPage={hasNextPage}
        SubTableComponent={DdlEntityChangesSubTableWrapper}
        isLoading={isLoading}
        onLinkClick={onLinkClick}
      />
    </Placeholder>
  )
})

DdlChangelogView.displayName = 'DdlChangelogView'
