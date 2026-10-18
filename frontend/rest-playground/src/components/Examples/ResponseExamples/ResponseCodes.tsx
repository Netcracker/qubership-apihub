import * as React from 'react'
import { FC, memo, useEffect, useMemo, useState } from 'react'
import { IHttpOperationResponse } from '@stoplight/types'
import { Chip, createTheme, ThemeProvider } from '@mui/material'
import { sortBy, uniqBy } from 'lodash'

export type ResponseCodesProps = {
  responses: IHttpOperationResponse[];
  statusCode: string | undefined;
  onStatusCodeChange?: (statusCode: string | undefined) => void;
};

export const ResponseCodes: FC<ResponseCodesProps> = memo<ResponseCodesProps>(
  ({ responses, statusCode, onStatusCodeChange }) => {
    const responsesData = useMemo(
      () =>
        sortBy(
          uniqBy(responses, r => r.code),
          r => r.code,
        ),
      [],
    )

    const [selectedCode, setSelectedCode] = useState(statusCode)
    useEffect(() => {
      onStatusCodeChange?.(selectedCode)
    }, [selectedCode])

    return (
      <ThemeProvider theme={theme}>
        {responsesData.map(({ code }) => (
          <Chip
            label={code}
            clickable
            color={selectedCode === code ? codeToColor(code) : 'default'}
            style={chipStyles}
            key={code}
            onClick={() => {
              setSelectedCode(code)
            }}
          />
        ))}
      </ThemeProvider>
    )
  },
)

const codeToColor = (code: string) => {
  const firstChar = code.charAt(0)
  switch (firstChar) {
    case '2':
      return 'success'
    case '3':
      return 'primary'
    case '4':
      return 'warning'
    case '5':
      return 'error'
    default:
      return 'default'
  }
}

const theme = createTheme({
  components: {
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 3,
        },
        label: {
          fontSize: 12,
          alignContent: 'center',
        },
        colorSuccess: {
          backgroundColor: '#00BB5B',
        },
        colorWarning: {
          backgroundColor: '#FFB02E',
        },
        colorError: {
          backgroundColor: '#FF5260',
        },
        colorPrimary: {
          backgroundColor: '#7B61FF',
        },
      },
    },
  },
})

const chipStyles = {
  height: '24px',
  marginRight: '8px',
  marginBottom: '8px',
}
