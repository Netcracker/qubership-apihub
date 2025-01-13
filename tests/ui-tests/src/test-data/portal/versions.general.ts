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
  FILE_P_ARCHIVE,
  FILE_P_GQL_SMALL,
  FILE_P_GQL_SMALL_GS,
  FILE_P_JSON_SCHEMA_JSON,
  FILE_P_JSON_SCHEMA_YAML,
  FILE_P_MARKDOWN,
  FILE_P_MSOFFICE,
  FILE_P_PETSTORE20,
  FILE_P_PETSTORE30,
  FILE_P_PETSTORE30_DEPRECATED_BASE,
  FILE_P_PETSTORE30_DEPRECATED_CHANGED,
  FILE_P_PETSTORE30_DEPRECATED_NO_DEPRECATED,
  FILE_P_PETSTORE30_GS,
  FILE_P_PETSTORE31,
  FILE_P_PICTURE,
  FILE_P_PLAYGROUND,
} from './files'
import { P_PK_PGND, PK11, PK12, PK13, PK_GS } from './packages'
import { D11, D12, D123, P_DSH_UPDATE } from './dashboards'
import {
  V_P_PKG_CHANGELOG_MULTI_CHANGED_R,
  V_P_PKG_CHANGELOG_MULTI_INTERMEDIATE_R,
  V_P_PKG_FOR_DASHBOARDS_REST_BASE_R,
} from './changelog/versions'

export const V_P_PKG_DRAFT_R: Version = {
  pkg: PK11,
  version: 'test-draft',
  status: 'draft',
  files: [{ file: FILE_P_PETSTORE30 }],
  metadata: { versionLabels: ['ATUI', 'Version', 'Package Draft'] },
} as const

export const V_P_PKG_ARCHIVED_R: Version = {
  pkg: PK11,
  version: '2200.1',
  status: 'release',
  files: [{ file: FILE_P_PETSTORE30 }],
  metadata: { versionLabels: ['ATUI', 'Version', 'Package Archived'] },
} as const

export const V_P_PKG_WITHOUT_LABELS_R: Version = {
  pkg: PK11,
  version: 'without-labels',
  status: 'draft',
  files: [{ file: FILE_P_PETSTORE30 }],
} as const

export const V_P_PKG_WITHOUT_OPERATIONS_R: Version = {
  pkg: PK11,
  version: 'no-operations',
  status: 'draft',
  files: [{ file: FILE_P_MARKDOWN }],
} as const

export const V_P_PKG_GLOBAL_SEARCH_N: Version = {
  pkg: PK_GS,
  version: 'global-search',
  status: 'draft',
  files: [
    { file: FILE_P_PETSTORE30_GS, labels: ['atuiLabel'] },
    { file: FILE_P_GQL_SMALL_GS },
  ],
  metadata: { versionLabels: ['atuiLabel'] },
} as const

export const V_P_PKG_DOCUMENTS_R: Version = {
  pkg: PK11,
  version: 'documents',
  status: 'draft',
  files: [
    { file: FILE_P_PETSTORE20, labels: ['ATUI', 'File', 'ps 2.0'] },
    { file: FILE_P_PETSTORE30, labels: ['ATUI', 'File', 'ps 3.0'] },
    { file: FILE_P_PETSTORE31 },
    { file: FILE_P_GQL_SMALL },
    { file: FILE_P_JSON_SCHEMA_JSON },
    { file: FILE_P_JSON_SCHEMA_YAML },
    { file: FILE_P_MSOFFICE },
    { file: FILE_P_MARKDOWN },
    { file: FILE_P_PICTURE },
    { file: FILE_P_ARCHIVE },
  ],
} as const

export const V_P_PKG_OPERATIONS_MULTI_TYPE_R: Version = {
  pkg: PK11,
  version: '2210.1',
  status: 'release',
  files: [
    { file: FILE_P_PETSTORE30 },
    { file: FILE_P_GQL_SMALL },
  ],
  metadata: { versionLabels: ['ATUI', 'Version', 'Package Multi'] },
} as const

export const V_P_PKG_OPERATIONS_REST_R: Version = {
  pkg: PK11,
  version: '2211.1',
  status: 'release',
  files: [{ file: FILE_P_PETSTORE30 }],
  metadata: { versionLabels: ['ATUI', 'Version', 'Package Rest'] },
} as const

export const V_P_PKG_OPERATIONS_REST_TWO_DOCS_R: Version = {
  pkg: PK11,
  version: 'operations-rest-two-docs',
  status: 'draft',
  files: [
    { file: FILE_P_PETSTORE20 },
    { file: FILE_P_PETSTORE30 },
  ],
} as const

export const V_P_PKG_DEPRECATED_REST_BASE_R: Version = {
  pkg: PK11,
  version: '2231.1',
  status: 'release',
  files: [{ file: FILE_P_PETSTORE30_DEPRECATED_BASE }],
} as const

export const V_P_PKG_DEPRECATED_REST_NO_DEPRECATED_R: Version = {
  pkg: PK11,
  version: 'deprecated-rest-no-deprecated',
  status: 'draft',
  files: [{ file: FILE_P_PETSTORE30_DEPRECATED_NO_DEPRECATED }],
} as const

export const V_P_PKG_DEPRECATED_REST_CHANGED_R: Version = {
  pkg: PK11,
  version: 'deprecated-rest',
  previousVersion: V_P_PKG_DEPRECATED_REST_BASE_R.version,
  status: 'draft',
  files: [{ file: FILE_P_PETSTORE30_DEPRECATED_CHANGED }],
} as const

export const V_P_PKG_OVERVIEW_R: Version = {
  ...V_P_PKG_CHANGELOG_MULTI_CHANGED_R,
  version: '2800.1',
  previousVersion: V_P_PKG_CHANGELOG_MULTI_INTERMEDIATE_R.version,
  status: 'release',
  metadata: { versionLabels: ['ATUI', 'Version', 'Package Overview'] },
} as const

export const V_P_PKG_FOR_DASHBOARDS_DELETED_R: Version = {
  pkg: PK13,
  version: 'pkg-for-dash-deleted',
  status: 'draft',
  files: [{ file: FILE_P_PETSTORE20 }],
} as const

export const V_P_PKG_PLAYGROUND_R: Version = {
  pkg: P_PK_PGND,
  version: 'playground',
  status: 'draft',
  files: [{ file: FILE_P_PLAYGROUND }],
} as const

export const V_P_DSH_CONFLICT_PKG_NESTED_R: Version = {
  pkg: D12,
  version: 'dash-conflict-package-nested',
  status: 'draft',
  refs: [{ refId: PK11.packageId, version: V_P_PKG_OPERATIONS_REST_R.version }],
} as const

export const V_P_DSH_NOT_EXIST_PKG_NESTED_R: Version = {
  pkg: D12,
  version: 'dash-not-exist-ref-nested',
  status: 'draft',
  refs: [{ refId: PK13.packageId, version: V_P_PKG_FOR_DASHBOARDS_DELETED_R.version }],
} as const

export const V_P_DSH_OVERVIEW_NESTED_R: Version = {
  pkg: D12,
  version: 'dash-overview-nested',
  status: 'draft',
  refs: [
    { refId: PK12.packageId, version: V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.version },
    { refId: PK13.packageId, version: V_P_PKG_FOR_DASHBOARDS_DELETED_R.version },
    { refId: PK11.packageId, version: V_P_PKG_OPERATIONS_REST_R.version },
  ],
} as const

export const V_P_DSH_OVERVIEW_R: Version = {
  pkg: D11,
  version: '2900.1',
  status: 'release',
  metadata: { versionLabels: ['ATUI', 'Version', 'Dashboard Overview'] },
  refs: [
    { refId: D12.packageId, version: V_P_DSH_OVERVIEW_NESTED_R.version },
    { refId: PK11.packageId, version: V_P_PKG_OPERATIONS_REST_R.version },
  ],
} as const

export const V_P_DSH_RELEASE_N: Version = {
  pkg: D123,
  version: '2400.1',
  status: 'release',
  refs: [{ refId: PK11.packageId, version: V_P_PKG_OPERATIONS_REST_R.version }],
} as const

export const V_P_DSH_DRAFT_N: Version = {
  pkg: D123,
  version: 'dash-non-reusable',
  status: 'draft',
  refs: [{ refId: PK11.packageId, version: V_P_PKG_OPERATIONS_REST_R.version }],
} as const

export const V_P_DSH_REPUBLISH_N: Version = {
  pkg: D123,
  version: 'dash-republish',
  status: 'draft',
  refs: [{ refId: PK11.packageId, version: V_P_PKG_OPERATIONS_REST_R.version }],
} as const

export const V_P_DSH_CRUD_RELEASE_N: Version = {
  ...V_P_DSH_RELEASE_N,
  pkg: P_DSH_UPDATE,
} as const
