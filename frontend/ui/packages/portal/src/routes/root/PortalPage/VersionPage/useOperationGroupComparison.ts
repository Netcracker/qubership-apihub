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

import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { getOperationGroups } from './useOperationGroups'
import { isEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import type { OperationGroup } from '@netcracker/qubership-apihub-ui-shared/entities/operation-groups'

export const useOperationGroupComparison = (): [boolean, GetOperationGroupFunction] => {
  const { packageId, versionId } = useParams()
  const [operationGroup, setOperationGroup] = useState<OperationGroup[]>([])

  const onGetOperationGroup = async (): Promise<void> => {
    if (isEmpty(operationGroup)) {
      const operationGroup = await getOperationGroups(packageId!, versionId!)
      setOperationGroup(operationGroup)
    }
  }

  const disableCompareGroup = operationGroup.length < 2

  return [disableCompareGroup, onGetOperationGroup]
}

type GetOperationGroupFunction = () => Promise<void>
