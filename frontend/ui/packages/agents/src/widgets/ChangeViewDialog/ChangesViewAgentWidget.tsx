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

  const { data: versionChangelog, isLoading, fetchNextPage, isFetchingNextPage, hasNextPage } = usePagedVersionChangelog({
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
      isNextPageFetching={isFetchingNextPage}
      hasNextPage={hasNextPage}
    />
  )
})
