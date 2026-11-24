import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import type { SxProps } from '@mui/system'
import type { Theme } from '@mui/material'

export type BodyCardProps = {
  header?: ReactNode
  subheader?: ReactNode
  action?: ReactNode
  body: ReactNode
  overrideHeaderSx?: SxProps<Theme>
  overrideBodySx?: SxProps<Theme>
}

const DEFAULT_HEADER_SX: SxProps<Theme> = {
  pt: 3,
  pb: 0,
  px: 4,
}
const DEFAULT_BODY_SX: SxProps<Theme> = {
  px: 4,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

export const BodyCard: FC<BodyCardProps> = memo<BodyCardProps>((props) => {
  const {
    header,
    subheader,
    action,
    body,
    overrideHeaderSx = {},
    overrideBodySx = {},
  } = props
  return (
    <Card
      sx={{
        display: 'grid',
        gridTemplateRows: header ? 'max-content' : 'auto max-content',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {header && (
        <CardHeader
          sx={{
            ...DEFAULT_HEADER_SX,
            ...overrideHeaderSx,
          }}
          title={header}
          titleTypographyProps={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', 'data-testid': 'CardHeaderTitle' }}
          subheader={subheader}
          subheaderTypographyProps={{
            fontSize: 13,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
          action={action}
          data-testid="CardHeader"
        />
      )}

      <CardContent
        sx={{
          ...DEFAULT_BODY_SX,
          pt: header ? 2 : 0,
          ...overrideBodySx,
        }}
        data-testid="CardContent"
      >
        {body}
      </CardContent>
    </Card>
  )
})
