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
import { Box, Typography } from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import type { FC } from 'react'
import { memo } from 'react'
import { Link as RouterLink } from 'react-router-dom'

import type { Package } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { WORKSPACE_KIND } from '@netcracker/qubership-apihub-ui-shared/entities/packages'
import { TextWithOverflowTooltip } from '@netcracker/qubership-apihub-ui-shared/components/TextWithOverflowTooltip'

import { getPackagePath, getWorkspacePath } from '@portal/routes/NavigationProvider'
import {
  GUIDES_CARD_HOVER_SX,
  GUIDES_CARD_SX,
  GUIDES_CARD_TEXT_SX,
  GUIDES_CARD_TITLE_SX,
  GUIDES_COLOURS,
} from '@portal/routes/root/GuidesPage/guides-styles'

export type HomePackageCardProps = Readonly<{
  packageObject: Package
}>

export const HomePackageCard: FC<HomePackageCardProps> = memo<HomePackageCardProps>(({ packageObject }) => {
  const { key, name, description, kind, lastReleaseVersionDetails, parents, favoritesCount, isFavorite } = packageObject
  const workspaceName = parents?.[0]?.name
  // Version keys carry a revision suffix ("2026.1@1"); show the version name only
  const releaseVersion = lastReleaseVersionDetails?.version?.split('@')[0]
  const target = kind === WORKSPACE_KIND ? getWorkspacePath({ workspaceKey: key }) : getPackagePath({ packageKey: key })

  // Same card as the guides (see guides-styles.ts) so the home page reads as one system
  return (
    <Box
      component={RouterLink}
      to={target}
      sx={{ ...GUIDES_CARD_SX, ...GUIDES_CARD_HOVER_SX, p: 3, height: '100%', display: 'block', textDecoration: 'none', color: 'inherit' }}
      data-testid="HomePackageCard"
    >
        <Box display="flex" flexDirection="column" gap={1.5} height="100%" minWidth={0}>
          <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
            <Box
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: GUIDES_COLOURS.primaryLight,
                color: GUIDES_COLOURS.primaryDark,
                fontWeight: 700,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </Box>
            <Box minWidth={0}>
              <TextWithOverflowTooltip tooltipText={name} sx={GUIDES_CARD_TITLE_SX}>
                {name}
              </TextWithOverflowTooltip>
              {workspaceName && (
                <Typography sx={GUIDES_CARD_TEXT_SX} noWrap>{workspaceName}</Typography>
              )}
            </Box>
          </Box>
          {description && (
            <Typography
              sx={{
                ...GUIDES_CARD_TEXT_SX,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {description}
            </Typography>
          )}
          <Box display="flex" alignItems="center" justifyContent="space-between" mt="auto" pt={1}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: GUIDES_COLOURS.primary, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              {kind === WORKSPACE_KIND ? 'Open workspace' : 'Get started'} <ArrowForwardIcon sx={{ fontSize: 16 }}/>
            </Typography>
            <Box display="flex" alignItems="center" gap={1.5}>
              {favoritesCount !== undefined && (
                <Typography
                  sx={{ fontSize: 12, color: GUIDES_COLOURS.textMuted, display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
                  data-testid="HomePackageCardFavorites"
                >
                  {isFavorite
                    ? <StarRoundedIcon sx={{ fontSize: 16, color: 'warning.main' }}/>
                    : <StarOutlineRoundedIcon sx={{ fontSize: 16 }}/>}
                  {favoritesCount}
                </Typography>
              )}
              {releaseVersion && <Typography sx={{ fontSize: 12, color: GUIDES_COLOURS.textMuted }}>{releaseVersion}</Typography>}
            </Box>
          </Box>
        </Box>
    </Box>
  )
})
