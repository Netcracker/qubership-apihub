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

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { SxProps } from '@mui/system/styleFunctionSx'
import type { FC, PropsWithChildren, ReactNode } from 'react'
import { memo, useMemo } from 'react'
import type { TestableProps } from '../Testable'
import everythingOkSvg from './everything-ok.svg'
import noDataSvg from './no-data.svg'
import nothingFoundSvg from './nothing-found.svg'
import robotPlaceholderSvg from './robot.svg'

export type PlaceholderProps = PropsWithChildren<{
  invisible: boolean
  area: PlaceholderArea
  message: string | ReactNode
  variant?: PlaceholderVariant
  sx?: SxProps
}> & TestableProps

export const Placeholder: FC<PlaceholderProps> = memo<PlaceholderProps>(({
  invisible,
  variant = DATA_RAINY_DAY_PLACEHOLDER_VARIANT,
  area,
  message,
  children,
  sx,
  'data-testid': dataTestId,
}) => {
  const backgroundImage = useMemo(() => {
    if (invisible) {
      return undefined
    }
    let url = ''
    switch (variant) {
      case DATA_SUNNY_DAY_PLACEHOLDER_VARIANT:
        url = everythingOkSvg
        break
      case DATA_RAINY_DAY_PLACEHOLDER_VARIANT:
        url = noDataSvg
        break
      case SEARCH_RAINY_DAY_PLACEHOLDER_VARIANT:
        url = nothingFoundSvg
        break
      case ROBOT_PLACEHOLDER_VARIANT:
        url = robotPlaceholderSvg
        break
    }
    return `url('${url}')`
  }, [invisible, variant])

  if (invisible) {
    return (
      <>{children}</>
    )
  }

  return (
    <Box height="100%" display="flex" flexDirection="column" justifyContent="center" gap={1} data-testid={dataTestId}>
      {area === CONTENT_PLACEHOLDER_AREA && (
        <Box
          sx={{
            backgroundImage: backgroundImage,
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

export const SEARCH_RAINY_DAY_PLACEHOLDER_VARIANT = 'search'
export const DATA_SUNNY_DAY_PLACEHOLDER_VARIANT = 'data-sunny-day'
export const DATA_RAINY_DAY_PLACEHOLDER_VARIANT = 'data-rainy-day'
export const ROBOT_PLACEHOLDER_VARIANT = 'robot'

type PlaceholderVariant =
  | typeof SEARCH_RAINY_DAY_PLACEHOLDER_VARIANT
  | typeof DATA_SUNNY_DAY_PLACEHOLDER_VARIANT
  | typeof DATA_RAINY_DAY_PLACEHOLDER_VARIANT
  | typeof ROBOT_PLACEHOLDER_VARIANT

export const NAVIGATION_PLACEHOLDER_AREA = 'navigation'
export const CONTENT_PLACEHOLDER_AREA = 'content'

type PlaceholderArea =
  | typeof NAVIGATION_PLACEHOLDER_AREA
  | typeof CONTENT_PLACEHOLDER_AREA
