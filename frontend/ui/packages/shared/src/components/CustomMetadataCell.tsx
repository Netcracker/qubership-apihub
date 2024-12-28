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
import * as React from 'react'
import { memo, useMemo, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { CustomTagsTree, isPrimitive } from './CustomTagsTree'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { OverflowTooltip } from './OverflowTooltip'
import type { JSONValue } from '../entities/operations'
import type { Pixel } from '../utils/types'
import { ButtonWithHint } from './Buttons/ButtonWithHint'

const MAX_LINES_COUNT = 2
const ICON_SIZE: Pixel = 16

export type CustomMetadataCellProps = {
  metaData: { [key: string]: JSONValue }
  textFilter?: string
}

export const CustomMetadataCell: FC<CustomMetadataCellProps> = memo<CustomMetadataCellProps>(({
  metaData,
  textFilter,
}) => {
  const sortedMetaData = useMemo(() => {
    const entries = Object.entries(metaData)
    if (!textFilter) {
      return entries
    }
    return entries.sort(([key1, value1], [key2, value2]) => {
      const firstLine = `${key1}: ${value1}`
      const secondLine = `${key2}: ${value2}`
      return Number(secondLine.includes(textFilter)) - Number(firstLine.includes(textFilter))
    })
  }, [metaData, textFilter])

  const tree: JSONValue = useMemo(() => {
    return Object.fromEntries(sortedMetaData)
  }, [sortedMetaData])

  const metaValues = useMemo(() => {
    return sortedMetaData.map(
      ([key, value]) => ({
        key: key,
        value: value,
      }),
    )
  }, [sortedMetaData])

  const visibleLines = useMemo(() => metaValues.slice(0, MAX_LINES_COUNT), [metaValues])
  const hasHiddenObject = useMemo(() => visibleLines.some(line => typeof line.value === 'object'), [visibleLines])
  const hasMoreItems = Object.entries(metaValues || []).length > MAX_LINES_COUNT
  const [open, setOpen] = useState(false)

  const handleHintClose = (): void => setOpen(false)
  const handleHintOpen = (): void => setOpen(true)

  const checkTextOverflow = (currentTarget: EventTarget & HTMLDivElement): boolean => {
    const lineElements = Array.from(currentTarget.querySelectorAll('.tagLine').values())
    return lineElements.some(line => line.scrollWidth > line.clientWidth)
  }

  const shouldShowIcon = hasMoreItems || hasHiddenObject

  const cellContent = (
    <Box display="flex" flexDirection="row">
      <Box width="fit-content" maxWidth={`calc(100% - ${ICON_SIZE}px)`} sx={{ textWrap: 'nowrap' }}>
        <Box overflow="hidden">
          {visibleLines?.map(({ key, value }) => {
            if (!isPrimitive(value)) {
              return (
                <Box key={key} overflow="hidden" textOverflow="ellipsis">
                  <Typography display="inline" minWidth="fit-content" variant="subtitle1">{key}: </Typography>
                  <Typography display="inline" variant="body2">...</Typography>
                </Box>
              )
            }
            return (
              <Box className="tagLine" key={key} overflow="hidden" textOverflow="ellipsis">
                <Typography display="inline" minWidth="fit-content" variant="subtitle1">{key}: </Typography>
                <Typography display="inline" variant="body2">{`${value}`}</Typography>
              </Box>
            )
          })}
        </Box>
      </Box>
      {shouldShowIcon && <Box alignSelf="end" height="23px" display="flex" alignItems="center">
        <ButtonWithHint
          area-label="info"
          hint={
            <Box overflow="scroll" maxHeight="50vh">
              <CustomTagsTree tree={tree}/>
            </Box>
          }
          size="small"
          sx={{ visibility: 'hidden', height: '20px' }}
          className="hoverable"
          startIcon={
            <InfoOutlinedIcon
              className="hoverable"
              sx={{
                color: '#626D82',
                fontSize: `${ICON_SIZE}px`,
                cursor: 'pointer',
                visibility: open ? 'visible' : 'hidden',
              }}
            />
          }
          disableHint={false}
          disabled={false}
          handleClose={handleHintClose}
          handleOpen={handleHintOpen}
          tooltipMaxWidth={350}
        />
      </Box>}
    </Box>
  )

  return (
    <Box alignSelf="end" paddingBottom="10px">
      {
        shouldShowIcon ? cellContent : (
          <OverflowTooltip
            checkOverflow={checkTextOverflow}
            title={
              <Box overflow="scroll" maxHeight="50vh">
                <CustomTagsTree tree={tree}/>
              </Box>
            }
            PopperProps={{
              sx: { '.MuiTooltip-tooltip': { maxWidth: 350 } },
            }}
          >
            {cellContent}
          </OverflowTooltip>
        )
      }
    </Box>
  )
})
