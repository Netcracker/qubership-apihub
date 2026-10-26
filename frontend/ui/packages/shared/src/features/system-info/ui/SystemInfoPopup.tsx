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
import { memo, useState } from 'react'
import { Box, DialogContent, DialogTitle, Divider, IconButton, Link, Popover, Typography } from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { ButtonWithHint } from '../../../components/Buttons/ButtonWithHint'
import { useExtensionVersions } from '../api/useExtensionVersions'
import { useSystemInfo } from '../api/useSystemInfo'
import { isNotEmpty } from '../../../utils/arrays'
import { InfoContextIcon } from '../../../icons/InfoContextIcon'

type SystemInfoPopupProps = {
  frontendVersionKey: string
  apiProcessorVersion?: string
  buildRef?: string
  migrationInProgress?: boolean
}

// A version line can be long (`develop.a1b2c3d.20261026104501`); it wraps instead of widening the popup without limit.
const VERSION_TEXT_SX = { overflowWrap: 'anywhere' } as const
const CONTENT_MAX_WIDTH = 480

export const SystemInfoPopup: FC<SystemInfoPopupProps> = memo(({
  frontendVersionKey,
  apiProcessorVersion,
  buildRef,
}) => {
  const [anchor, setAnchor] = useState<HTMLElement>()
  const { backendVersionKey, externalLinks, migrationInProgress } = useSystemInfo()
  const extensionVersions = useExtensionVersions(!!anchor)

  return (
    <>
      <ButtonWithHint
        hint="System Information"
        startIcon={<InfoOutlinedIcon/>}
        aria-label="System Information"
        size="large"
        color="inherit"
        onClick={({ currentTarget }) => setAnchor(currentTarget)}
        data-testid="SystemInfoButton"
      />
      <Popover
        sx={{ m: 0, p: 3 }}
        id={anchor ? 'popover' : undefined}
        elevation={1}
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(undefined)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <DialogTitle>
          System Information
          <IconButton
            sx={{ position: 'absolute', right: 8, top: 8, color: '#353C4E' }}
            onClick={() => setAnchor(undefined)}
          >
            <CloseOutlinedIcon/>
          </IconButton>
        </DialogTitle>
        <DialogContent data-testid="SystemInfoContent" sx={{ minWidth: 236, maxWidth: CONTENT_MAX_WIDTH, pb: 2 }}>
          <Box sx={{
            display: 'grid',
            rowGap: 1,
          }}>
            {migrationInProgress &&
              (<Box alignItems="center" display="flex">
                <Typography  marginRight="4px" variant="subtitle2">
                  Data migration is in progress
                </Typography>
                <InfoContextIcon />
              </Box>)
            }

            <Typography variant="subtitle2" sx={VERSION_TEXT_SX} data-testid="SystemInfoBackendVersion">
              {`Backend v. ${backendVersionKey}`}
            </Typography>

            {extensionVersions.map(({ extensionName, title, version }) => (
              <Typography
                key={extensionName}
                variant="subtitle2"
                sx={VERSION_TEXT_SX}
                data-testid={`SystemInfoExtensionVersion-${extensionName}`}
              >
                {`${title} v. ${version ?? '...'}`}
              </Typography>
            ))}

            <Box>
              <Typography variant="subtitle2" sx={VERSION_TEXT_SX} data-testid="SystemInfoFrontendVersion">
                {`Frontend v. ${frontendVersionKey}`}
              </Typography>
              {buildRef && (
                <Typography variant="caption" color="text.secondary" sx={VERSION_TEXT_SX} data-testid="SystemInfoFrontendBuild">
                  {buildRef}
                </Typography>
              )}
            </Box>

            <Typography variant="subtitle2" sx={VERSION_TEXT_SX} data-testid="SystemInfoApiProcessorVersion">
              {`API Processor v. ${apiProcessorVersion}`}
            </Typography>

            {isNotEmpty(externalLinks) && <>
              <Divider sx={{ mx: 0 }} orientation="horizontal"/>
              {externalLinks.map((link, index) => (
                <Link
                  key={index}
                  variant="subtitle2"
                  href={link.url}
                >
                  {link.title}
                </Link>
              ))}
            </>}
          </Box>
        </DialogContent>
      </Popover>
    </>
  )
})

interface Link {
  title: string
  url: string
}
