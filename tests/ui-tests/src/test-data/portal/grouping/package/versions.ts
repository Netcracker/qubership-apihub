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

import type { Version } from '@test-data/props'
import {
  FILE_P_GQL_SMALL,
  FILE_P_GRP_DOWNLOAD_PUBLISH,
  FILE_P_GRP_PREFIX_PETSTORE30_V2,
  FILE_P_GRP_PREFIX_PETSTORE30_V2_CHANGED,
  FILE_P_PETSTORE30_CHANGELOG_BASE,
  FILE_P_PETSTORE30_CHANGELOG_CHANGED,
} from '../../files'
import {
  P_PKG_PMGR1_N,
  P_PKG_PMGR2_N,
  P_PKG_PMGR_R,
  P_PKG_PPGR_EDIT_N,
  P_PKG_PPGR_GQL_R,
  P_PKG_PPGR_REST_R,
  P_PKG_PPGR_SETTINGS_R,
} from './packages'
import { V_PKG_DMGR_PET_BASE_R, V_PKG_DMGR_PET_PROP_R } from '../dashboard/versions'
import { V_P_PKG_CHANGELOG_MULTI_BASE_R, V_P_PKG_CHANGELOG_MULTI_CHANGED_R } from '../../changelog/versions'

export const V_PKG_PMGR_BASE_R: Version = {
  ...V_P_PKG_CHANGELOG_MULTI_BASE_R,
  pkg: P_PKG_PMGR_R,
  version: '2000.1',
  status: 'release',
} as const

export const V_PKG_PMGR_CHANGED_R: Version = {
  ...V_P_PKG_CHANGELOG_MULTI_CHANGED_R,
  pkg: P_PKG_PMGR_R,
  version: '2000.2',
  previousVersion: V_PKG_PMGR_BASE_R.version,
  status: 'release',
} as const

export const V_PKG_PMGR_N: Version = {
  ...V_PKG_PMGR_BASE_R,
  pkg: P_PKG_PMGR1_N,
} as const

export const V_PKG_PMGR_DOWNLOAD_PUBLISH_N: Version = {
  pkg: P_PKG_PMGR1_N,
  version: '0001.1',
  status: 'release',
  files: [{ file: FILE_P_GRP_DOWNLOAD_PUBLISH }],
} as const

export const V_PKG_PMGR_200_R: Version = {
  pkg: P_PKG_PMGR_R,
  version: 'more-200',
  status: 'draft',
  files: [
    // { file: FILE_P_GRP_MORE200_1 }, //Skipped test [P-MGO-3.2-N] Add more than 200 operations (Negative)
    // { file: FILE_P_GRP_MORE200_2 },
    // { file: FILE_P_GRP_MORE200_3 },
  ],
} as const

export const V_PKG_PMGR_PROP_N: Version = {
  ...V_PKG_DMGR_PET_BASE_R,
  pkg: P_PKG_PMGR2_N,
  version: '0000.1',
  status: 'release',
} as const

export const V_PKG_PMGR_PROP_SAME_SPEC_N: Version = {
  ...V_PKG_PMGR_PROP_N,
  version: '0000.2',
  previousVersion: V_PKG_PMGR_PROP_N.version,
} as const

export const V_PKG_PMGR_PROP_DIF_SPEC_N: Version = {
  ...V_PKG_DMGR_PET_PROP_R,
  pkg: P_PKG_PMGR2_N,
  version: '0000.3',
  previousVersion: V_PKG_PMGR_PROP_N.version,
} as const

export const V_PKG_PPGR_REST_BASE_R: Version = {
  pkg: P_PKG_PPGR_REST_R,
  version: '2000.1',
  status: 'release',
  files: [
    { file: FILE_P_PETSTORE30_CHANGELOG_BASE },
    { file: FILE_P_GRP_PREFIX_PETSTORE30_V2 },
  ],
} as const

export const V_PKG_PPGR_REST_CHANGED_R: Version = {
  ...V_PKG_PPGR_REST_BASE_R,
  version: 'prefix-grouping-rest',
  previousVersion: V_PKG_PPGR_REST_BASE_R.version,
  status: 'draft',
  files: [
    { file: FILE_P_PETSTORE30_CHANGELOG_CHANGED },
    { file: FILE_P_GRP_PREFIX_PETSTORE30_V2_CHANGED },
  ],
} as const

export const V_PKG_PPGR_GQL_R: Version = {
  pkg: P_PKG_PPGR_GQL_R,
  version: 'prefix-grouping-gql',
  status: 'draft',
  files: [{ file: FILE_P_GQL_SMALL }],
} as const

export const V_PKG_PPGR_SETTINGS_R: Version = {
  ...V_PKG_PPGR_REST_BASE_R,
  pkg: P_PKG_PPGR_SETTINGS_R,
  version: '2000.1',
} as const

export const V_PKG_PPGR_EDIT_N: Version = {
  ...V_PKG_PPGR_REST_BASE_R,
  pkg: P_PKG_PPGR_EDIT_N,
  version: '2001.1',
} as const
