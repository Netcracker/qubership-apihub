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
import { DSH_P_VIEWER_R } from './dashboards'
import { V_P_PKG_CHANGELOG_REST_BASE_R, V_P_PKG_CHANGELOG_REST_CHANGED_R } from '../../changelog/versions'
import { PKG_P_VIEWER_R } from './packages'

export const V_P_PKG_UAC_VIEWER_BASE_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_BASE_R,
  pkg: PKG_P_VIEWER_R,
  version: '2000.1',
} as const

export const V_P_PKG_UAC_VIEWER_CHANGED_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_CHANGED_R,
  pkg: PKG_P_VIEWER_R,
  version: 'uac-viewer',
  status: 'draft',
  previousVersion: V_P_PKG_UAC_VIEWER_BASE_R.version,
} as const

export const V_P_DSH_UAC_VIEWER_BASE_R: Version = {
  pkg: DSH_P_VIEWER_R,
  version: '2000.1',
  status: 'release',
  refs: [
    { refId: PKG_P_VIEWER_R.packageId, version: V_P_PKG_UAC_VIEWER_BASE_R.version },
  ],
} as const

export const V_P_DSH_UAC_VIEWER_CHANGED_R: Version = {
  pkg: DSH_P_VIEWER_R,
  version: 'uac-viewer',
  previousVersion: V_P_DSH_UAC_VIEWER_BASE_R.version,
  status: 'draft',
  refs: [
    { refId: PKG_P_VIEWER_R.packageId, version: V_P_PKG_UAC_VIEWER_CHANGED_R.version },
  ],
} as const
