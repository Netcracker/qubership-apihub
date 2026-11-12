import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import { Avatar, IconButton, MenuItem } from '@mui/material'
import type { FC } from 'react'
import { memo } from 'react'
import { MenuButton } from '../../../components/Buttons/MenuButton'
import { UserAvatar } from '../../../components/Users/UserAvatar'
import { useLogoutUser } from '../../../hooks/authorization'
import { useUser } from '../../../hooks/authorization/useUser'
import { redirectToLogin } from '../../../utils/redirects'

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
