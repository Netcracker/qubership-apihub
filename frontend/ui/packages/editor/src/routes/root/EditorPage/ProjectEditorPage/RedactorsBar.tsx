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
import { memo, useState } from 'react'
import { Avatar, Box, Button, Typography } from '@mui/material'
import { UserAvatar } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserAvatar'
import { MenuButtonItems } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import type { UserConnectedEventData } from '@apihub/entities/ws-branch-events'

export type RedactorsBarProps = {
  redactors: UserConnectedEventData[]
}

export const RedactorsBar: FC<RedactorsBarProps> = memo<RedactorsBarProps>(({ redactors }) => {
  const redactorsCount = redactors.length
  const [anchor, setAnchor] = useState<HTMLElement>()

  return (
    <>
      <Button
        sx={{
          display: 'flex',
          flexDirection: ' row-reverse',
          alignItems: 'center',
          cursor: 'pointer',
          px: 0,
          minWidth: 16,
        }}
        onClick={({ currentTarget }) => setAnchor(currentTarget)}
      >
        {
          redactorsCount > 3 && (
            <Box sx={{ fontSize: 12, fontWeight: 400, color: '#626D82' }}>
              +{redactorsCount - 3}
            </Box>
          )
        }
        {
          redactors
            .slice(0, 3)
            .map(({ sessionId, user: { avatarUrl, name } }, index) => (
              <UserAvatar
                sx={{
                  border: '2px solid #FFFFFF',
                  boxSizing: 'content-box',
                  marginLeft: index === redactors.length - 1 ? 0 : -1,
                }}
                key={sessionId}
                name={name}
                src={avatarUrl}
                size="small"
              />
            ))
        }

      </Button>
      <MenuButtonItems
        sx={{ maxHeight: 250 }}
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(undefined)}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      >
        {
          redactors.map(({ sessionId, user: { avatarUrl, name } }) => (
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 2, py: 0.5 }}
              key={sessionId}
            >
              <Avatar
                sx={{ width: 16, height: 16 }}
                src={avatarUrl}
              />
              <Typography variant="body2">{name}</Typography>
            </Box>
          ))
        }
      </MenuButtonItems>
    </>
  )
})
