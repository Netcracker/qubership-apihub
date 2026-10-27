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
import { Box, DialogContent, DialogTitle, Divider, IconButton, Link, Popover, styled, Typography } from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { ButtonWithHint } from '../../../components/Buttons/ButtonWithHint'
import type { TestableProps } from '../../../components/Testable'
import { useExtensionVersions } from '../api/useExtensionVersions'
import type { ExtensionVersionState, VersionedExtensionName } from '../api/useExtensionVersions'
import { useSystemInfo } from '../api/useSystemInfo'
import { isNotEmpty } from '../../../utils/arrays'
import { InfoContextIcon } from '../../../icons/InfoContextIcon'

type SystemInfoPopupProps = {
  frontendVersionKey: string
  apiProcessorVersion?: string
  // The image that the app ships in: `<branch>.<commit>.<commit time>`. Absent outside an image.
  imageVersion?: string
  migrationInProgress?: boolean
}

const EXTENSION_TITLES: Record<VersionedExtensionName, string> = {
  'api-linter': 'API Linter',
  'agents-backend': 'Agents Backend',
}
const VERSION_PENDING_TEXT = '...'
const VERSION_NO_DATA_TEXT = 'no data'

const CONTENT_MIN_WIDTH = 236
const CONTENT_MAX_WIDTH = 480
// The popover keeps a 16px margin on each side and the content 24px of padding on each: 80px. A narrow window shrinks
// the content by that much.
const CONTENT_MAX_WIDTH_IN_WINDOW = `min(${CONTENT_MAX_WIDTH}px, calc(100vw - 80px))`

function getExtensionVersionText(state: ExtensionVersionState): string {
  switch (state.status) {
    case 'success':
      return state.version
    case 'error':
      return VERSION_NO_DATA_TEXT
    case 'pending':
      return VERSION_PENDING_TEXT
  }
}

export const SystemInfoPopup: FC<SystemInfoPopupProps> = memo(({
  frontendVersionKey,
  apiProcessorVersion,
  imageVersion,
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
        <SystemInfoContent data-testid="SystemInfoContent">
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

            {extensionVersions.map(state => (
              <VersionRow
                key={state.name}
                title={EXTENSION_TITLES[state.name]}
                version={getExtensionVersionText(state)}
                data-testid={`SystemInfoExtensionVersion-${state.name}`}
              />
            ))}

            <VersionRow
              title="Frontend"
              version={frontendVersionKey}
              imageVersion={imageVersion}
              data-testid="SystemInfoFrontendVersion"
            />

            <VersionRow
              title="API Processor"
              version={apiProcessorVersion ?? VERSION_PENDING_TEXT}
              imageVersion={imageVersion}
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
        </SystemInfoContent>
      </Popover>
    </>
  )
})

type VersionRowProps = Readonly<{
  title: string
  version: string
  // The image that the version ships in; the second line of the row.
  imageVersion?: string
}> & TestableProps

const VersionRow: FC<VersionRowProps> = memo(({ title, version, imageVersion, 'data-testid': dataTestId }) => (
  <VersionRowRoot>
    <Typography variant="subtitle2" data-testid={dataTestId}>
      {`${title} v. ${version}`}
    </Typography>
    {imageVersion && (
      <Typography
        component="div"
        variant="caption"
        color="text.secondary"
        data-testid={dataTestId && `${dataTestId}ImageVersion`}
      >
        {imageVersion}
      </Typography>
    )}
  </VersionRowRoot>
))
VersionRow.displayName = 'VersionRow'

// A version line is long (`develop.a1b2c3d.20261026104501`). `overflow-wrap` is inherited, so the root of the row is enough.
// `break-word` keeps the width of the popup that of its longest line, up to the maximum; `anywhere` would shrink it to the
// minimum.
const VersionRowRoot = styled(Box)({
  overflowWrap: 'break-word',
})

const SystemInfoContent = styled(DialogContent)(({ theme }) => ({
  width: 'max-content',
  minWidth: CONTENT_MIN_WIDTH,
  maxWidth: CONTENT_MAX_WIDTH_IN_WINDOW,
  paddingBottom: theme.spacing(2),
}))

interface Link {
  title: string
  url: string
}
