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
  pt: 2,
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
          ...overrideBodySx,
        }}
      >
        {body}
      </CardContent>
    </Card>
  )
})
