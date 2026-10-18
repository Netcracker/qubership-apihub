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
import type { FC } from 'react'
import React, { memo } from 'react'
import { Box, Divider, Skeleton, Typography } from '@mui/material'
import { useOperationDeprecatedItems } from './useOperationDeprecatedItems'
import type {
  OperationListSubComponentProps,
} from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationWithMetaClickableList'
import type { ApiType } from '@netcracker/qubership-apihub-ui-shared/entities/api-types'

// High Order Component //
export const DeprecatedItemsList: FC<OperationListSubComponentProps> = memo<OperationListSubComponentProps>(({ operation }) => {
  const { packageId: packageKey, versionId: versionKey, apiType } = useParams<{
    packageId: string
    versionId: string
    apiType: ApiType
  }>()

  const { operationKey, packageRef } = operation

  const [deprecatedItems, isLoading] = useOperationDeprecatedItems(
    packageRef?.version ?? versionKey!,
    packageRef?.refId ?? packageKey!,
    operationKey,
    apiType!,
  )

  if (isLoading) {
    return (
      <>
        <Box p={2}>
          <Skeleton variant="rectangular" height={16} width="100%"/>
        </Box>
        <Divider orientation="horizontal" variant="fullWidth"/>
      </>
    )
  }

  return (
    <>
      {deprecatedItems.map((item) => (
        <>
          <Box p={2} pl={6}><Typography variant="body2">{item.description}</Typography></Box>
          <Divider orientation="horizontal" variant="fullWidth"/>
        </>
      ))}
    </>
  )
})
