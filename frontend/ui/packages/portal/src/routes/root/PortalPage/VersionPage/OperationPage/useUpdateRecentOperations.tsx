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
