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
import { PK11, PK12, PK14 } from '../packages'
import { P_DSH_DIFF_111_R, P_DSH_DIFF_222_R, P_DSH_DIFF_333_R, P_DSH_DIFF_444_R } from './dashboards'
import {
  V_P_PKG_CHANGELOG_REST_BASE_R,
  V_P_PKG_CHANGELOG_REST_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R,
  V_P_PKG_FOR_DASHBOARDS_GQL_CHANGED_R,
  V_P_PKG_FOR_DASHBOARDS_GQL_R,
} from '../changelog/versions'

export const V_PKG_DIFF_DSH_REST_BASE_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_BASE_R,
  pkg: PK12,
  version: '0000.1',
  status: 'release',
} as const

export const V_PKG_DIFF_DSH_REST_2000_1_R: Version = {
  ...V_PKG_DIFF_DSH_REST_BASE_R,
  version: '2000.1',
  previousVersion: V_PKG_DIFF_DSH_REST_BASE_R.version,
} as const

export const V_DSH_DIFF_1111_1_R: Version = {
  pkg: P_DSH_DIFF_111_R,
  version: '1111.1',
  status: 'release',
  refs: [
    { refId: PK11.packageId, version: V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R.version },
  ],
} as const

export const V_DSH_DIFF_1111_2_R: Version = {
  pkg: P_DSH_DIFF_111_R,
  version: '1111.2',
  status: 'release',
  refs: [
    { refId: PK11.packageId, version: V_P_PKG_CHANGELOG_REST_CHANGED_R.version },
  ],
} as const

export const V_DSH_DIFF_2222_1_BASE_REV_R: Version = {
  pkg: P_DSH_DIFF_222_R,
  version: '2222.1',
  status: 'release',
  refs: [
    { refId: PK11.packageId, version: V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R.version },
    { refId: PK14.packageId, version: V_P_PKG_FOR_DASHBOARDS_GQL_R.version },
  ],
} as const

export const V_DSH_DIFF_2222_1_R: Version = {
  pkg: P_DSH_DIFF_222_R,
  version: '2222.1',
  status: 'release',
  refs: [
    { refId: PK11.packageId, version: V_P_PKG_CHANGELOG_REST_CHANGED_R.version },
    { refId: PK14.packageId, version: V_P_PKG_FOR_DASHBOARDS_GQL_R.version },
  ],
} as const

export const V_DSH_DIFF_3333_1_R: Version = {
  pkg: P_DSH_DIFF_333_R,
  version: '3333.1',
  status: 'release',
  refs: [
    { refId: PK11.packageId, version: V_P_PKG_CHANGELOG_REST_CHANGED_R.version },
    { refId: PK14.packageId, version: V_P_PKG_FOR_DASHBOARDS_GQL_CHANGED_R.version },
    { refId: PK12.packageId, version: V_PKG_DIFF_DSH_REST_2000_1_R.version },
  ],
} as const

export const V_DSH_DIFF_4444_1_R: Version = {
  pkg: P_DSH_DIFF_444_R,
  version: '4444.1',
  status: 'release',
  refs: [
    { refId: PK11.packageId, version: V_P_PKG_CHANGELOG_REST_CHANGED_R.version },
    { refId: PK14.packageId, version: V_P_PKG_FOR_DASHBOARDS_GQL_CHANGED_R.version },
  ],
} as const
