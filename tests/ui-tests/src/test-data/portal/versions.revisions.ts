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
import { REV_METADATA } from './other'
import { PK_REV_IMM, PK_REV_VAR } from './packages'
import { D_REV_IMM, D_REV_VAR } from './dashboards'
import {
  V_P_DSH_CHANGELOG_REST_BASE_R,
  V_P_DSH_CHANGELOG_REST_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R,
} from './changelog/versions'

export const V_P_PKG_REV_PREV_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R,
  pkg: PK_REV_IMM,
  version: '2500.1',
  previousVersion: '',
} as const

export const V_P_PKG_REV_PREV_N: Version = {
  ...V_P_PKG_REV_PREV_R,
  pkg: PK_REV_VAR,
} as const

export const V_P_PKG_REV_1_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_CHANGED_R,
  pkg: PK_REV_IMM,
  version: '2500.2',
  previousVersion: V_P_PKG_REV_PREV_R.version,
  status: 'release',
  metadata: { versionLabels: ['ATUI', 'Revisions'] },
} as const

export const V_P_PKG_REV_2_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R,
  pkg: PK_REV_IMM,
  version: '2500.2',
  previousVersion: '',
  metadata: { versionLabels: ['ATUI', 'Revisions-1', 'Revisions-2'] },
} as const

export const V_P_PKG_REV_3_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R,
  pkg: PK_REV_IMM,
  version: '2500.2',
  previousVersion: '',
  status: 'draft',
  metadata: REV_METADATA,
} as const

export const V_P_PKG_REV_1_N: Version = {
  ...V_P_PKG_REV_1_R,
  pkg: PK_REV_VAR,
} as const

export const V_P_DSH_REV_PREV_R: Version = {
  ...V_P_DSH_CHANGELOG_REST_BASE_R,
  pkg: D_REV_IMM,
  version: '2500.1',
} as const

export const V_P_DSH_REV_PREV_N: Version = {
  ...V_P_DSH_REV_PREV_R,
  pkg: D_REV_VAR,
} as const

export const V_P_DSH_REV_1_R: Version = {
  ...V_P_DSH_CHANGELOG_REST_CHANGED_R,
  pkg: D_REV_IMM,
  version: '2500.2',
  status: 'release',
  previousVersion: V_P_DSH_REV_PREV_R.version,
  metadata: { versionLabels: ['ATUI', 'Revisions'] },
} as const

export const V_P_DSH_REV_2_R: Version = {
  ...V_P_DSH_CHANGELOG_REST_BASE_R,
  pkg: D_REV_IMM,
  version: '2500.2',
  metadata: { versionLabels: ['ATUI', 'Revisions-1', 'Revisions-2'] },
} as const

export const V_P_DSH_REV_3_R: Version = {
  ...V_P_DSH_CHANGELOG_REST_BASE_R,
  pkg: D_REV_IMM,
  version: '2500.2',
  previousVersion: '',
  status: 'draft',
  metadata: REV_METADATA,
} as const

export const V_P_DSH_REV_1_N: Version = {
  ...V_P_DSH_REV_1_R,
  pkg: D_REV_VAR,
} as const
