import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material'
import { type FC, memo, useCallback } from 'react'
import { type To, useNavigate } from 'react-router-dom'

import type { LibrarySettingsTabProps } from './librarySettings'
import { useActiveTabContentContext, useSetActiveTabContentContext } from './LibrarySettingsPage'
import { useSidebarItems } from './useSidebarItems'

export const LibrarySettingsNavigation: FC<LibrarySettingsTabProps> = memo<LibrarySettingsTabProps>(({ library }) => {
  const sidebarItems = useSidebarItems(library)
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
        <Typography variant="h3" noWrap>Library Settings</Typography>
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
              <ListItemText primary={label} />
              <ListItemText primary={description} primaryTypographyProps={{ color: 'text.secondary' }} />
            </Box>
          </ListItemButton>
        ))}
      </List>
    </Box>
  )
})
LibrarySettingsNavigation.displayName = 'LibrarySettingsNavigation'
