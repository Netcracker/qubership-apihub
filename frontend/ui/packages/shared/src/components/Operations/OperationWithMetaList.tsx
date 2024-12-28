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
import type { Path } from '@remix-run/router'
import Box from '@mui/material/Box'
import { Divider } from '@mui/material'
import { OperationTitleWithMeta } from './OperationTitleWithMeta'
import type { OperationData, OperationsData } from '../../entities/operations'

export type OperationWithMetaListProps = {
  operations: OperationsData
  onClick?: () => void
  prepareLinkFn: (operation: OperationData) => Partial<Path>
  nestedList?: boolean
  openLinkInNewTab?: boolean
}

// First Order Component //
export const OperationWithMetaList: FC<OperationWithMetaListProps> = memo<OperationWithMetaListProps>((props) => {
  const { operations, prepareLinkFn, onClick, nestedList = false, openLinkInNewTab } = props

  return (
    <Box>
      {operations?.map(operation => {
        const link = prepareLinkFn(operation)

        return (
          <Box key={operation.operationKey} data-testid="OperationListItem">
            <Box pl={nestedList ? 3 : 0}>
              <OperationTitleWithMeta
                operation={operation}
                link={link}
                onLinkClick={onClick}
                badgeText={operation.deprecated ? 'Deprecated' : undefined}
                openLinkInNewTab={openLinkInNewTab}
              />
            </Box>
            <Divider orientation="horizontal" variant="fullWidth" sx={{ pt: 1 }}/>
          </Box>
        )
      })}
    </Box>
  )
})
