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
import type { FC, PropsWithChildren, ReactNode } from 'react'
import { memo } from 'react'

export type HomeSectionProps = PropsWithChildren<{
  eyebrow: string
  title: string
  subtitle?: string
  action?: ReactNode
  testId?: string
}>

export const HomeSection: FC<HomeSectionProps> = memo<HomeSectionProps>(({
  eyebrow,
  title,
  subtitle,
  action,
  testId,
  children,
}) => {
  return (
    <Box component="section" data-testid={testId}>
      <Box display="flex" alignItems="flex-end" justifyContent="space-between" gap={2} mb={3}>
        <Box>
          <Typography
            variant="overline"
            color="primary"
            sx={{ fontWeight: 600, letterSpacing: '0.08em' }}
          >
            {eyebrow}
          </Typography>
          <Typography variant="h1" component="h2" sx={{ mt: 0.5 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  )
})
