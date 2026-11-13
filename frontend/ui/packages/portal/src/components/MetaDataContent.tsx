import type { FC } from 'react'
import { memo, useMemo } from 'react'
import { Box, Link, Typography } from '@mui/material'
import { isUrl } from '@netcracker/qubership-apihub-ui-shared/utils/urls'

export type MetaDataContentProps = {
  metaData: object | undefined
}
export const MetaDataContent: FC<MetaDataContentProps> = memo<MetaDataContentProps>(({ metaData }) => {
  const metaValues = useMemo(() => {
    if (metaData) {
      return Object.entries(metaData).filter(([, value]) => !!value).map(
        ([key, value]) => ({
          key: key,
          value: value,
        }),
      )
    }
  }, [metaData])

  return (
    <Box>
      {metaValues?.map(({ key, value }) => {
        return (
          <Box key={key} display="flex" gap={1}>
            <Typography variant="subtitle1">{key}:</Typography>
            <Box sx={{ wordBreak: 'break-word' }}>
              {isUrl(value)
                ? <Link href={value} target="_blank">
                  {value}
                </Link>
                : <Typography variant="body2">{value}</Typography>
              }
            </Box>
          </Box>
        )
      })}
    </Box>
  )
})
