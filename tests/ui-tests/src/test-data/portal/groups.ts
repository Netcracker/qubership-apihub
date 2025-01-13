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

import { ALIAS_PREFIX, GROUP_PREFIX } from '@test-data'
import { Group } from '@test-data/props'
import { P_WS_MAIN_R } from './workspaces'

export const IMM_GR = new Group({
  name: 'Reusable',
  alias: 'IMM_GR',
  parent: P_WS_MAIN_R,
})
export const VAR_GR = new Group({
  name: 'Non-Reusable',
  alias: `${ALIAS_PREFIX}-${process.env.TEST_ID_N}`,
  parent: P_WS_MAIN_R,
}, { testPrefix: true, testId: 'non-reusable' })

export const G_REV_IMM = new Group({
  name: 'Revisions',
  alias: 'GREVIMM',
  parent: IMM_GR,
})
export const G_REV_VAR = new Group({
  name: 'Revisions',
  alias: 'GREVVAR',
  parent: VAR_GR,
})

export const G_PUBLISH_IMM = new Group({
  name: 'Publish',
  alias: 'GPUBIMM',
  parent: IMM_GR,
})
export const G_PUBLISH_VAR = new Group({
  name: 'Publish',
  alias: 'GPUBVAR',
  parent: VAR_GR,
})

export const G_SETTINGS_VAR = new Group({
  name: 'Settings',
  alias: 'GSETVAR',
  parent: VAR_GR,
})
export const P_GR_CRUD = new Group({
  name: 'CRUD',
  alias: 'GCRUD',
  parent: VAR_GR,
  description: 'ATUI Portal test group for CRUD test cases',
}, { testId: 'non-reusable' })
export const P_GR_CHILD_LVL1 = new Group({
  name: `${GROUP_PREFIX}-child-lvl1`,
  alias: 'GCHLD1',
  parent: P_GR_CRUD,
})
export const P_GR_CHILD_LVL2 = new Group({
  name: `${GROUP_PREFIX}-child-lvl2`,
  alias: 'GCHLD2',
  parent: P_GR_CHILD_LVL1,
}, { testId: 'non-reusable' })
export const P_GR_CREATE_ROOT = new Group({
  name: `${GROUP_PREFIX}-created-root`,
  alias: 'GCRTR',
  parent: P_GR_CRUD,
})
export const P_GR_CREATE_CHILD = new Group({
  name: `${GROUP_PREFIX}-created-child`,
  alias: 'GCRTC',
  parent: VAR_GR,
})
export const P_GR_UPDATE = new Group({
  name: `${GROUP_PREFIX}-update`,
  alias: 'GUPDT',
  parent: P_GR_CRUD,
  description: 'For update',
  testMeta: {
    updatedName: 'Updated',
    updatedDescription: 'Updated',
  },
})
export const P_GR_DELETE = new Group({
  name: `${GROUP_PREFIX}-delete`,
  alias: 'GDEL',
  parent: P_GR_CRUD,
  description: 'For delete',
})

export const P_GR_FAV_LIST = new Group({
  name: `${GROUP_PREFIX}-favorite-list`,
  alias: 'GFAVL',
  parent: P_GR_CRUD,
  description: 'For add to favorite by list',
})
export const P_GR_FAV_TITLE = new Group({
  name: `${GROUP_PREFIX}-favorite-title`,
  alias: 'GFAVT',
  parent: P_GR_CRUD,
  description: 'For add to favorite by title',
})
export const P_GR_UNFAV_LIST = new Group({
  name: `${GROUP_PREFIX}-unfavorite-list`,
  alias: 'GUFAVL',
  parent: P_GR_CRUD,
  description: 'For remove from favorite by list',
})
export const P_GR_UNFAV_TITLE = new Group({
  name: `${GROUP_PREFIX}-unfavorite-title`,
  alias: 'GUFAVT',
  parent: P_GR_CRUD,
  description: 'For remove from favorite by title',
})
export const P_GR_UNFAV_FAV_PAGE = new Group({
  name: `${GROUP_PREFIX}-unfavorite-fav-page`,
  alias: 'GUFAVP',
  parent: P_GR_CRUD,
  description: 'For remove from favorite by Favorite page',
})
