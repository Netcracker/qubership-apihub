import { useMemo } from 'react'
import { Box } from '@mui/material'
import type { Header, RowData } from '@tanstack/react-table'
import type { ReactElement } from 'react'

export function ColumnDelimiter<TData extends RowData>(props: {
  header: Header<TData, unknown>
  resizable?: boolean
}): ReactElement {
  const { header, resizable } = props
  const resizeHandler = useMemo(() => header.getResizeHandler(), [header])
  return (
    <Box
      sx={{ ...delimiterStyles, cursor: resizable ? 'col-resize' : 'default' }}
      onMouseDown={resizeHandler}
      onTouchStart={resizeHandler}
    />
  )
}

const delimiterStyles = {
  background: 'transparent',
  height: '100%',
  position: 'absolute',
  right: '0',
  top: '0',
  touchAction: 'none',
  userSelect: 'none',
  width: '8px',
}
