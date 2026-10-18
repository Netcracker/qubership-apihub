import { Divider, type DividerProps } from '@mui/material'
import { styled } from '@mui/material/styles'

import type { TestableProps } from '../../Testable'

type AppHeaderDividerProps = DividerProps & TestableProps

export const AppHeaderDivider = styled(Divider)<AppHeaderDividerProps>(({ theme }) => ({
  height: 30,
  alignSelf: 'center',
  borderColor: theme.palette.common.white,
  margin: theme.spacing(0, 1),
}))

AppHeaderDivider.defaultProps = {
  flexItem: true,
  'data-testid': 'AppHeaderDivider',
}

AppHeaderDivider.displayName = 'AppHeaderDivider'
