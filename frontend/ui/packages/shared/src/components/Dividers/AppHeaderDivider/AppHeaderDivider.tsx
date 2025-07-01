import { Divider, type DividerProps } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { TestableProps } from '../../Testable'

type AppHeaderDividerProps = DividerProps & TestableProps

export const AppHeaderDivider = styled(Divider)<AppHeaderDividerProps>`
    height: 30px;
    align-self: center;
    border-color: white;
`

AppHeaderDivider.defaultProps = {
  flexItem: true,
  'data-testid': 'AppHeaderDivider',
}

AppHeaderDivider.displayName = 'AppHeaderDivider'
