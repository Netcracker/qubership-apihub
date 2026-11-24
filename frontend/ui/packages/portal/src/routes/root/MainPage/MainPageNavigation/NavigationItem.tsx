import { Box, ListItemButton, ListItemIcon, ListItemText } from '@mui/material'
import type { Path } from '@remix-run/router'
import type { FC } from 'react'
import React, { memo } from 'react'
import { NavLink } from 'react-router-dom'
import type { TestableProps } from '@netcracker/qubership-apihub-ui-shared/components/Testable'

export type NavigationItemProps = Readonly<{
  to: Partial<Path>
  label: string
  icon?: React.ReactNode
  selected?: boolean
  packageKey?: string
}> & TestableProps

export const NavigationItem: FC<NavigationItemProps> = memo<NavigationItemProps>(props => {
  const { to, icon, label, packageKey, 'data-testid': dataTestId, selected } = props

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      height: '32px',
      mb: packageKey ? '8px' : '16px',
      pr: '6px',
    }}>
      <ListItemButton
        component={NavLink}
        to={to}
        selected={selected}
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          pl: selected ? '14px' : '16px',
          borderLeft: selected ? '2px solid #0068FF' : '',
          backgroundColor: 'transparent!important',
          color: selected ? '#0068FF' : '',
          '&:hover': { color: '#0068FF', pl: '14px', borderLeft: '2px solid #0068FF' },
          '&:hover .MuiListItemIcon-root': { color: '#0068FF' },
        }}
        data-testid={dataTestId}
      >
        <ListItemIcon
          sx={{
            mr: '8px',
            mt: 0,
            width: '24px',
            minWidth: '24px',
            color: selected ? '#0068FF' : '',
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText sx={{ fontWeight: 500 }} primary={label}/>
      </ListItemButton>
    </Box>
  )
})
