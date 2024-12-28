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
import { OperationChangesSubTableWrapper } from './OperationChangesSubTableWrapper'
import type { OperationChangeData } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import type { FetchNextPage } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/components/ChangesViewTable'
import { ChangesViewTable } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/components/ChangesViewTable'
import {
  CONTENT_PLACEHOLDER_AREA,
  NO_SEARCH_RESULTS,
  Placeholder,
} from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type ChangesViewWidgetProps = {
  changes: ReadonlyArray<OperationChangeData>
  packageKey: Key
  versionKey: Key
  isLoading: boolean
  searchValue?: string
  apiType?: ApiType
  fetchNextPage?: FetchNextPage
  isNextPageFetching?: boolean
  hasNextPage?: boolean
}

export const ChangesViewWidget: FC<ChangesViewWidgetProps> = memo<ChangesViewWidgetProps>((
  {
    changes,
    isLoading,
    searchValue,
    packageKey,
    versionKey,
    apiType,
    fetchNextPage,
    isNextPageFetching,
    hasNextPage,
  },
) => {

  // TODO 18.07.23 // Check what we should do with 'packageObject'
  return (
    <Placeholder
      invisible={isNotEmpty(changes) || isLoading}
      area={CONTENT_PLACEHOLDER_AREA}
      message={searchValue ? NO_SEARCH_RESULTS : 'No changes'}
    >
      <ChangesViewTable
        value={changes}
        packageKey={packageKey}
        versionKey={versionKey}
        packageObject={null}
        apiType={apiType}
        fetchNextPage={fetchNextPage}
        isNextPageFetching={isNextPageFetching}
        hasNextPage={hasNextPage}
        SubTableComponent={OperationChangesSubTableWrapper}
        isLoading={isLoading}
      />
    </Placeholder>
  )
})

