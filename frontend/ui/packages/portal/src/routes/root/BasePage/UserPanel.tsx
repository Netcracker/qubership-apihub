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
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Avatar, IconButton, MenuItem } from '@mui/material'
import { useAuthorization } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import { UserAvatar } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserAvatar'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'

export const UserPanel: FC = memo(() => {
  const [authorization, , removeAuthorization] = useAuthorization()

  return (
    <>
      <IconButton data-testid="AppUserAvatar" size="large" color="inherit">
        {
          authorization?.user.avatarUrl
            ? <Avatar src={authorization.user.avatarUrl}/>
            : <UserAvatar size="medium" name={authorization?.user.name ?? ''}/>
        }
      </IconButton>

      <MenuButton
        sx={{ p: 0 }}
        variant="text"
        color="inherit"
        title={authorization?.user.name ?? ''}
        icon={<KeyboardArrowDownOutlinedIcon/>}
        data-testid="UserMenuButton"
      >
        <MenuItem
          data-testid="LogoutMenuItem"
          onClick={() => {
            removeAuthorization()
            location.replace(`${location.origin}/login?redirectUri=${encodeURIComponent(location.href)}`)
          }}
        >
          Logout
        </MenuItem>
      </MenuButton>
    </>
  )
})
