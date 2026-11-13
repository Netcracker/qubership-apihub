import type { FC } from 'react'
import { memo } from 'react'
import { Box, Tooltip, Typography } from '@mui/material'
import type { Key } from '../../entities/keys'
import { REVISION_DELIMITER } from '../../entities/versions'
import { NON_LATEST_REVISION_TEXT_COLOR } from '../../themes/colors'

export type VersionTitleProps = {
  version: Key | undefined
  revision: Key | undefined
  latestRevision: boolean | undefined
  showTooltip?: boolean
  subtitleVariant?: boolean
}

// First Order Component //
export const VersionTitle: FC<VersionTitleProps> = memo<VersionTitleProps>(({
  version,
  revision,
  latestRevision,
  showTooltip = true,
  subtitleVariant = false,
}) => {
  const versionKeyElement =
    <Typography
      variant={subtitleVariant ? 'subtitle3' : 'inherit'}
      data-testid="VersionTitle"
    >
      {version}
    </Typography>

  if (latestRevision) {
    return (
      <>{versionKeyElement}</>
    )
  }

  return (
    <Tooltip
      title={showTooltip ? `You are viewing the old revision ${REVISION_DELIMITER}${revision} of the version` : ''}>
      <Box display="flex">
        {versionKeyElement}
        {revision && (
          <Typography variant="inherit" color={NON_LATEST_REVISION_TEXT_COLOR}>
            {`${REVISION_DELIMITER}${revision}`}
          </Typography>
        )}
      </Box>
    </Tooltip>
  )
})
