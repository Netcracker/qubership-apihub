import { useEffect } from 'react'
import { useSetRecentOperations } from '../../../RecentOperationsProvider'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'

export function useUpdateRecentOperations(operation: OperationData | undefined): void {
  const setRecentOperations = useSetRecentOperations()

  useEffect(() => {
    setRecentOperations(previousOperations => {
      const result = (operation ? [operation, ...previousOperations] : [...previousOperations])
        .reduce((acc: OperationData[], item: OperationData) => {
          if (!acc.find(({ operationKey: key }) => key === item.operationKey)) {
            acc.push(item)
          }

          return acc
        }, [])

      // limit value is 5 and 1 current opened operation
      if (previousOperations.length === 6) {
        result.pop()
      }

      return result
    })
  }, [operation, setRecentOperations])
}
