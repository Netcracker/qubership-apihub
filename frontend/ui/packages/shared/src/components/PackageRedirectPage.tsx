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
import { CONTENT_PLACEHOLDER_AREA, Placeholder } from './Placeholder'
import { Link, Typography } from '@mui/material'
import Box from '@mui/material/Box'
import { DEFAULT_PAPER_SHADOW } from '../themes/palette'
import { DEFAULT_PAGE_LAYOUT_GAP } from '../utils/page-layouts'
import type { Key } from '../entities/keys'

export type PackageRedirectPageProps = {
  newId: Key
  href?: string
}

//todo unification with Error page and minimize border of text box
export const PackageRedirectPage: FC<PackageRedirectPageProps> = memo<PackageRedirectPageProps>(({
  newId,
  href,
}) => (
  <Box
    sx={{
      pt: DEFAULT_PAGE_LAYOUT_GAP,
      px: DEFAULT_PAGE_LAYOUT_GAP,
      height: '100%',
    }}
  >
    <Box sx={{
      height: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: '10px 10px 0 0',
      boxShadow: DEFAULT_PAPER_SHADOW,
    }}>
      <Placeholder
        invisible={false}
        area={CONTENT_PLACEHOLDER_AREA}
        message={
          <Box flex={1} display="flex" flexDirection="column" gap={1} alignItems="center" maxWidth="500px">
            <Typography component="div" variant="h5" fontSize={20} textAlign="center">{REDIRECT_TITLE}</Typography>
            <Box>
              <Typography display="inline" variant="h6" color="#626D82">
                The package you were trying to retrieve was moved
                to another group and therefore its ID was changed to {newId}. The page you were looking for may
                be <Link href={href}> here</Link>.
              </Typography>
            </Box>
          </Box>
        }
      />
    </Box>
  </Box>
))

const REDIRECT_TITLE = 'Package ID Was Changed'
