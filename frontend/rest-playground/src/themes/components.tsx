import type { Components } from '@mui/material/styles/components'

import { COLOR_TEXT_DEFAULT, COLOR_TEXT_SECONDARY } from './colors'
import { PAPER_SHADOW_DEFAULT } from './palette'

export function createComponents(): Components {
  return {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        disableRipple: true,
        size: 'small',
      },
      styleOverrides: {
        root: {
          paddingLeft: 24,
          paddingRight: 24,
          borderRadius: 6,
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
          },
        },
        outlined: {
          color: COLOR_TEXT_DEFAULT,
          borderColor: '#D5DCE3',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
            color: COLOR_TEXT_DEFAULT,
            borderColor: '#D5DCE3',
            backgroundColor: '#F9F9F9',
          },
        },
        text: {
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: 'transparent',
            boxShadow: 'none',
          },
        },
        sizeSmall: {
          height: 32,
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiCssBaseline: {
      styleOverrides: `${ScrollbarBaseline}`,
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: '#F2F3F5',
          border: '1px solid transparent',
          '&.Mui-focused': {
            border: '1px solid #0068FF',
          },
          '&.Mui-error': {
            border: '2px solid #FF5260',
          },
          '&.Mui-disabled:before': {
            borderBottomStyle: 'none',
          },
          ':before': {
            border: 'none',
          },
          ':after': {
            border: 'none',
          },
          ':hover:not(.Mui-disabled):before': {
            border: 'none',
          },
          ':hover:not(.Mui-disabled):not(.Mui-error):not(.Mui-focused)': {
            border: '1px solid #8F9EB4',
          },
        },
      },
    },
    MuiIconButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
        sizeSmall: {
          padding: 2,
        },
        sizeMedium: {
          padding: 6,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: 13,
          fontWeight: 400,
          color: COLOR_TEXT_DEFAULT,
          minHeight: 32,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: 13,
        },
      },
    },
    MuiList: {
      defaultProps: {
      },
      styleOverrides: {
        root: {
          overflow: 'auto',
          height: '100%',
        },
      },
    },
    MuiListItemButton: {
      defaultProps: {
        disableRipple: true,
        alignItems: 'flex-start',
      },
      styleOverrides: {
        root: {
          height: 48,
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 16,
          paddingRight: 16,
          margin: 0,
          flexDirection: 'column',
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        root: {
          margin: 0,
          width: '100%',
        },
        primary: {
          fontSize: 13,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        secondary: {
          fontSize: 12,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: COLOR_TEXT_SECONDARY,
        },
      },
    },
    MuiMenu: {
      defaultProps: {
        elevation: 0,
      },
    },
    MuiMenuItem: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          fontSize: 13,
          fontWeight: 400,
          color: 'black',
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
    },
    MuiPopover: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        paper: {
          marginTop: 4,
          borderRadius: 6,
          boxShadow: PAPER_SHADOW_DEFAULT,
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          marginRight: 0,
          '& .MuiFormControlLabel-label': {
            fontSize: 13,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        margin: 'dense',
        size: 'small',
        variant: 'filled',
      },
    },
    MuiPopper: {
      defaultProps: {
        modifiers: [{
          name: 'preventOverflow',
          options: { padding: 16 },
        }],
      },
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
        slotProps: {
          popper: {
            modifiers: [{
              name: 'preventOverflow',
              options: {
                padding: 16,
                altAxis: true, // allows overlapping with the reference (origin) element in case when flipping is not enough
              },
            }],
          },
        },
      },
      styleOverrides: {
        tooltip: {
          backgroundColor: 'white',
          color: 'black',
          boxShadow: '0 6px 20px rgba(0,0,0,.15),0 0 2px rgba(0,0,0,.2)',
          fontSize: 13,
          fontWeight: 400,
        },
        arrow: {
          color: 'white',
          '&:before': {
            boxShadow: '0 6px 20px rgba(0,0,0,.15),0 0 2px rgba(0,0,0,.2)',
          },
        },
      },
    },
  }
}

const ScrollbarBaseline = /* language=CSS */ `
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    ::-webkit-scrollbar-track {
        border-radius: 90px;
    }

    ::-webkit-scrollbar-thumb {
        background: rgba(53, 60, 78, 0.4);
        border-radius: 90px;
    }
`
