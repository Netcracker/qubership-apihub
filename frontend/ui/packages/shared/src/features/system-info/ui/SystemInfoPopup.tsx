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
import { useSystemInfo } from '../api/useSystemInfo'
import { useLocalFrontendVersion } from '../../../hooks/common/useLocalFrontendVersion'
import { isNotEmpty } from '../../../utils/arrays'
import * as packageJson from '../../../../package.json'

export const SystemInfoPopup: FC = memo(() => {
  const [anchor, setAnchor] = useState<HTMLElement>()
  const { backendVersionKey, externalLinks } = useSystemInfo()
  const frontendVersionKey = useLocalFrontendVersion(packageJson)

  return (
    <>
      <IconButton
        data-testid="SystemInfoButton"
        size="large"
        color="inherit"
        onClick={({ currentTarget }) => setAnchor(currentTarget)}
      >
        <InfoOutlinedIcon />
      </IconButton>
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
            <CloseOutlinedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent data-testid="SystemInfoContent" sx={{ minWidth: 236, pb: 2 }}>
          <Box sx={{
            display: 'grid',
            rowGap: 1,
          }}>
            <Typography variant="subtitle2">
              {`Backend v. ${backendVersionKey}`}
            </Typography>

            <Typography variant="subtitle2">
              {`Frontend v. ${frontendVersionKey}`}
            </Typography>

            {isNotEmpty(externalLinks) && <>
              <Divider sx={{ mx: 0 }} orientation="horizontal" />
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
