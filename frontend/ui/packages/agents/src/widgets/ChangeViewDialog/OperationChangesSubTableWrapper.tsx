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
import { memo } from 'react'
import { useOperationChangelog } from './useOperationChangelog'
import type { SubTableComponentProps } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget'
import { OperationChangesSubTable } from '@netcracker/qubership-apihub-ui-shared/widgets/ChangesViewWidget'

// copy-pasted from portal
export type OperationChangesSubTableWrapper = SubTableComponentProps

export const OperationChangesSubTableWrapper: FC<OperationChangesSubTableWrapper> = memo<OperationChangesSubTableWrapper>((
  {
    value,
    packageKey,
    versionKey,
    apiType,
    packageKind,
  },
) => {
  const { operationKey } = value.original.change
  const [changes, isLoading] = useOperationChangelog({
    versionKey: versionKey!,
    packageKey: packageKey!,
    operationKey: operationKey!,
    apiType: apiType,
  })

  return (
    <OperationChangesSubTable
      changes={changes}
      isLoading={isLoading}
      packageKind={packageKind}
    />
  )
})
