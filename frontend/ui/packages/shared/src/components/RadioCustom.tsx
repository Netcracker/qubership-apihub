import Radio from '@mui/material/Radio'
import type { RadioProps } from '@mui/material/Radio'
import { alpha, styled } from '@mui/material/styles'

const RADIO_SIZE = 16

const BpIcon = styled('span')(({ theme }) => {
  const outlineColor = alpha(theme.palette.text.primary, 0.2)
  const outlineColorBottom = alpha(theme.palette.text.primary, 0.1)

  return {
    borderRadius: '50%',
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    boxShadow: `inset 0 0 0 1px ${outlineColor}, inset 0 -1px 0 ${outlineColorBottom}`,
    backgroundColor: theme.palette.common.white,
    '.Mui-focusVisible &': {
      outline: `2px auto ${alpha(theme.palette.primary.main, 0.6)}`,
      outlineOffset: 2,
    },
    'input:hover ~ &': {
      backgroundColor: theme.palette.action.hover,
    },
    'input:disabled ~ &': {
      backgroundColor: theme.palette.action.hover,
      boxShadow: 'none',
    },
  }
})

const BpCheckedIcon = styled(BpIcon)(({ theme }) => {
  const primaryMain = theme.palette.primary.main

  return {
    backgroundColor: primaryMain,
    backgroundImage: 'none',
    boxShadow: 'none',
    '&::before': {
      display: 'block',
      width: RADIO_SIZE,
      height: RADIO_SIZE,
      backgroundImage:
        `radial-gradient(${theme.palette.common.white}, ${theme.palette.common.white} 28%, transparent 32%)`,
      content: '""',
    },
    'input:hover ~ &': {
      backgroundColor: primaryMain,
      backgroundImage: 'none',
      boxShadow: 'none',
    },
    'input:disabled ~ &': {
      backgroundColor: alpha(primaryMain, theme.palette.action.disabledOpacity ?? 0.38),
      backgroundImage: 'none',
    },
  }
})

export type RadioCustomProps = Omit<RadioProps, 'checkedIcon' | 'icon'>

export function RadioCustom(props: RadioCustomProps): JSX.Element {
  return (
    <Radio
      disableRipple
      disableFocusRipple
      checkedIcon={<BpCheckedIcon />}
      icon={<BpIcon />}
      {...props}
    />
  )
}
