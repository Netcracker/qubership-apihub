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
import { ChangesViewWidget } from './ChangesViewWidget'
import type { Key } from '@netcracker/qubership-apihub-ui-shared/entities/keys'
import { useFlatVersionChangelog } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget'
import {
  usePagedVersionChangelog,
} from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget/api/useCommonPagedVersionChangelog'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

export type ChangesViewAgentWidgetProps = {
  versionKey: Key
  packageKey: Key
  searchValue?: string
  apiType?: ApiType
}

export const ChangesViewAgentWidget: FC<ChangesViewAgentWidgetProps> = memo<ChangesViewAgentWidgetProps>(props => {
  const { versionKey, packageKey, searchValue, apiType } = props

  const [versionChangelog, isLoading, fetchNextPage, isNextPageFetching, hasNextPage] = usePagedVersionChangelog({
    versionKey: versionKey,
    packageKey: packageKey,
    searchValue: searchValue,
    apiType: apiType,
  })
  const flatVersionChangelog = useFlatVersionChangelog(versionChangelog)
  const operationsChanges = flatVersionChangelog.operations

  return (
    <ChangesViewWidget
      changes={operationsChanges}
      isLoading={isLoading}
      packageKey={packageKey}
      versionKey={versionKey}
      apiType={apiType}
      fetchNextPage={fetchNextPage}
      isNextPageFetching={isNextPageFetching}
      hasNextPage={hasNextPage}
    />
  )
})
