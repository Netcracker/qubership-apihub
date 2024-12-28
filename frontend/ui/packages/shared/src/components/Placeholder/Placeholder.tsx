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

import type { FC, PropsWithChildren, ReactNode } from 'react'
import { memo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import noDataSvg from './no-data.svg'
import nothingFoundSvg from './nothing-found.svg'
import type { SxProps } from '@mui/system/styleFunctionSx'
import type { TestableProps } from '../Testable'

export type PlaceholderProps = PropsWithChildren<{
  invisible: boolean
  area: PlaceholderArea
  message: string | ReactNode
  variant?: PlaceholderVariant
  sx?: SxProps
}> & TestableProps

export const Placeholder: FC<PlaceholderProps> = memo<PlaceholderProps>(({
  invisible,
  variant = DATA_PLACEHOLDER_VARIANT,
  area,
  message,
  children,
  sx,
  testId,
}) => {
  if (invisible) {
    return (
      <>{children}</>
    )
  }

  return (
    <Box height="100%" display="flex" flexDirection="column" justifyContent="center" gap={1} data-testid={testId}>
      {area === CONTENT_PLACEHOLDER_AREA && (
        <Box
          sx={{
            backgroundImage: `url(${variant === DATA_PLACEHOLDER_VARIANT ? noDataSvg : nothingFoundSvg})`,
            backgroundSize: 'cover',
            backgroundRepeat: 'round',
            height: 'inherit',
            maxHeight: '300px',
            ...sx,
          }}
        />
      )}
      <Typography
        component="div"
        variant="h6"
        textAlign="center"
        color="#8F9EB4"
        display="flex"
        justifyContent="center"
      >
        {message}
      </Typography>
    </Box>
  )
})

export const NO_SEARCH_RESULTS = 'No search results'
export const NO_PERMISSION = 'You do not have permission to see this page'

export const SEARCH_PLACEHOLDER_VARIANT = 'search'
export const DATA_PLACEHOLDER_VARIANT = 'data'

type PlaceholderVariant =
  | typeof SEARCH_PLACEHOLDER_VARIANT
  | typeof DATA_PLACEHOLDER_VARIANT

export const NAVIGATION_PLACEHOLDER_AREA = 'navigation'
export const CONTENT_PLACEHOLDER_AREA = 'content'

type PlaceholderArea =
  | typeof NAVIGATION_PLACEHOLDER_AREA
  | typeof CONTENT_PLACEHOLDER_AREA
