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
import type { MenuItemProps } from '@mui/material'
import { Box, MenuItem, Typography } from '@mui/material'
import type { TestableProps } from '../Testable'

type SectionName = string
type ItemProps = MenuItemProps & TestableProps

export type MenuButtonContentWithSectionsProps = {
  content: Record<SectionName, ItemProps[]>
}
export const MenuButtonContentWithSections: FC<MenuButtonContentWithSectionsProps> = memo<MenuButtonContentWithSectionsProps>(({ content }) => {
  return (
    <>
      {Object.entries(content).map(([sectionName, items]) => (
        <Box component="div" key={sectionName}>
          <Typography sx={EXPORT_MENU_DELIMITER_STYLES}>
            {sectionName}
          </Typography>
          {items.map(({ onClick, title, testId }, index) => (
            <MenuItem
              key={`${sectionName}-${index}`}
              onClick={onClick}
              data-testid={testId}
            >
              {title}
            </MenuItem>
          ))}
          <Box/>
        </Box>
      ))}
    </>
  )
})

const EXPORT_MENU_DELIMITER_STYLES = {
  color: '#626D82',
  fontSize: '13px',
  fontWeight: 400,
  lineHeight: '20px',
  padding: '8px',
}

