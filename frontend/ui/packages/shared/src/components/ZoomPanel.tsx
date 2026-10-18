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
import { memo, useCallback, useMemo } from 'react'
import Box from '@mui/material/Box'
import { Button, MenuItem } from '@mui/material'
import { MinusIcon } from '../icons/MinusIcon'
import { MultiButton } from './Buttons/MultiButton'
import { DEFAULT_TEXT_COLOR, DISABLE_COLOR } from '../themes/colors'
import { AddIcon } from '../icons/AddIcon'
import { getLastItem } from '../utils/arrays'

export type ZoomPanelProps = {
  value: number
  specificOptions: number[]
  onChange?: (value: number) => void
  onFitToScreen?: () => void
}

export const ZoomPanel: FC<ZoomPanelProps> = memo<ZoomPanelProps>(({
  value,
  specificOptions,
  onChange,
  onFitToScreen,
}) => {
  const manualChangeZoom = useCallback((valuesStep: number): void => {
    let index = valuesStep > 0 ? 0 : MANUAL_ZOOM_VALUES.length - 1
    const keepSearching = valuesStep > 0
      ? (zoom: number) => zoom <= value && zoom < ZOOM_MAX_VALUE
      : (zoom: number) => zoom >= value && zoom > ZOOM_MIN_VALUE

    while (keepSearching(MANUAL_ZOOM_VALUES[index])) {
      index += valuesStep
    }

    onChange?.(MANUAL_ZOOM_VALUES[index])
  }, [value, onChange])

  const minusDisabled = useMemo(() => value <= ZOOM_MIN_VALUE, [value])
  const plusDisabled = useMemo(() => value >= ZOOM_MAX_VALUE, [value])

  return (
    <Box display="flex" flexDirection="row">
      <Button
        sx={sideButtonStyle}
        variant="outlined"
        startIcon={<MinusIcon color={minusDisabled ? DISABLE_COLOR : DEFAULT_TEXT_COLOR}/>}
        onClick={() => manualChangeZoom(-1)}
        disabled={minusDisabled}
      />
      <MultiButton
        buttonGroupProps={{ variant: 'outlined', sx: { marginRight: 1, marginLeft: 1 } }}
        primary={<Button sx={selectButtonStyle}>{zoomRenderer(value)}</Button>}
        secondary={
          <Box>
            {specificOptions.map(option => (
              <MenuItem onClick={() => onChange?.(option)}>
                {zoomRenderer(option)}
              </MenuItem>
            ))}
            <MenuItem onClick={() => onFitToScreen?.()}>
              Fit to Screen
            </MenuItem>
          </Box>
        }
      />
      <Button
        sx={sideButtonStyle}
        variant="outlined"
        startIcon={<AddIcon color={plusDisabled ? DISABLE_COLOR : DEFAULT_TEXT_COLOR}/>}
        onClick={() => manualChangeZoom(1)}
        disabled={plusDisabled}
      />
    </Box>
  )
})

const MANUAL_ZOOM_VALUES = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.85, 1.0, 1.2, 1.45, 1.75, 2.1, 2.5]

const ZOOM_MAX_VALUE = getLastItem(MANUAL_ZOOM_VALUES)!
// eslint-disable-next-line prefer-destructuring
const ZOOM_MIN_VALUE = MANUAL_ZOOM_VALUES[0]

function zoomRenderer(value: number): string {
  return `${Math.round(value * 100)}%`
}

const sideButtonStyle = {
  p: 0,
  minWidth: 32,
  'span': { m: 0 },
  backgroundColor: 'white',
}

const selectButtonStyle = {
  backgroundColor: 'white',
}
