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
import { PK_SETTINGS_1, PK_SETTINGS_2 } from './packages'
import { V_P_PKG_OPERATIONS_REST_R } from './versions.general'

export const V_P_PKG_SET_N: Version = {
  ...V_P_PKG_OPERATIONS_REST_R,
  pkg: PK_SETTINGS_1,
  version: '2000.1',
  status: 'release',
  metadata: { versionLabels: [] },
} as const

export const V_P_PKG_SET_FOR_DEF_RELEASE_N: Version = {
  ...V_P_PKG_SET_N,
  pkg: PK_SETTINGS_2,
} as const

export const V_P_PKG_SET_FOR_SET_RELEASE_N: Version = {
  ...V_P_PKG_SET_FOR_DEF_RELEASE_N,
  version: '2000.2',
} as const

export const V_P_PKG_SET_FOR_UPDATE_N: Version = {
  ...V_P_PKG_SET_FOR_DEF_RELEASE_N,
  version: '2000.3',
} as const

export const V_P_PKG_SET_FOR_DELETE_N: Version = {
  ...V_P_PKG_SET_FOR_DEF_RELEASE_N,
  version: '2000.4',
} as const
