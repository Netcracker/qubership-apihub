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
import { Box, MenuItem, Tooltip } from '@mui/material'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined'
import { useParams } from 'react-router-dom'
import { CompareRevisionsDialog } from './CompareRevisionsDialog'
import { CompareVersionsDialog } from './CompareVersionsDialog/CompareVersionsDialog'
import { CompareOperationPathsDialog } from './CompareOperationPathsDialog'
import { CompareRestGroupsDialog } from './CompareRestGroupsDialog'
import { useOperationGroupComparison } from './useOperationGroupComparison'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { useEventBus } from '@apihub/routes/EventBusProvider'

type ComparisonSelectorButtonProps = {
  showCompareGroups: boolean
}

export const ComparisonSelectorButton: FC<ComparisonSelectorButtonProps> = memo(({ showCompareGroups }) => {
  const {
    showCompareVersionsDialog,
    showCompareOperationsDialog,
    showCompareRevisionsDialog,
    showCompareRestGroupsDialog,
  } = useEventBus()
  const { operationId } = useParams()

  const [disableCompareGroup, onGetOperationGroup] = useOperationGroupComparison()

  return (
    <>
      <MenuButton
        title="Compare"
        variant="outlined"
        startIcon={<CompareArrowsOutlinedIcon/>}
        onClick={onGetOperationGroup}
        endIcon={<KeyboardArrowDownOutlinedIcon/>}
        sx={{
          '&.MuiButton-root': {
            width: '145px',
            '& .MuiButton-startIcon': {
              marginRight: '7px',
            },
            '& .MuiButton-endIcon': {
              marginLeft: '7px',
            },
          },
        }}
        data-testid="CompareMenuButton"
      >
        <MenuItem onClick={showCompareVersionsDialog} data-testid="VersionsMenuItem">
          Versions
        </MenuItem>
        {operationId && (
          <MenuItem onClick={showCompareOperationsDialog} data-testid="OperationsMenuItem">
            Operations
          </MenuItem>
        )}
        <MenuItem onClick={showCompareRevisionsDialog} data-testid="RevisionsMenuItem">
          Revisions
        </MenuItem>
        {!operationId && showCompareGroups && (disableCompareGroup ? (
            <Tooltip
              placement="right"
              title="Comparison is not available since there are less than 2 groups"
            >
              <Box width="100%">
                <MenuItem disabled={disableCompareGroup} data-testid="RestGroupsMenuItem">
                  REST Groups
                </MenuItem>
              </Box>
            </Tooltip>
          ) : (
            <MenuItem onClick={showCompareRestGroupsDialog} data-testid="RestGroupsMenuItem">
              REST Groups
            </MenuItem>
          )
        )}
      </MenuButton>

      <CompareVersionsDialog/>
      <CompareRevisionsDialog/>
      <CompareOperationPathsDialog/>
      <CompareRestGroupsDialog/>
    </>
  )
})
