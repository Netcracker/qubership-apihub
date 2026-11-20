import { createTheme } from '@mui/material/styles'
import { createTypography } from './typography'
import { createPalette } from './palette'
import { createComponents } from './components'

export const theme = createTheme({
  typography: createTypography(),
  palette: createPalette(),
  components: createComponents(),
})
