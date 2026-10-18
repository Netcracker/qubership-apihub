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

import type { Package } from '../../entities/packages'
import { DASHBOARD_KIND, GROUP_KIND, PACKAGE_KIND, WORKSPACE_KIND } from '../../entities/packages'

export const WORKSPACE_1: Package = {
  key: 'workspace-1',
  kind: WORKSPACE_KIND,
  alias: 'ws1',
  name: 'Workspace 1',
  isFavorite: true,
  defaultVersion: '2020.1',
  description: '',
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  parents: [],
}

export const PACKAGE_NISK: Package = {
  key: 'package-nisk',
  kind: PACKAGE_KIND,
  alias: 'niskpkg',
  name: 'Package NISK',
  defaultVersion: undefined,
  parentGroup: WORKSPACE_1.key,
  isFavorite: false,
  description: '',
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  parents: [],
}

export const GROUP_1: Package = {
  key: 'group-1',
  kind: GROUP_KIND,
  name: 'Group 1',
  alias: 'group1',
  parentGroup: WORKSPACE_1.key,
  parents: [],
  isFavorite: false,
  description: '',
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
}

export const GROUP_2: Package = {
  key: 'group-2',
  kind: GROUP_KIND,
  name: 'Group 2',
  alias: 'group2',
  parentGroup: GROUP_1.key,
  parents: [],
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
}

export const GROUP_3: Package = {
  key: 'group-3',
  kind: GROUP_KIND,
  name: 'Group 3',
  alias: 'group3',
  parentGroup: WORKSPACE_1.key,
  isFavorite: false,
  description: '',
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
}

export const GROUP_4: Package = {
  key: 'group-4',
  kind: GROUP_KIND,
  name: 'Group 4',
  alias: 'group4',
  parentGroup: GROUP_3.key,
  parents: [],
  isFavorite: true,
  description: '',
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
}

export const PACKAGE_0: Package = {
  key: 'package-0',
  kind: PACKAGE_KIND,
  name: 'Package 0',
  alias: 'pkg0',
  parentGroup: GROUP_2.key,
  parents: [],
  defaultVersion: undefined,
  isFavorite: false,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
}

export const PACKAGE_1: Package = {
  key: 'package-1',
  kind: PACKAGE_KIND,
  name: 'Package 1',
  alias: 'pkg1',
  parentGroup: GROUP_2.key,
  parents: [],
  isFavorite: false,
  description: '',
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '/api/{group}/',
}

export const PACKAGE_2: Package = {
  key: 'package-2',
  kind: PACKAGE_KIND,
  name: 'Package 2',
  alias: 'pkg2',
  parentGroup: GROUP_2.key,
  parents: [],
  isFavorite: true,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '/api/{group}/',
}

export const PACKAGE_3: Package = {
  key: 'package-3',
  kind: PACKAGE_KIND,
  name: 'My Package 3',
  alias: 'PKG3',
  parentGroup: GROUP_1.key,
  parents: [
    {
      key: WORKSPACE_1.key,
      kind: WORKSPACE_1.kind,
      alias: WORKSPACE_1.alias,
      name: WORKSPACE_1.name,
    },
    {
      key: GROUP_2.key,
      kind: GROUP_2.kind,
      alias: GROUP_2.alias,
      name: GROUP_2.name,
    },
  ],
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  description: 'MY PACKAGE 3 DESCRIPTION',
}

export const PACKAGE_4: Package = {
  key: 'package-4',
  kind: PACKAGE_KIND,
  name: 'package number four',
  alias: 'PKG4',
  parentGroup: GROUP_2.key,
  parents: [],
  description: 'Some description for package 4',
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
}

export const PACKAGE_5: Package = {
  key: 'package-5',
  kind: PACKAGE_KIND,
  name: 'Fifth Test Package',
  alias: 'PKG5',
  parentGroup: GROUP_3.key,
  parents: [],
  description: 'Description of 5th test package',
  isFavorite: false,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
}

export const PACKAGE_6: Package = {
  key: 'package-6',
  kind: PACKAGE_KIND,
  name: 'Test Package #6',
  alias: 'PKG6',
  parentGroup: GROUP_2.key,
  parents: [],
  isFavorite: false,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
}

export const DASHBOARD_1: Package = {
  key: 'dashboard-1',
  kind: DASHBOARD_KIND,
  name: 'Dashboard',
  alias: 'DSH',
  parents: [
    {
      key: WORKSPACE_1.key,
      alias: WORKSPACE_1.alias,
      name: WORKSPACE_1.name,
      kind: WORKSPACE_1.kind,
    },
  ],
  parentGroup: WORKSPACE_1.key,
  isFavorite: true,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
}
export const DASHBOARD_2: Package = {
  key: 'dashboard-2',
  kind: DASHBOARD_KIND,
  name: 'Dashboard [No Version]',
  alias: 'DSHNV',
  parentGroup: WORKSPACE_1.key,
  parents: [
    {
      key: WORKSPACE_1.key,
      alias: WORKSPACE_1.alias,
      name: WORKSPACE_1.name,
      kind: WORKSPACE_1.kind,
    },
  ],
  isFavorite: true,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
}
export const DASHBOARD_3: Package = {
  key: 'dashboard-3',
  kind: DASHBOARD_KIND,
  name: 'Test Dashboard 3',
  alias: 'tstdsh3',
  parentGroup: GROUP_2.key,
  parents: [
    {
      key: GROUP_2.key,
      name: GROUP_2.name,
      alias: GROUP_2.name,
      kind: GROUP_2.kind,
    },
  ],
  isFavorite: true,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
}

export const PACKAGES = [
  WORKSPACE_1,
  PACKAGE_NISK,
  GROUP_1,
  GROUP_2,
  GROUP_3,
  GROUP_4,
  PACKAGE_0,
  PACKAGE_1,
  PACKAGE_2,
  PACKAGE_3,
  PACKAGE_4,
  PACKAGE_5,
  PACKAGE_6,
  DASHBOARD_1,
  DASHBOARD_2,
  DASHBOARD_3,
]

export const GROUPS = PACKAGES.filter(({ kind }) => kind === GROUP_KIND)
export const WORKSPACES = PACKAGES.filter(({ kind }) => kind === WORKSPACE_KIND)
