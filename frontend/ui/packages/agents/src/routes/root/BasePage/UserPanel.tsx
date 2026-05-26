import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined'
import { Avatar, Box, MenuItem, styled } from '@mui/material'
import { type FC, memo, useCallback, useState } from 'react'

import { MenuButton } from '@netcracker/qubership-apihub-ui-shared/components/Buttons/MenuButton'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'
import { UserAvatar } from '@netcracker/qubership-apihub-ui-shared/components/Users/UserAvatar'
import { useLogoutUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization'
import { useUser } from '@netcracker/qubership-apihub-ui-shared/hooks/authorization/useUser'
import { redirectToLogin } from '@netcracker/qubership-apihub-ui-shared/utils/redirects'

export const UserPanel: FC = memo(() => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user] = useUser()
  const [logout] = useLogoutUser()

  const handleMenuOpen = useCallback(() => {
    setIsMenuOpen(true)
  }, [])

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false)
  }, [])

  const handleLogoutClick = useCallback(() => {
    logout()
    redirectToLogin()
  }, [logout])

  return (
    <>
      <UserPanelAvatar data-testid="AppUserAvatar">
        {user?.avatarUrl
          ? <AvatarImage src={user.avatarUrl} alt={user?.name ?? ''} />
          : <UserAvatar size="medium" name={user?.name ?? ''} />}
      </UserPanelAvatar>
      <UserName
        tooltipText={user?.name ?? ''}
        variant="button"
      >
        {user?.name ?? ''}
      </UserName>

      <UserMenuButton
        icon={isMenuOpen ? <KeyboardArrowUpOutlinedIcon /> : <KeyboardArrowDownOutlinedIcon />}
        onClick={handleMenuOpen}
        onClose={handleMenuClose}
        onItemClick={handleMenuClose}
        className="AppHeaderIconButton"
        aria-label="Open user menu"
        size="large"
        data-testid="UserMenuButton"
      >
        <MenuItem
          data-testid="LogoutMenuItem"
          onClick={handleLogoutClick}
        >
          Logout
        </MenuItem>
      </UserMenuButton>
    </>
  )
})

const UserPanelAvatar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  margin: theme.spacing(0, 1),
}))

const AvatarImage = styled(Avatar)(({ theme }) => ({
  width: theme.spacing(4),
  height: theme.spacing(4),
}))

const UserName = styled(TextWithOverflowTooltip)(({ theme }) => ({
  color: theme.palette.common.white,
  margin: theme.spacing(0, 1),
}))

const UserMenuButton = styled(MenuButton)(({ theme }) => ({
  color: theme.palette.common.white,
}))
