import type { FC } from 'react'
import React, { memo } from 'react'
import type { Operation } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import {
  isAsyncApiOperation,
  isGraphQlOperation,
  isRestOperation,
} from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { METHOD_TYPE_COLOR_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/method-types'
import type { GraphQlOperationType } from '@netcracker/qubership-apihub-ui-shared/entities/graphql-operation-types'
import {
  GRAPHQL_OPERATION_TYPE_COLOR_MAP,
} from '@netcracker/qubership-apihub-ui-shared/entities/graphql-operation-types'
import { CustomListItem } from '@netcracker/qubership-apihub-ui-shared/components/CustomListItem'
import {
  ASYNCAPI_OPERATION_TYPE_COLOR_MAP,
} from '@netcracker/qubership-apihub-ui-shared/entities/asyncapi-operation-types'

// First Order Component //
export type OperationsListItemProps = {
  operation: Operation
  strikeThrough?: boolean
}

export const OperationListItem: FC<OperationsListItemProps> = memo<OperationsListItemProps>(({
  operation,
  strikeThrough = false,
}) => {
  const { type, typeColor } =
  isRestOperation(operation)
    ? { type: operation.method, typeColor: METHOD_TYPE_COLOR_MAP[operation.method] }
    : isGraphQlOperation(operation)
      ? { type: renderGraphQlType(operation.type), typeColor: GRAPHQL_OPERATION_TYPE_COLOR_MAP[operation.type] }
      : isAsyncApiOperation(operation)
        ? { type: operation.action, typeColor: ASYNCAPI_OPERATION_TYPE_COLOR_MAP[operation.action] }
        : { type: 'unknown', typeColor: 'gray' } // Default, should not happen

  return (
    <CustomListItem
      title={operation.title}
      strikeThrough={strikeThrough}
      badgeTitle={type.toUpperCase()}
      badgeColor={typeColor}
    />
  )
})

function renderGraphQlType(type: GraphQlOperationType): string {
  return type[0]
}
