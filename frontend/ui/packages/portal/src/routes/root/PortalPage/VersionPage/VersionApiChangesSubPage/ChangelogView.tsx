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
import { usePackageKind } from '../../usePackageKind'
import { OperationChangesSubTableWrapper } from './OperationChangesSubTableWrapper'
import {
  usePagedVersionChangelog,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/useCommonPagedVersionChangelog'
import { useOrderedComparisonFiltersSummary } from '../useOrderedComparisonFiltersSummary'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { ApiAudience, ApiKind } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { DEFAULT_API_TYPE } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import type { OperationGroupName } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'
import {
  useSeverityFiltersSearchParam,
} from '@netcracker/qubership-apihub-ui-shared/hooks/change-severities/useSeverityFiltersSearchParam'
import { ChangesViewTable, useFlatVersionChangelog } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget'
import { useCurrentPackage } from '@apihub/components/CurrentPackageProvider'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { useRefSearchParam } from '@apihub/routes/root/PortalPage/useRefSearchParam'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type ChangelogViewProps = {
  versionKey: Key
  packageKey: Key
  tag?: string
  searchValue?: string
  apiType?: ApiType
  apiKind?: ApiKind
  apiAudience?: ApiAudience
  group?: OperationGroupName
}

export const ChangelogView: FC<ChangelogViewProps> = memo<ChangelogViewProps>(props => {
  const { versionKey, packageKey, tag, searchValue, apiType = DEFAULT_API_TYPE, apiKind, apiAudience, group } = props
  const [mainPackageKind] = usePackageKind()
  const [severityFilters] = useSeverityFiltersSearchParam()
  const changes = useOrderedComparisonFiltersSummary({ apiType })
  const [refKey] = useRefSearchParam()

  const [versionChangelog, isLoading, fetchNextPage, isNextPageFetching, hasNextPage] = usePagedVersionChangelog({
    packageKey: packageKey,
    versionKey: versionKey,
    tag: tag,
    searchValue: searchValue,
    apiType: apiType,
    apiKind: apiKind,
    apiAudience: apiAudience,
    group: group,
    severityFilters: severityFilters,
    page: 1,
    limit: 100,
    packageIdFilter: refKey,
  })
  const flatVersionChangelog = useFlatVersionChangelog(versionChangelog)
  const { operations: operationsChanges } = flatVersionChangelog

  const currentPackage = useCurrentPackage()

  const hasChanges = !!changes && Object.values(changes).some(Boolean)
  return (
    <Placeholder
      invisible={!changes || isNotEmpty(operationsChanges) || isLoading && hasChanges}
      area={CONTENT_PLACEHOLDER_AREA}
      message={searchValue ? NO_SEARCH_RESULTS : 'No changes'}
      testId={searchValue ? 'NoSearchResultsPlaceholder' : 'NoChangesPlaceholder'}
    >
      <ChangesViewTable
        value={operationsChanges}
        packageKey={packageKey}
        versionKey={versionKey}
        packageObject={currentPackage}
        apiType={apiType}
        mainPackageKind={mainPackageKind}
        fetchNextPage={fetchNextPage}
        isNextPageFetching={isNextPageFetching}
        hasNextPage={hasNextPage}
        SubTableComponent={OperationChangesSubTableWrapper}
        isLoading={isLoading}
      />
    </Placeholder>
  )
})
