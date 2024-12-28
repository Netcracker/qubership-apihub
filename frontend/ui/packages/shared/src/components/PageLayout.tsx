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

import type { FC, ReactNode } from 'react'
import { memo } from 'react'
import Box from '@mui/material/Box'
import { Resizable } from 're-resizable'
import type { TestableProps } from './Testable'
import {
  DEFAULT_PAGE_LAYOUT_GAP,
  NAVIGATION_DEFAULT_WIDTH,
  NAVIGATION_MAX_WIDTH,
  NAVIGATION_MIN_WIDTH,
} from '../utils/page-layouts'
import { DEFAULT_PAPER_SHADOW } from '../themes/palette'

export type PageLayoutSX = {
  toolbar?: Record<string, string>
  navigation?: Record<string, string>
  body?: Record<string, string>
}

export type PageLayoutProps = {
  toolbar?: ReactNode
  navigation?: ReactNode
  sx?: PageLayoutSX
  menu?: ReactNode
  nestedPage?: boolean
  body: ReactNode
  withShadow?: boolean
} & TestableProps

/**
 * @deprecated Use layout from PageLayouts instead
 */
export const PageLayout: FC<PageLayoutProps> = memo<PageLayoutProps>(({
  toolbar,
  navigation,
  sx,
  body,
  menu,
  nestedPage,
  withShadow = true,
  testId,
}) => {
  return (
    <Box
      sx={{
        px: !nestedPage ? DEFAULT_PAGE_LAYOUT_GAP : 0,
        height: '100%',
        display: 'grid',
        gridTemplateRows: 'max-content 1fr',
        gridTemplateColumns: 'auto 1fr',
        gridTemplateAreas: `${createGridAreas(navigation, menu)}`,
      }}
      data-testid={testId}
    >
      {toolbar && (
        <Box sx={{
          gridArea: 'toolbar',
          overflow: 'hidden',
          mb: !nestedPage ? DEFAULT_PAGE_LAYOUT_GAP : 0,
          backgroundColor: '#FFFFFF',
          borderRadius: `${!nestedPage && '0 0 10px 10px'}`,
          boxShadow: withShadow ? DEFAULT_PAPER_SHADOW : undefined,
        }}>
          {toolbar}
        </Box>
      )}
      {navigation && (
        <Resizable
          style={{
            marginTop: (toolbar || nestedPage) ? 0 : 2,
            gridArea: 'navigation',
            overflow: 'hidden',
            position: 'relative',
            borderRight: '1px solid #D5DCE3',
            borderRadius: `${!nestedPage && '10px 0 0 0'}`,
            backgroundColor: '#FFFFFF',
            boxShadow: withShadow ? DEFAULT_PAPER_SHADOW : undefined,
            clipPath: 'inset(-10px 0px -10px -10px)',
            paddingBottom: sx?.navigation?.paddingBottom ?? '24px',
          }}
          handleStyles={{ right: { cursor: 'ew-resize' } }}
          defaultSize={{ width: NAVIGATION_DEFAULT_WIDTH, height: '100%' }}
          maxWidth={NAVIGATION_MAX_WIDTH}
          minWidth={NAVIGATION_MIN_WIDTH}
          enable={{
            top: false,
            right: true,
            bottom: false,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
        >
          {navigation}
        </Resizable>
      )}
      {menu && (
        <Box
          marginTop={(toolbar || nestedPage) ? 0 : 2}
          sx={{
            gridArea: 'menu',
            boxShadow: 'rgb(4 10 21 / 4%) 0px 1px 1px, rgb(4 12 29 / 9%) 0px 3px 14px, rgb(7 13 26 / 27%) 0px 0px 1px',
            borderRight: '1px solid #D5DCE3',
            borderRadius: '10px 0 0 0',
          }}
        >
          {menu}
        </Box>
      )}
      <Box sx={{
        mt: (toolbar || nestedPage) ? 0 : 2,
        gridArea: 'body',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        borderRadius: `${(navigation || menu || nestedPage) ? '0' : '10px'} 10px 0 0`,
        boxShadow: withShadow ? 'rgb(4 10 21 / 4%) 0px 1px 1px, rgb(4 12 29 / 9%) 0px 3px 14px, rgb(7 13 26 / 27%) 0px 0px 1px' : undefined,
        paddingBottom: nestedPage ? 3 : 0,
      }}>
        {body}
      </Box>
    </Box>
  )
})

function createGridAreas(navigation: ReactNode, menu: ReactNode): string {
  let tempGridArea = 'body'

  if (toolbar && navigation) {
    tempGridArea = 'navigation'
  }
  if (toolbar && menu) {
    tempGridArea = 'menu'
  }

  return `
      'toolbar toolbar'
      '${tempGridArea} body'
      `
}
