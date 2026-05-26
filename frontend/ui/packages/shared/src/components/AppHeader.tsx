import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import type { TypographyProps } from '@mui/material/Typography'
import type { FC, ReactNode } from 'react'
import { memo } from 'react'

import { BUTTON_PRESSED_COLOR } from '../themes/colors'
import { APP_HEADER_HEIGHT } from '../themes/components'
import type { TestableProps } from './Testable'

type AppHeaderLink = {
  name: string
  pathname: string
  active?: boolean
} & TestableProps

export type AppHeaderProps = Partial<{
  logo: ReactNode
  title: ReactNode
  links: AppHeaderLink[]
  action: ReactNode
}>

export const AppHeader: FC<AppHeaderProps> = memo<AppHeaderProps>(({ logo, title, links, action }) => {
  return (
    <Box data-testid="AppHeader" flexGrow={1}>
      <AppBar position="static" sx={{ height: APP_HEADER_HEIGHT }}>
        <AppHeaderToolbar>
          {(logo || title) && (
            <Brand>
              {logo && (
                <LogoContent>
                  {logo}
                </LogoContent>
              )}
              {title && (
                <TitleContent variant="h2">
                  {title}
                </TitleContent>
              )}
            </Brand>
          )}
          {links && links.map(({ name, pathname, active, 'data-testid': dataTestId }) => (
            <Box
              key={pathname}
              sx={active ? { ...APP_HEADER_LINK_STYLES, ...APP_HEADER_LINK_STYLES_SELECTED } : APP_HEADER_LINK_STYLES}
              onClick={event => {
                const target = event.ctrlKey || event.metaKey ? '_blank' : '_self'
                window.open(`${pathname}`, target)
              }}
              onAuxClick={event => {
                if (event.button === 1) {
                  return window.open(`${pathname}`, '_blank')
                }
              }}
              data-testid={dataTestId}
            >
              <Typography variant="h2">
                {name}
              </Typography>
            </Box>
          ))}
          {action && (
            <Box alignItems="center" display="flex" ml="auto">
              {action}
            </Box>
          )}
        </AppHeaderToolbar>
      </AppBar>
    </Box>
  )
})

const APP_HEADER_LINK_STYLES = {
  backgroundColor: '#0068FF',
  cursor: 'pointer',
  padding: '13px 16px',
  '&:hover': {
    backgroundColor: '#0052EE',
  },
}

const APP_HEADER_LINK_STYLES_SELECTED = {
  backgroundColor: '#0052EE',
  boxShadow: 'inset 0px -3px 0px #002B80',
}

// TODO: 14.05.16 temporary solution for the header. Not doing a global
// button rebalancing yet, because we need to verify compatibility across
// the whole project.
const AppHeaderToolbar = styled(Toolbar)(({ theme }) => ({
  '& .MuiIconButton-root, & .AppHeaderIconButton': {
    width: APP_HEADER_HEIGHT,
    height: APP_HEADER_HEIGHT,
  },
  '& .MuiButton-root, & .MuiIconButton-root, & .AppHeaderIconButton': {
    borderRadius: 0,
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
    '&:active': {
      backgroundColor: BUTTON_PRESSED_COLOR,
    },
  },
}))

const Brand = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flex: `0 1 ${theme.spacing(19.5)}`,
  minWidth: 'fit-content',
  paddingRight: theme.spacing(2),
}))

const TitleContent = styled(Typography)<TypographyProps<'div'>>({
  margin: 0,
})

const LogoContent = styled(Box)(({ theme }) => ({
  fontSize: theme.typography.h2.fontSize,
  '& img': {
    height: '1em',
  },
}))
