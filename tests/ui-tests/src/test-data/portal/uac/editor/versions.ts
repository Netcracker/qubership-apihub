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
import { DSH_P_EDITOR_N } from './dashboards'
import { V_P_PKG_CHANGELOG_REST_BASE_R, V_P_PKG_CHANGELOG_REST_CHANGED_R } from '../../changelog/versions'
import { PKG_P_EDITOR_N } from './packages'

export const V_P_PKG_UAC_EDITOR_BASE_N: Version = {
  ...V_P_PKG_CHANGELOG_REST_BASE_R,
  pkg: PKG_P_EDITOR_N,
  version: '0000.1',
} as const

export const V_P_PKG_UAC_EDITOR_CHANGED_N: Version = {
  ...V_P_PKG_CHANGELOG_REST_CHANGED_R,
  pkg: PKG_P_EDITOR_N,
  version: 'uac-editor',
  status: 'draft',
  previousVersion: V_P_PKG_UAC_EDITOR_BASE_N.version,
} as const

export const V_P_PKG_UAC_EDITOR_EDITING_RELEASE_N: Version = {
  ...V_P_PKG_UAC_EDITOR_BASE_N,
  pkg: PKG_P_EDITOR_N,
  version: '1000.1',
} as const

export const V_P_PKG_UAC_EDITOR_EDITING_DRAFT_N: Version = {
  ...V_P_PKG_UAC_EDITOR_BASE_N,
  pkg: PKG_P_EDITOR_N,
  version: 'editing-draft',
  status: 'draft',
} as const

export const V_P_PKG_UAC_EDITOR_EDITING_ARCHIVED_N: Version = {
  ...V_P_PKG_UAC_EDITOR_BASE_N,
  pkg: PKG_P_EDITOR_N,
  version: 'editing-archived',
  status: 'archived',
} as const

export const V_P_PKG_UAC_EDITOR_DELETING_N: Version = {
  ...V_P_PKG_UAC_EDITOR_EDITING_DRAFT_N,
  pkg: PKG_P_EDITOR_N,
  version: 'editing-deleting',
} as const

export const V_P_DSH_UAC_EDITOR_BASE_N: Version = {
  pkg: DSH_P_EDITOR_N,
  version: '0000.1',
  status: 'release',
  refs: [
    { refId: PKG_P_EDITOR_N.packageId, version: V_P_PKG_UAC_EDITOR_BASE_N.version },
  ],
} as const

export const V_P_DSH_UAC_EDITOR_CHANGED_N: Version = {
  pkg: DSH_P_EDITOR_N,
  version: 'uac-editor',
  previousVersion: V_P_DSH_UAC_EDITOR_BASE_N.version,
  status: 'draft',
  refs: [
    { refId: PKG_P_EDITOR_N.packageId, version: V_P_PKG_UAC_EDITOR_CHANGED_N.version },
  ],
} as const

export const V_P_DSH_UAC_EDITOR_EDITING_RELEASE_N: Version = {
  ...V_P_DSH_UAC_EDITOR_BASE_N,
  pkg: DSH_P_EDITOR_N,
  version: '1000.1',
} as const

export const V_P_DSH_UAC_EDITOR_EDITING_DRAFT_N: Version = {
  ...V_P_DSH_UAC_EDITOR_BASE_N,
  pkg: DSH_P_EDITOR_N,
  version: 'editing-draft',
  status: 'draft',
} as const

export const V_P_DSH_UAC_EDITOR_EDITING_ARCHIVED_N: Version = {
  ...V_P_DSH_UAC_EDITOR_BASE_N,
  pkg: DSH_P_EDITOR_N,
  version: 'editing-archived',
  status: 'archived',
} as const

export const V_P_DSH_UAC_EDITOR_DELETING_N: Version = {
  ...V_P_DSH_UAC_EDITOR_EDITING_DRAFT_N,
  pkg: DSH_P_EDITOR_N,
  version: 'editing-deleting',
} as const
