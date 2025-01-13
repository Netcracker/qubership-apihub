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
import { PKG_P_HIERARCHY_BREAKING_R, PKG_P_HIERARCHY_NO_CHANGES_R, PKG_P_HIERARCHY_NON_BREAKING_R } from './packages'
import {
  FILE_P_PETSTORE30_CHANGED,
  FILE_P_PETSTORE30_CHANGELOG_BASE,
  FILE_P_PETSTORE30_CHANGELOG_NON_BREAKING,
} from '../files'
import { DSH_P_HIERARCHY_BREAKING_R, DSH_P_HIERARCHY_NO_CHANGES_R, DSH_P_HIERARCHY_NON_BREAKING_R } from './dashboards'

export const V_P_PKG_HIERARCHY_BREAKING_BASE_R: Version = {
  pkg: PKG_P_HIERARCHY_BREAKING_R,
  version: '0000.1',
  status: 'release',
  files: [{ file: FILE_P_PETSTORE30_CHANGELOG_BASE }],
} as const

export const V_P_PKG_HIERARCHY_BREAKING_CHANGED_R: Version = {
  ...V_P_PKG_HIERARCHY_BREAKING_BASE_R,
  version: '0000.2',
  previousVersion: V_P_PKG_HIERARCHY_BREAKING_BASE_R.version,
  files: [{ file: FILE_P_PETSTORE30_CHANGED }],
} as const

export const V_P_PKG_HIERARCHY_NON_BREAKING_BASE_R: Version = {
  ...V_P_PKG_HIERARCHY_BREAKING_BASE_R,
  pkg: PKG_P_HIERARCHY_NON_BREAKING_R,
  version: '0001.1',
} as const

export const V_P_PKG_HIERARCHY_NON_BREAKING_CHANGED_R: Version = {
  ...V_P_PKG_HIERARCHY_NON_BREAKING_BASE_R,
  version: '0001.2',
  previousVersion: V_P_PKG_HIERARCHY_NON_BREAKING_BASE_R.version,
  files: [{ file: FILE_P_PETSTORE30_CHANGELOG_NON_BREAKING }],
} as const

export const V_P_PKG_HIERARCHY_NO_CHANGES_BASE_R: Version = {
  ...V_P_PKG_HIERARCHY_BREAKING_BASE_R,
  pkg: PKG_P_HIERARCHY_NO_CHANGES_R,
  version: '0002.1',
} as const

export const V_P_PKG_HIERARCHY_NO_CHANGES_CHANGED_R: Version = {
  ...V_P_PKG_HIERARCHY_NO_CHANGES_BASE_R,
  version: '0002.2',
  previousVersion: V_P_PKG_HIERARCHY_NO_CHANGES_BASE_R.version,
} as const

export const V_P_DSH_HIERARCHY_BREAKING_BASE_R: Version = {
  pkg: DSH_P_HIERARCHY_BREAKING_R,
  version: '0000.1',
  status: 'release',
  refs: [{
    refId: V_P_PKG_HIERARCHY_BREAKING_BASE_R.pkg.packageId,
    version: V_P_PKG_HIERARCHY_BREAKING_BASE_R.version,
  }],
} as const

export const V_P_DSH_HIERARCHY_BREAKING_CHANGED_R: Version = {
  ...V_P_DSH_HIERARCHY_BREAKING_BASE_R,
  version: '0000.2',
  previousVersion: V_P_DSH_HIERARCHY_BREAKING_BASE_R.version,
  refs: [{
    refId: V_P_PKG_HIERARCHY_BREAKING_BASE_R.pkg.packageId,
    version: V_P_PKG_HIERARCHY_BREAKING_CHANGED_R.version,
  }],
} as const

export const V_P_DSH_HIERARCHY_NON_BREAKING_BASE_R: Version = {
  pkg: DSH_P_HIERARCHY_NON_BREAKING_R,
  version: '0001.1',
  status: 'release',
  refs: [{
    refId: V_P_PKG_HIERARCHY_NON_BREAKING_BASE_R.pkg.packageId,
    version: V_P_PKG_HIERARCHY_NON_BREAKING_BASE_R.version,
  }],
} as const

export const V_P_DSH_HIERARCHY_NON_BREAKING_CHANGED_R: Version = {
  ...V_P_DSH_HIERARCHY_NON_BREAKING_BASE_R,
  version: '0001.2',
  previousVersion: V_P_DSH_HIERARCHY_NON_BREAKING_BASE_R.version,
  refs: [{
    refId: V_P_PKG_HIERARCHY_NON_BREAKING_BASE_R.pkg.packageId,
    version: V_P_PKG_HIERARCHY_NON_BREAKING_CHANGED_R.version,
  }],
} as const

export const V_P_DSH_HIERARCHY_NO_CHANGES_BASE_R: Version = {
  pkg: DSH_P_HIERARCHY_NO_CHANGES_R,
  version: '0002.1',
  status: 'release',
  refs: [{
    refId: V_P_PKG_HIERARCHY_NO_CHANGES_BASE_R.pkg.packageId,
    version: V_P_PKG_HIERARCHY_NO_CHANGES_BASE_R.version,
  }],
} as const

export const V_P_DSH_HIERARCHY_NO_CHANGES_CHANGED_R: Version = {
  ...V_P_DSH_HIERARCHY_NO_CHANGES_BASE_R,
  version: '0002.2',
  previousVersion: V_P_DSH_HIERARCHY_NO_CHANGES_BASE_R.version,
  refs: [{
    refId: V_P_PKG_HIERARCHY_NO_CHANGES_BASE_R.pkg.packageId,
    version: V_P_PKG_HIERARCHY_NO_CHANGES_CHANGED_R.version,
  }],
} as const
