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

import type { FC, HTMLAttributes, ReactNode } from 'react'
import * as React from 'react'
import { memo, useMemo } from 'react'
import type { Operation } from '../entities/operations'
import { isGraphQlOperation, isRestOperation } from '../entities/operations'
import type { TestableProps } from './Testable'
import { OptionItem } from './OptionItem'
import { CustomChip } from './CustomChip'
import { RestOperationChip } from './Operations/RestOperationChip'
import { GraphQlOperationChip } from './Operations/GraphQlOperationChip'

const UNKNOWN_OPERATION_VALUE = 'unknown'

export type OperationOptionItemProps = {
  props: HTMLAttributes<HTMLLIElement>
  operation: Operation
} & TestableProps

export const OperationOptionItem: FC<OperationOptionItemProps> = memo<OperationOptionItemProps>(({
  props,
  operation,
  'data-testid': dataTestId,
}) => {
  const [subtitle, chip] = useMemo<[string, ReactNode]>(() => {
    if (isRestOperation(operation)) {
      return [operation.path, <RestOperationChip operation={operation}/>]
    }
    if (isGraphQlOperation(operation)) {
      return [operation.type, <GraphQlOperationChip operation={operation}/>]
    }
    // Default, should not happen
    return [UNKNOWN_OPERATION_VALUE, <CustomChip variant="outlined" value={UNKNOWN_OPERATION_VALUE}/>]
  }, [operation])

  return (
    <OptionItem
      title={operation.title}
      subtitle={subtitle}
      chip={chip}
      data-testid={dataTestId}
      props={props}
    />
  )
})
