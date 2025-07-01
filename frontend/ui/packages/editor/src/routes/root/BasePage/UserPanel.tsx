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

import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Avatar, IconButton, MenuItem } from '@mui/material'
import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { UserAvatar } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserAvatar'
import { useLogoutUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import { useUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useUser'
import { redirectToLogin } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'
import type { FC } from 'react'
import { memo } from 'react'

export const UserPanel: FC = memo(() => {
  const [user] = useUser()
  const [logout] = useLogoutUser()

  return (
    <>
      <IconButton data-testid="AppUserAvatar" size="large" color="inherit">
        {
          user?.avatarUrl
            ? <Avatar src={user.avatarUrl} />
            : <UserAvatar size="medium" name={user?.name ?? ''} />
        }
      </IconButton>

      <MenuButton
        sx={{ p: 0 }}
        variant="text"
        color="inherit"
        title={user?.name ?? ''}
        icon={<KeyboardArrowDownOutlinedIcon />}
        data-testid="UserMenuButton"
      >
        <MenuItem
          data-testid="LogoutMenuItem"
          onClick={() => {
            logout()
            redirectToLogin()
          }}
        >
          Logout
        </MenuItem>
      </MenuButton>
    </>
  )
})
