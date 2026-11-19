import type { FC } from 'react'
import { memo } from 'react'
import { ChangesSummaryProvider } from '../ChangesSummaryProvider'
import { useOperationSearchParam } from '../useOperationSearchParam'
import { DifferentOperationsComparisonPage } from './DifferentOperationsComparisonPage'
import { DifferentOperationVersionsComparisonPage } from './DifferentOperationVersionsComparisonPage'
import { useVersionSearchParam } from '../../../useVersionSearchParam'

export const OperationsComparisonPage: FC = memo(() => {
  const [operation] = useOperationSearchParam()
  const [version] = useVersionSearchParam()

  return operation && !version
    ? <DifferentOperationsComparisonPage/>
    : (
      <ChangesSummaryProvider>
        <DifferentOperationVersionsComparisonPage/>
      </ChangesSummaryProvider>
    )
})
