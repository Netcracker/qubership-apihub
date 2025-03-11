import type { To } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useActiveTabContentContext, useSetActiveTabContentContext } from './ProfilePage'
import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material'
import type { ProfilePageRoute } from '../../../routes'
import { PERSONAL_ACCESS_TOKENS_PAGE } from '../../../routes'
import { getProfilePath } from '@apihub/routes/NavigationProvider'

export const ProfileNavigation: FC = memo(() => {
  const activeTab = useActiveTabContentContext()
  const setActiveTab = useSetActiveTabContentContext()
  const navigate = useNavigate()
  const navigateAndSelect = useCallback((pathToNavigate: To): void => {
    navigate(pathToNavigate)
  }, [navigate])

  return (
    <Box display="flex" height="100%" width="100%" flexDirection="column" overflow="hidden">
      <Box
        display="flex"
        gap={2}
        marginX={2}
        paddingY={2}
        alignItems="center"
        justifyContent="space-between"
        width="100%"
      >
        <Typography variant="h3" noWrap>
          Profile Settings
        </Typography>
      </Box>
      <List>
        {PROFILE_SIDEBAR_ITEMS.map(({ value, url, label, description }) => (
          <ListItemButton
            key={value}
            selected={activeTab === value}
            sx={{ justifyContent: 'center' }}
            onClick={() => {
              setActiveTab(value)
              navigateAndSelect(url)
            }}
          >
            <Box>
              <ListItemText primary={label} />
              <ListItemText
                primary={description}
                primaryTypographyProps={{ color: '#626D82' }}
              />
            </Box>
          </ListItemButton>
        ))}
      </List>
    </Box>
  )
})

export type ProfileNavItemProps = Readonly<{
  label: string
  description: string
  value: ProfilePageRoute
  url: To
}>

const PROFILE_SIDEBAR_ITEMS: ProfileNavItemProps[] = [
  {
    label: 'Personal Access Tokens',
    description: 'Manage access tokens',
    value: PERSONAL_ACCESS_TOKENS_PAGE,
    url: getProfilePath({ tab: PERSONAL_ACCESS_TOKENS_PAGE }),
  },
]
