import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import type { Theme } from '@mui/material/styles'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import { theme as sharedTheme } from '@netcracker/qubership-apihub-ui-shared/themes/theme'
import type { FC } from 'react'

const ChevronDownIcon: FC<SvgIconProps> = props => <KeyboardArrowDownOutlinedIcon {...props} sx={{ fontSize: 20 }} />

const { MuiAutocomplete, MuiSelect } = sharedTheme.components ?? {}

/**
 * The shared theme, in which every autocomplete and select of the Agents app opens with a chevron, as in the design.
 * The components are spread rather than merged with `createTheme`, which would deep-clone the icon element.
 */
export const theme: Theme = {
  ...sharedTheme,
  components: {
    ...sharedTheme.components,
    MuiAutocomplete: {
      ...MuiAutocomplete,
      defaultProps: { ...MuiAutocomplete?.defaultProps, popupIcon: <ChevronDownIcon /> },
      styleOverrides: {
        ...MuiAutocomplete?.styleOverrides,
        // MUI centers the end adornment for a 28px button, and the button of the chevron is 24px high
        endAdornment: { top: '50%', transform: 'translateY(-50%)' },
      },
    },
    MuiSelect: {
      ...MuiSelect,
      defaultProps: { ...MuiSelect?.defaultProps, IconComponent: ChevronDownIcon },
    },
  },
}
