import { styled } from '@mui/material/styles'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import type { SvgIconProps } from '@mui/material'
import type { TestableProps } from '../components/Testable'

type InfoContextIconProps = SvgIconProps & TestableProps

export const InfoContextIcon = styled(InfoOutlinedIcon)<InfoContextIconProps>``

InfoContextIcon.defaultProps = {
  fontSize: 'small',
  color: 'muted',
  'data-testid': 'InfoIcon',
}

InfoContextIcon.displayName = 'InfoContextIcon' 
