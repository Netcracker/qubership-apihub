import type { FC } from 'react'
import { memo } from 'react'
import { OperationChangesSubTableWrapper } from './OperationChangesSubTableWrapper'
import type { OperationChangeBase } from '@netcracker/qubership-apihub-ui-shared/entities/version-changelog'
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
  changes: ReadonlyArray<OperationChangeBase>
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

