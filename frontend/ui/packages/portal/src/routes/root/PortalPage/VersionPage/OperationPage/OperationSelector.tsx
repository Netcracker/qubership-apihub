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
import * as React from 'react'
import { memo, useCallback, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import type { Path } from '@remix-run/router'
import type { OperationData } from '@netcracker/qubership-apihub-ui-shared/entities/operations'
import { MenuButtonItems } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { LoadingIndicator } from '@netcracker/qubership-apihub-ui-shared/components/LoadingIndicator'
import { NAVIGATION_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { isNotEmpty } from '@netcracker/qubership-apihub-ui-shared/utils/arrays'
import { OperationWithMetaList } from '@netcracker/qubership-apihub-ui-shared/components/Operations/OperationWithMetaList'
import { TaggedOperationWithMetaList } from '@netcracker/qubership-apihub-ui-shared/components/TaggedOperationWithMetaList'

// First Order Component //
export type OperationSelectorProps = {
  recentOperations: ReadonlyArray<OperationData>
  isRecentOperationsLoading?: boolean
  relatedOperations: Record<string, OperationData[]>
  isRelatedOperationsLoading?: boolean
  prepareLinkFn: (operation: OperationData) => Partial<Path>
}

export const OperationSelector: FC<OperationSelectorProps> = memo<OperationSelectorProps>((props) => {
  const {
    recentOperations = [],
    isRecentOperationsLoading,
    relatedOperations,
    isRelatedOperationsLoading,
    prepareLinkFn,
  } = props
  const [anchor, setAnchor] = useState<HTMLElement>()
  const onClose = useCallback(() => setAnchor(undefined), [])

  return (
    <Box display="flex" alignItems="center" gap={2} overflow="hidden" data-testid="OperationSelector">
      <Button
        sx={{ minWidth: 4, height: 20, p: 0, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
        variant="text"
        onClick={({ currentTarget }) => setAnchor(currentTarget)}
        endIcon={<KeyboardArrowDownOutlinedIcon/>}
      >
        <MenuButtonItems
          anchorEl={anchor}
          open={!!anchor}
          onClick={event => event.stopPropagation()}
          onClose={onClose}
        >
          <Box
            p={2}
            width="370px"
            maxHeight="480px"
            overflow="scroll"
          >
            <Box data-testid="RecentOperationsSection">
              <Typography variant="subtitle2" fontSize={13} mb={1}>Recent Operations</Typography>
              {isRecentOperationsLoading
                ? <LoadingIndicator/>
                : <Placeholder
                  invisible={isNotEmpty(recentOperations)}
                  area={NAVIGATION_PLACEHOLDER_AREA}
                  message="No operations"
                >
                  <OperationWithMetaList
                    operations={recentOperations}
                    prepareLinkFn={prepareLinkFn}
                    onClick={onClose}
                  />
                </Placeholder>}
            </Box>

            <Box mt={2} data-testid="RelatedOperationsSection">
              <Typography variant="subtitle2" fontSize={13} mb={1}>Related Operations</Typography>
              <TaggedOperationWithMetaList
                operations={relatedOperations}
                onClick={onClose}
                prepareLinkFn={prepareLinkFn}
                isLoading={isRelatedOperationsLoading}
              />
            </Box>
          </Box>
        </MenuButtonItems>
      </Button>
    </Box>
  )
})
