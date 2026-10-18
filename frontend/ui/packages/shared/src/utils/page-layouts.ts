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

import type { ReactNode } from 'react'

export function createGridAreas(areas: Areas): string {
  const { toolbar, sidebar, tabs } = areas
  let tempGridArea = BODY_GRID_AREA

  if (toolbar && sidebar) {
    tempGridArea = SIDEBAR_GRID_AREA
  }
  if (tabs) {
    tempGridArea = TABS_GRID_AREA
  }

  return `
      '${TOOLBAR_GRID_AREA} ${TOOLBAR_GRID_AREA}'
      '${tempGridArea} ${BODY_GRID_AREA}'
      `
}

export const NAVIGATION_MIN_WIDTH = 215
export const NAVIGATION_DEFAULT_WIDTH = 260
export const NAVIGATION_MAX_WIDTH = 685
export const DEFAULT_PAGE_LAYOUT_GAP = '16px'

type Areas = Partial<{
  sidebar: ReactNode | undefined
  tabs: ReactNode | undefined
  toolbar: ReactNode | undefined
}>

export const TOOLBAR_GRID_AREA = 'toolbar'
export const BODY_GRID_AREA = 'body'
export const TABS_GRID_AREA = 'tabs'
export const SIDEBAR_GRID_AREA = 'sidebar'
