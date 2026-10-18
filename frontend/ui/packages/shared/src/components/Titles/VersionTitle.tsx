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

import type { FC } from 'react'
import { memo } from 'react'
import { Box, Tooltip, Typography } from '@mui/material'
import type { Key } from '../../entities/keys'
import { REVISION_DELIMITER } from '../../entities/versions'

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
        {revision && <Typography variant="inherit" color="#FB8A22">{`${REVISION_DELIMITER}${revision}`}</Typography>}
      </Box>
    </Tooltip>
  )
})

