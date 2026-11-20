import type { FC } from 'react'
import { memo, useCallback } from 'react'
import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material'
import { useActiveTabContentContext, useSetActiveTabContentContext } from './PackageSettingsPage'
import type { To } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useSidebarItems } from './useSidebarItems'
import type { PackageSettingsTabProps } from './package-settings'
import { PACKAGE_KINDS_NAMES_MAP } from './package-settings'

export const PackageSettingsNavigation: FC<PackageSettingsTabProps> = memo<PackageSettingsTabProps>(({
  packageObject,
}) => {
  const sidebarItems = useSidebarItems(packageObject)
  const activeTab = useActiveTabContentContext()
  const setActiveTab = useSetActiveTabContentContext()
  const navigate = useNavigate()
  const navigateAndSelect = useCallback((pathToNavigate: To): void => {
    navigate(pathToNavigate)
  }, [navigate])
  const title = `${PACKAGE_KINDS_NAMES_MAP[packageObject.kind]} Settings`

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
          {title}
        </Typography>
      </Box>
      <List>
        {sidebarItems.map(({ value, url, label, description }) => (
          <ListItemButton
            key={value}
            selected={activeTab === value}
            sx={{ justifyContent: 'center' }}
            onClick={() => {
              setActiveTab(value)
              navigateAndSelect(url)
            }}
            data-testid={`TabButton-${value}`}
          >
            <Box>
              <ListItemText primary={label}/>
              <ListItemText primary={description} primaryTypographyProps={{ color: '#626D82' }}/>
            </Box>
          </ListItemButton>
        ))}
      </List>
    </Box>
  )
})
