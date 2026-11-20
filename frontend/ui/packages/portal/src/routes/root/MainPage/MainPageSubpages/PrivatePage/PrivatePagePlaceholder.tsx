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
          data-testid="PrivateWorkspacePlaceholder"
        />
      }
    />
  )
})
