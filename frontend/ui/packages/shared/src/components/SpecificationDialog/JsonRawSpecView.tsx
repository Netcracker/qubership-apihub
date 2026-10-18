import type { SxProps } from '@mui/material'
import { type FC, memo, useMemo } from 'react'

import { JSON_FILE_EXTENSION } from '../../utils/files'
import { JSON_SCHEMA_SPEC_TYPE } from '../../utils/specs'
import { toFormattedJsonString } from '../../utils/strings'
import { RawSpecView } from './RawSpecView'

export type JsonRawSpecViewProps = Readonly<{
  data?: Record<string, unknown>
  sx?: SxProps
}>

export const JsonRawSpecView: FC<JsonRawSpecViewProps> = memo<JsonRawSpecViewProps>(({ data, sx }) => {
  const value = useMemo(
    () => (data ? toFormattedJsonString(data) : ''),
    [data],
  )

  return (
    <RawSpecView
      value={value}
      extension={JSON_FILE_EXTENSION}
      type={JSON_SCHEMA_SPEC_TYPE}
      sx={sx}
    />
  )
})

JsonRawSpecView.displayName = 'JsonRawSpecView'
