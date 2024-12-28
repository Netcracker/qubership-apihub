/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react'
import type { Components } from '@mui/material/styles/components'

export const APP_HEADER_HEIGHT = '44px'

export function createComponents(): Components {
  return {
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiAutocomplete: {
      defaultProps: {
        componentsProps: {
          paper: {
            elevation: 8,
          },
        },
      },
      styleOverrides: {
        root: {
          width: '100%',
        },
        paper: {
          borderRadius: 10,
        },
        listbox: {
          fontSize: 13,
          color: 'black',
        },
        noOptions: {
          fontSize: 13,
          color: 'black',
        },
        tag: {
          marginTop: -6,
          marginBottom: 0,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          width: 32,
          height: 32,
        },
      },
    },
    MuiAccordion: {
      defaultProps: {
        disableGutters: true,
        elevation: 0,
      },
      styleOverrides: {
        root: {
          '&:before': {
            display: 'none',
          },
        },
      },
    },
    MuiAccordionSummary: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          minHeight: 28,
          padding: '4px 8px 4px 16px',
        },
        content: {
          margin: 0,
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontSize: 13,
        },
      },
    },
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
          color: '#353C4E',
          borderColor: '#D5DCE3',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
            color: '#353C4E',
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
      variants: [{
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        props: { variant: 'added' },
        style: {
          minWidth: 100,
          color: '#FFFFFF',
          backgroundColor: '#00BB5B',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
            backgroundColor: '#00A356',
          },
        },
      }],
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiButtonGroup: {
      defaultProps: {
        disableElevation: true,
        disableRipple: true,
        size: 'small',
      },
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
          },
        },
        outlined: {
          color: '#353C4E',
          borderColor: '#D5DCE3',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
            color: '#353C4E',
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
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          overflow: 'auto',
          height: '100%',
        },
      },
    },
    MuiCardHeader: {
      defaultProps: {
        titleTypographyProps: {
          variant: 'h5',
        },
        subheaderTypographyProps: {
          variant: 'subtitle2',
        },
      },
      styleOverrides: {
        root: {
          padding: 24,
          overflow: 'hidden',
        },
        content: {
          minHeight: '32px',
          overflow: 'hidden',
        },
        action: {
          alignSelf: 'center',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          height: '100%',
          overflow: 'auto',
          '&:last-child': {
            paddingBottom: 0,
          },
        },
      },
    },
    MuiCheckbox: {
      defaultProps: {
        size: 'small',
        disableRipple: true,
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill="white"/>
            <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" stroke="#B4BFCF"/>
          </svg>
        ),
        checkedIcon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="16" height="16" rx="4" fill="#0068FF"/>
            <path
              fillRule="evenodd" clipRule="evenodd"
              d="M12.1757 4.76285C12.5828 5.13604 12.6104 5.76861 12.2372 6.17572L7.79324 11.0236C7.19873 11.6722 6.17628 11.6722 5.58177 11.0236L3.76285 9.03936C3.38966 8.63224 3.41716 7.99968 3.82428 7.62648C4.2314 7.25329 4.86397 7.28079 5.23716 7.68791L6.68751 9.27011L10.7629 4.82428C11.136 4.41716 11.7686 4.38965 12.1757 4.76285Z"
              fill="white"
            />
          </svg>
        ),
        indeterminateIcon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" fill="white"/>
            <path fillRule="evenodd" clipRule="evenodd"
                  d="M4 8C4 6.89543 4.89543 6 6 6H10C11.1046 6 12 6.89543 12 8C12 9.10457 11.1046 10 10 10H6C4.89543 10 4 9.10457 4 8Z"
                  fill="#0068FF"/>
            <rect x="0.5" y="0.5" width="15" height="15" rx="3.5" stroke="#B4BFCF"/>
          </svg>
        ),
      },
      styleOverrides: {
        root: {
          paddingLeft: 12,
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 3,
        },
        label: {
          fontSize: 13,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: `${ScrollbarBaseline}`,
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: 24,
          justifyContent: 'flex-start',
          '& .MuiButton-root': {
            minWidth: '100px',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          width: 'min-content',
          minWidth: 440,
          paddingBottom: 0,
          lineHeight: 2.5,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiDivider: {
      defaultProps: {
        flexItem: true,
        orientation: 'vertical',
        variant: 'middle',
      },
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
          color: '#353C4E',
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
    MuiLink: {
      defaultProps: {
        underline: 'hover',
      },
    },
    MuiList: {
      defaultProps: {
        disablePadding: true,
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
          borderRadius: 10,
          boxShadow: '0px 1px 1px rgba(4, 10, 21, 0.04), 0px 3px 14px rgba(4, 12, 29, 0.09), 0px 0px 1px rgba(7, 13, 26, 0.27)',
        },
      },
    },
    MuiRadio: {
      defaultProps: {
        size: 'small',
        disableRipple: true,
        disableFocusRipple: true,
        disableTouchRipple: true,
      },
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          background: '#FFFFFF',
          width: 390,
          minHeight: 64,
          boxShadow: '0 1px 1px rgba(4,10,21,.04),0 3px 14px rgba(4,12,29,.09),0 0 1px rgba(7,13,26,.27)',
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
    MuiSkeleton: {
      styleOverrides: {
        rectangular: {
          borderRadius: '6px',
        },
      },
    },
    MuiSwitch: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          width: 44,
          height: 24,
          padding: 0,
          '& .MuiSwitch-switchBase': {
            padding: 0,
            margin: 2,
            transitionDuration: '300ms',
            color: '#fff',
            '&.Mui-disabled + .MuiSwitch-track': {
              opacity: 0.5,
              background: '#EDF1F5',
              border: '1px solid #C1C9D4',
            },
            '&.Mui-checked': {
              transform: 'translateX(20px)',
              color: '#fff',
              '& + .MuiSwitch-track': {
                backgroundColor: '#0068FF',
                opacity: 1,
                border: 0,
              },
              '&.Mui-disabled + .MuiSwitch-track': {
                opacity: 0.5,
              },
            },
            '&.Mui-focusVisible .MuiSwitch-thumb': {
              color: '#003ab8',
              border: '6px solid #fff',
            },
          },
          '& .MuiSwitch-thumb': {
            width: 20,
            height: 20,
          },
          '& .MuiSwitch-track': {
            borderRadius: 24 / 2,
            border: '1px solid #C1C9D4',
            backgroundColor: '#EDF1F5',
            opacity: 1,
            boxShadow: 'inset 0px 2px 2px rgba(0, 0, 0, 0.09)',
          },
        },
      },
    },
    MuiTab: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          minWidth: 0,
          color: 'rgba(0, 0, 0, 0.85)',
          paddingLeft: 0,
          paddingRight: 0,
        },
        labelIcon: {
          minHeight: 48,
        },
      },
    },
    MuiTabPanel: {
      styleOverrides: {
        root: {
          padding: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateRows: '1fr',
          gap: 2,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: 'none',
        },
        flexContainer: {
          gap: 28,
        },
      },
    },
    MuiTable: {
      defaultProps: {
        stickyHeader: true,
        size: 'small',
      },
      styleOverrides: {
        root: {
          tableLayout: 'fixed',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#FFFFFF',
          borderBottom: '2px solid #DEE2E6',
          fontSize: 12,
          fontWeight: 400,
          color: '#626D82',
          paddingLeft: 8,
          paddingRight: 8,
        },
        root: {
          borderColor: '#DEE2E6',
          paddingLeft: 8,
          paddingRight: 8,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          height: '100%',
        },
      },
    },
    MuiTableRow: {
      defaultProps: {
        hover: true,
      },
      styleOverrides: {
        root: {
          '&:hover': {
            '& .MuiTableCell-root': {
              '& .hoverable': {
                visibility: 'visible',
                cursor: 'pointer',
              },
            },
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
    MuiToggleButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          height: 24,
          color: '#353C4E',
          '&.Mui-selected': {
            backgroundColor: '#FFFFFF',
            boxShadow: '0px 1px 1px rgba(4, 10, 21, 0.04), 0px 3px 14px rgba(4, 12, 29, 0.09), 0px 0px 1px rgba(7, 13, 26, 0.27)',
          },
          '&:hover': {
            backgroundColor: 'rgba(46, 58, 82, 0.09)',
          },
          '&.Mui-selected:hover': {
            backgroundColor: '#FFFFFF',
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        grouped: {
          margin: 4,
          border: 0,
          '&:not(:first-of-type)': {
            borderRadius: 6,
          },
          '&:first-of-type': {
            borderRadius: 6,
          },
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          '@media (min-width: 600px)': {
            minHeight: APP_HEADER_HEIGHT,
          },
        },
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
      },
      styleOverrides: {
        tooltip: {
          backgroundColor: '#FFFFFF',
          color: '#000000',
          boxShadow: '0 6px 20px rgba(0,0,0,.15),0 0 2px rgba(0,0,0,.2)',
          fontSize: 13,
          fontWeight: 400,
        },
        arrow: {
          color: '#FFFFFF',
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
