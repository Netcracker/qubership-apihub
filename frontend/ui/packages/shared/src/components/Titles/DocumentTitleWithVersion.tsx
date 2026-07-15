import { Box, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import type { FC } from 'react'
import { memo } from 'react'

import { OverflowTooltip } from '../OverflowTooltip'

export type DocumentTitleWithVersionProps = {
  title: string
  version?: string
}

export const DocumentTitleWithVersion: FC<DocumentTitleWithVersionProps> = memo<DocumentTitleWithVersionProps>(({
  title,
  version,
}) => (
  <TextSection>
    <TitleTooltip title={title}>
      <TitleText variant="inherit">
        {title}
      </TitleText>
    </TitleTooltip>
    {version && (
      <TitleSuffix>
        <VersionText variant="body2">
          {version}
        </VersionText>
      </TitleSuffix>
    )}
  </TextSection>
))

DocumentTitleWithVersion.displayName = 'DocumentTitleWithVersion'

const TextSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flex: '0 1 auto',
  minWidth: 0,
  overflow: 'hidden',
}))

const TitleSuffix = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  flexShrink: 0,
}))

const TitleTooltip = styled(OverflowTooltip)({
  display: 'block',
  minWidth: 0,
  flex: '0 1 auto',
})

const TitleText = styled(Typography)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const VersionText = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  whiteSpace: 'nowrap',
  flexShrink: 0,
  paddingLeft: theme.spacing(0.5),
  paddingRight: theme.spacing(0.5),
}))
