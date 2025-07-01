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

import { Box, Button, Typography } from '@mui/material'
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from '@netcracker/qubership-apihub-ui-shared/components/Placeholder'
import { useUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useUser'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { MainPageCard } from '../../MainPageCard'
import { useCreatePersonalPackage } from './usePrivateWorkspace'

export const PrivatePagePlaceholder: FC = memo(() => {
  const [user] = useUser()
  const userId = user?.key

  const [createPrivatePackage] = useCreatePersonalPackage()

  const onCreatePrivatePackage = useCallback(() => createPrivatePackage(userId!), [createPrivatePackage, userId])

  return (
    <MainPageCard
      hideSearchBar
      hideViewSelector
      content={
        <Placeholder
          invisible={false}
          area={CONTENT_PLACEHOLDER_AREA}
          message={
            <Box display='flex' flexDirection='column' alignItems='center'>
              <Typography component="div" variant="h3" color="#8F9EB4" display={'block'}>
                Create your own workspace that will be available only to you.
              </Typography>
              <Button
                sx={{ mt: 2 }}
                variant='contained'
                children='Create Private Workspace'
                onClick={onCreatePrivatePackage}
                data-testid="CreatePrivateWorkspaceButton"
              />
            </Box>
          }
          testId="PrivateWorkspacePlaceholder"
        />
      }
    />
  )
})
