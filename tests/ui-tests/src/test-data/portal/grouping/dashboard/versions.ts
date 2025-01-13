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
  FILE_P_GRP_GQL_PROP,
  FILE_P_GRP_PET30_BASE,
  FILE_P_GRP_PET30_CHANGED,
  FILE_P_GRP_PET30_PROP,
  FILE_P_GRP_STORE30_BASE,
  FILE_P_GRP_USER30_BASE,
  FILE_P_GRP_USER30_CHANGED,
} from '../../files'
import { P_PKG_DMGR_PET_R, P_PKG_DMGR_STORE_R, P_PKG_DMGR_USER_R } from './packages'
import { P_DSH_DMGR1_N, P_DSH_DMGR2_N, P_DSH_DMGR_R } from './dashboards'

export const V_PKG_DMGR_PET_BASE_R: Version = {
  pkg: P_PKG_DMGR_PET_R,
  version: '2000.1',
  status: 'release',
  files: [
    { file: FILE_P_GRP_PET30_BASE },
    { file: FILE_P_GQL_SMALL },
  ],
} as const

export const V_PKG_DMGR_PET_CHANGED_R: Version = {
  pkg: P_PKG_DMGR_PET_R,
  version: '2000.2',
  previousVersion: V_PKG_DMGR_PET_BASE_R.version,
  status: 'release',
  files: [
    { file: FILE_P_GRP_PET30_CHANGED },
    { file: FILE_P_GQL_SMALL },
  ],
} as const

export const V_PKG_DMGR_PET_PROP_R: Version = {
  pkg: P_PKG_DMGR_PET_R,
  version: '2001.1',
  status: 'release',
  files: [
    { file: FILE_P_GRP_PET30_PROP },
    { file: FILE_P_GRP_GQL_PROP },
  ],
} as const

export const V_PKG_DMGR_USER_BASE_R: Version = {
  pkg: P_PKG_DMGR_USER_R,
  version: '2000.1',
  status: 'release',
  files: [{ file: FILE_P_GRP_USER30_BASE }],
} as const

export const V_PKG_DMGR_USER_CHANGED_R: Version = {
  pkg: P_PKG_DMGR_USER_R,
  version: '2000.2',
  previousVersion: V_PKG_DMGR_USER_BASE_R.version,
  status: 'release',
  files: [{ file: FILE_P_GRP_USER30_CHANGED }],
} as const

export const V_PKG_DMGR_STORE_R: Version = {
  pkg: P_PKG_DMGR_STORE_R,
  version: '2000.1',
  status: 'release',
  files: [{ file: FILE_P_GRP_STORE30_BASE }],
} as const

export const V_PKG_DMGR_200_1_R: Version = {
  pkg: P_PKG_DMGR_PET_R,
  version: 'more-200-1-pkg',
  status: 'draft',
  // files: [{ file: FILE_P_GRP_MORE200_1 }], //Skipped test [P-MGO-3.2-N] Add more than 200 operations (Negative)
} as const

export const V_PKG_DMGR_200_2_R: Version = {
  pkg: P_PKG_DMGR_USER_R,
  version: 'more-200-2-pkg',
  status: 'draft',
  // files: [{ file: FILE_P_GRP_MORE200_2 }], //Skipped test [P-MGO-3.2-N] Add more than 200 operations (Negative)
} as const

export const V_PKG_DMGR_200_3_R: Version = {
  pkg: P_PKG_DMGR_STORE_R,
  version: 'more-200-3-pkg',
  status: 'draft',
  // files: [{ file: FILE_P_GRP_MORE200_3 }], //Skipped test [P-MGO-3.2-N] Add more than 200 operations (Negative)
} as const

export const V_DSH_DMGR_N: Version = {
  pkg: P_DSH_DMGR1_N,
  version: '2000.1',
  status: 'release',
  refs: [
    { refId: P_PKG_DMGR_PET_R.packageId, version: V_PKG_DMGR_PET_BASE_R.version },
    { refId: P_PKG_DMGR_USER_R.packageId, version: V_PKG_DMGR_USER_BASE_R.version },
  ],
} as const

export const V_DSH_DMGR_200_R: Version = {
  pkg: P_DSH_DMGR_R,
  version: 'more-200-dash',
  status: 'draft',
  refs: [
    { refId: P_PKG_DMGR_PET_R.packageId, version: V_PKG_DMGR_200_1_R.version },
    { refId: P_PKG_DMGR_USER_R.packageId, version: V_PKG_DMGR_200_2_R.version },
    { refId: P_PKG_DMGR_STORE_R.packageId, version: V_PKG_DMGR_200_3_R.version },
  ],
} as const

export const V_DSH_DMGR_BASE_R: Version = {
  pkg: P_DSH_DMGR_R,
  version: '2000.1',
  status: 'release',
  refs: [
    { refId: P_PKG_DMGR_PET_R.packageId, version: V_PKG_DMGR_PET_BASE_R.version },
    { refId: P_PKG_DMGR_USER_R.packageId, version: V_PKG_DMGR_USER_BASE_R.version },
    { refId: P_PKG_DMGR_STORE_R.packageId, version: V_PKG_DMGR_STORE_R.version },
  ],
} as const

export const V_DSH_DMGR_CHANGED_R: Version = {
  pkg: P_DSH_DMGR_R,
  version: '2000.2',
  previousVersion: V_DSH_DMGR_BASE_R.version,
  status: 'release',
  refs: [
    { refId: P_PKG_DMGR_PET_R.packageId, version: V_PKG_DMGR_PET_CHANGED_R.version },
    { refId: P_PKG_DMGR_USER_R.packageId, version: V_PKG_DMGR_USER_CHANGED_R.version },
    { refId: P_PKG_DMGR_STORE_R.packageId, version: V_PKG_DMGR_STORE_R.version },
  ],
} as const

export const V_DSH_DMGR_PROP_N: Version = {
  pkg: P_DSH_DMGR2_N,
  version: '0000.1',
  status: 'release',
  refs: [
    { refId: P_PKG_DMGR_PET_R.packageId, version: V_PKG_DMGR_PET_BASE_R.version },
    { refId: P_PKG_DMGR_USER_R.packageId, version: V_PKG_DMGR_USER_BASE_R.version },
  ],
} as const

export const V_DSH_DMGR_PROP_SAME_SPEC_N: Version = {
  ...V_DSH_DMGR_PROP_N,
  version: '0000.2',
  previousVersion: V_DSH_DMGR_PROP_N.version,
} as const

export const V_DSH_DMGR_PROP_DIF_SPEC_N: Version = {
  ...V_DSH_DMGR_PROP_N,
  version: '0000.3',
  previousVersion: V_DSH_DMGR_PROP_N.version,
  refs: [
    { refId: P_PKG_DMGR_PET_R.packageId, version: V_PKG_DMGR_PET_PROP_R.version },
    { refId: P_PKG_DMGR_USER_R.packageId, version: V_PKG_DMGR_USER_BASE_R.version },
  ],
} as const
