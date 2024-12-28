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
import React, { memo } from 'react'
import type { Operation } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { isRestOperation } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { METHOD_TYPE_COLOR_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/method-types'
import type { GraphQlOperationType } from '@netcracker/qubership-apihub-ui-shared/entities/graphql-operation-types'
import { GRAPHQL_OPERATION_TYPE_COLOR_MAP } from '@netcracker/qubership-apihub-ui-shared/entities/graphql-operation-types'
import { CustomListItem } from '@netcracker/qubership-apihub-ui-shared/components/CustomListItem'

// First Order Component //
export type OperationsListItemProps = {
  operation: Operation
  strikeThrough?: boolean
}

export const OperationListItem: FC<OperationsListItemProps> = memo<OperationsListItemProps>(({
  operation,
  strikeThrough = false,
}) => {
  const { type, typeColor } = isRestOperation(operation)
    ? { type: operation.method, typeColor: METHOD_TYPE_COLOR_MAP[operation.method] }
    : { type: renderGraphQlType(operation.type), typeColor: GRAPHQL_OPERATION_TYPE_COLOR_MAP[operation.type] }

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
