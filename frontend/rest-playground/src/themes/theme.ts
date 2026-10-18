import { createTheme } from '@mui/material/styles'

import { createComponents } from './components'
import { createPalette } from './palette'
import { createTypography } from './typography'

export const theme = createTheme({
  typography: createTypography(),
  palette: createPalette(),
  components: createComponents(),
})
