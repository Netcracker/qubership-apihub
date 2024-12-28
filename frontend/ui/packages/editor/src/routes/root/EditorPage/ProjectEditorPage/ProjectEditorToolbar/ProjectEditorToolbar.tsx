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
import { memo, useCallback } from 'react'
import { Box, Button, CircularProgress, Divider, Tooltip, Typography } from '@mui/material'
import { useIsBranchReadonly } from '../useHasBranchPermission'
import { useProject } from '../../../useProject'
import { BranchSelector } from './BranchSelector'
import { RedactorsBar } from '../RedactorsBar'
import { useConnectedUsers, useConnecting } from '../BranchEditingWebSocketProvider'
import { CreateBranchDialog } from './CreateBranchDialog/CreateBranchDialog'

import { PublishProjectVersionDialog } from './PublishProjectVersionDialog'
import { useBranchEditingMode } from './useBranchEditingMode'
import { useUpdateBranchEditingMode } from './useUpdateBranchEditingMode'
import { BreadcrumbNavigation } from '../../../../shared/BreadcrumbNavigation'
import { Toolbar } from '@netcracker/qubership-apihub-ui-shared/components/Toolbar'
import { ToolbarTitle } from '@netcracker/qubership-apihub-ui-shared/components/ToolbarTitle'

export const ProjectEditorToolbar: FC<{ isBranchIndexing: boolean }> = memo(({ isBranchIndexing }) => {
  const [project] = useProject()
  const connectedUsers = useConnectedUsers()
  const connecting = useConnecting()
  const isBranchReadonly = useIsBranchReadonly()

  const branchEditingMode = useBranchEditingMode()
  const [updateBranchEditingMode] = useUpdateBranchEditingMode()

  const packageKey = project?.packageKey
  const versionKey = project?.lastVersion

  const redirectToPortal = useCallback(() => {
    const originDomain = `${location.protocol}//${location.host}`
    const packageUrl = `${originDomain}/portal/packages/${packageKey}`

    location.assign(versionKey ? `${packageUrl}/${versionKey}/overview/summary` : packageUrl)
  }, [packageKey, versionKey])

  return (
    <>
      <Toolbar
        breadcrumbs={<BreadcrumbNavigation/>}
        header={
          <>
            <ToolbarTitle value={project?.name}/>
            <Typography variant="subtitle3">
              {
                `${isBranchReadonly ? 'View' : 'Edit'} branch`
              }
            </Typography>
            <BranchSelector/>
            {isBranchIndexing && <>
              <Tooltip title="Branch files are indexing">
                <CircularProgress sx={{ alignSelf: 'center' }} size={10}/>
              </Tooltip>
            </>}
          </>
        }
        action={
          <Box display="flex" gap={1} alignItems="center">
            <Box display="flex" gap={1} alignItems="center">
              {
                connecting
                  ? <CircularProgress sx={{ alignSelf: 'center' }} size={20}/>
                  : <RedactorsBar redactors={connectedUsers}/>
              }
              <Divider/>
              <Tooltip
                title="To start the branch editing make any change after that you can finish the editing manually using this button">
                <Box>
                  <Button
                    disabled={!branchEditingMode}
                    variant="outlined"
                    onClick={() => updateBranchEditingMode(false)}
                  >
                    Finish editing
                  </Button>
                </Box>
              </Tooltip>

              {packageKey ? (
                <Button
                  variant="outlined"
                  onClick={redirectToPortal}
                  data-testid="ViewLinkedPackageButton"
                >
                  View Linked Package
                </Button>
              ) : (
                <Tooltip
                  title="You cannot go to the linked package in the APIHUB Portal because no package is specified for this project">
                  <Box>
                    <Button
                      disabled
                      variant="outlined"
                      data-testid="ViewLinkedPackageButton"
                    >
                      View Linked Package
                    </Button>
                  </Box>
                </Tooltip>
              )}
            </Box>
          </Box>
        }
      />

      <CreateBranchDialog/>
      <PublishProjectVersionDialog/>
    </>
  )
})
