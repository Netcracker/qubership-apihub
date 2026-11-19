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
