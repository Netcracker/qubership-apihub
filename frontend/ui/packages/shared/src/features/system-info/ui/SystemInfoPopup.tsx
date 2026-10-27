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

// A version line is long (`develop.a1b2c3d.20261026104501`). The popup takes the width of its longest line, up to the
// maximum, and a line wraps only beyond it. `overflowWrap: anywhere` would shrink that width to the minimum instead.
const VERSION_TEXT_SX = { overflowWrap: 'break-word' } as const
const CONTENT_MIN_WIDTH = 236
const CONTENT_MAX_WIDTH = 480
// The popover keeps a 16px margin on each side and the content 24px of padding; a narrow window shrinks the content.
const CONTENT_MAX_WIDTH_IN_WINDOW = `min(${CONTENT_MAX_WIDTH}px, calc(100vw - 96px))`

type VersionRowProps = {
  title: string
  version: string
  // The image the version ships in: `<branch>.<commit>.<commit time>`.
  caption?: string
  'data-testid': string
}

const VersionRow: FC<VersionRowProps> = memo(({ title, version, caption, 'data-testid': dataTestId }) => (
  <Box>
    <Typography variant="subtitle2" sx={VERSION_TEXT_SX} data-testid={dataTestId}>
      {`${title} v. ${version}`}
    </Typography>
    {caption && (
      <Typography
        component="div"
        variant="caption"
        color="text.secondary"
        sx={VERSION_TEXT_SX}
        data-testid={`${dataTestId}Build`}
      >
        {caption}
      </Typography>
    )}
  </Box>
))

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
        <DialogContent data-testid="SystemInfoContent" sx={{ width: 'max-content', minWidth: CONTENT_MIN_WIDTH, maxWidth: CONTENT_MAX_WIDTH_IN_WINDOW, pb: 2 }}>
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

            <VersionRow title="Backend" version={backendVersionKey} data-testid="SystemInfoBackendVersion"/>

            {extensionVersions.map(({ extensionName, title, version }) => (
              <VersionRow
                key={extensionName}
                title={title}
                version={version ?? '...'}
                data-testid={`SystemInfoExtensionVersion-${extensionName}`}
              />
            ))}

            <VersionRow
              title="Frontend"
              version={frontendVersionKey}
              caption={buildRef}
              data-testid="SystemInfoFrontendVersion"
            />

            <VersionRow
              title="API Processor"
              version={apiProcessorVersion ?? '...'}
              caption={buildRef}
              data-testid="SystemInfoApiProcessorVersion"
            />

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
