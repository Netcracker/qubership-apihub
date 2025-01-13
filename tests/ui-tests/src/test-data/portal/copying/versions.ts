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
import { P_DSH_CP_RELEASE, P_DSH_CP_SOURCE } from './dashboards'
import { P_PK_CP_RELEASE, P_PK_CP_SOURCE } from './packages'
import {
  V_P_DSH_CHANGELOG_REST_BASE_R,
  V_P_DSH_CHANGELOG_REST_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_BASE_R,
  V_P_PKG_CHANGELOG_REST_CHANGED_R,
} from '../changelog/versions'

export const V_P_PKG_COPYING_SOURCE_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_CHANGED_R,
  pkg: P_PK_CP_SOURCE,
  previousVersion: '',
  status: 'draft',
  metadata: { versionLabels: ['source-label-1', 'source-label-2'] },
} as const

export const V_P_PKG_COPYING_RELEASE_N: Version = {
  ...V_P_PKG_CHANGELOG_REST_BASE_R,
  pkg: P_PK_CP_RELEASE,
  version: '2000.1',
  metadata: { versionLabels: ['release-label-1', 'release-label-2'] },
} as const
export const V_P_DSH_COPYING_SOURCE_R: Version = {
  ...V_P_DSH_CHANGELOG_REST_CHANGED_R,
  pkg: P_DSH_CP_SOURCE,
  previousVersion: '',
} as const
export const V_P_DSH_COPYING_RELEASE_N: Version = {
  ...V_P_DSH_CHANGELOG_REST_BASE_R,
  pkg: P_DSH_CP_RELEASE,
  version: '2000.1',
} as const
