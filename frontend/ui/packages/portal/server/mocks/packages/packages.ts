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

import type { Writeable } from '../../types'
import type { PackageDto, PackageMember, PackageMembers, PackagesDto } from './types'
import {
  ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  CREATE_AND_UPDATE_PACKAGE_PERMISSION,
  DASHBOARD_KIND,
  DELETE_PACKAGE_PERMISSION,
  GROUP_KIND,
  MANAGE_DRAFT_VERSION_PERMISSION,
  MANAGE_RELEASE_VERSION_PERMISSION,
  PACKAGE_KIND,
  PUBLIC_PACKAGE_ROLE,
  READ_PERMISSION,
  USER_ACCESS_MANAGEMENT_PERMISSION,
  VIEWER_USER_ROLE_ID,
  WORKSPACE_KIND,
} from './types'
import {
  PUBLISHED_VERSION_CONTENTS,
  VERSION_1_0,
  VERSION_1_4,
  VERSION_2_2,
  VERSION_2_6_1,
  VERSION_2_6_2,
  VERSION_2_6_3,
} from './version-contents'
import { DRAFT_VERSION_STATUS } from './version-statuses'

// Packages (all the kinds)

export const WORKSPACE_1_DTO: PackageDto = {
  packageId: 'workspace-1',
  kind: WORKSPACE_KIND,
  alias: 'ws1',
  name: 'Workspace 1',
  isFavorite: true,
  defaultVersion: VERSION_2_6_2,
  defaultVersionDetails: {
    previousVersion: VERSION_2_2,
    status: DRAFT_VERSION_STATUS,
    versionLabels: [
      'version-label',
    ],
    summary: {
      breaking: 0,
      semiBreaking: 0,
      deprecate: 0,
      nonBreaking: 0,
      annotation: 0,
      unclassified: 0,
    },
  },
  description: '',
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  permissions: [
    READ_PERMISSION,
    CREATE_AND_UPDATE_PACKAGE_PERMISSION,
    DELETE_PACKAGE_PERMISSION,
    MANAGE_RELEASE_VERSION_PERMISSION,
    MANAGE_DRAFT_VERSION_PERMISSION,
    USER_ACCESS_MANAGEMENT_PERMISSION,
    ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  ],
  userRole: VIEWER_USER_ROLE_ID,
  parents: [],
}

export const PACKAGE_NISK_DTO: PackageDto = {
  packageId: 'package-some',
  kind: PACKAGE_KIND,
  alias: 'somePkg',
  name: 'Some package',
  defaultVersion: undefined,
  parentId: WORKSPACE_1_DTO.packageId,
  isFavorite: false,
  description: '',
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  permissions: [
    READ_PERMISSION,
    DELETE_PACKAGE_PERMISSION,
    CREATE_AND_UPDATE_PACKAGE_PERMISSION,
  ],
  userRole: 'editor',
  parents: [],
}

export const GROUP_1_DTO: PackageDto = {
  packageId: 'group-1',
  kind: GROUP_KIND,
  name: 'Group 1',
  alias: 'group1',
  parentId: WORKSPACE_1_DTO.packageId,
  parents: [],
  isFavorite: false,
  description: '',
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  permissions: [
    READ_PERMISSION,
  ],
  userRole: VIEWER_USER_ROLE_ID,
}

export const GROUP_2_DTO: PackageDto = {
  packageId: 'group-2',
  kind: GROUP_KIND,
  name: 'Group 2',
  alias: 'group2',
  parentId: GROUP_1_DTO.packageId,
  parents: [],
  defaultVersion: VERSION_2_2,
  defaultVersionDetails: PUBLISHED_VERSION_CONTENTS[VERSION_2_2],
  isFavorite: true,
  permissions: [
    READ_PERMISSION,
  ],
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  userRole: VIEWER_USER_ROLE_ID,
  description: '',
}

export const GROUP_3_DTO: PackageDto = {
  packageId: 'group-3',
  kind: GROUP_KIND,
  name: 'Group 3',
  alias: 'group3',
  parentId: WORKSPACE_1_DTO.packageId,
  isFavorite: false,
  description: '',
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  permissions: [
    READ_PERMISSION,
  ],
  userRole: VIEWER_USER_ROLE_ID,
  parents: [],
}

export const GROUP_4_DTO: PackageDto = {
  packageId: 'group-4',
  kind: GROUP_KIND,
  name: 'Group 4',
  alias: 'group4',
  parentId: GROUP_3_DTO.packageId,
  parents: [],
  isFavorite: true,
  description: '',
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  permissions: [
    READ_PERMISSION,
  ],
  userRole: VIEWER_USER_ROLE_ID,
}

export const PACKAGE_0_DTO: PackageDto = {
  packageId: 'package-0',
  kind: PACKAGE_KIND,
  name: 'Package 0',
  alias: 'pkg0',
  parentId: GROUP_2_DTO.packageId,
  parents: [],
  defaultVersion: undefined,
  defaultVersionDetails: undefined,
  isFavorite: false,
  permissions: [
    READ_PERMISSION,
    DELETE_PACKAGE_PERMISSION,
    CREATE_AND_UPDATE_PACKAGE_PERMISSION,
  ],
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  userRole: VIEWER_USER_ROLE_ID,
  description: '',
}

export const PACKAGE_1_DTO: PackageDto = {
  packageId: 'package-1',
  kind: PACKAGE_KIND,
  name: 'Package 1',
  alias: 'pkg1',
  parentId: GROUP_2_DTO.packageId,
  parents: [],
  defaultVersion: VERSION_1_4,
  defaultVersionDetails: PUBLISHED_VERSION_CONTENTS[VERSION_1_4],
  isFavorite: false,
  description: '',
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '/api/{group}/',
  permissions: [
    READ_PERMISSION,
    DELETE_PACKAGE_PERMISSION,
    CREATE_AND_UPDATE_PACKAGE_PERMISSION,
  ],
  userRole: VIEWER_USER_ROLE_ID,
}

export const PACKAGE_2_DTO: PackageDto = {
  packageId: 'package-2',
  kind: PACKAGE_KIND,
  name: 'Package 2',
  alias: 'Cloud',
  parentId: GROUP_2_DTO.packageId,
  parents: [],
  defaultVersion: VERSION_1_4,
  defaultVersionDetails: PUBLISHED_VERSION_CONTENTS[VERSION_1_4],
  isFavorite: true,
  permissions: [
    READ_PERMISSION,
    DELETE_PACKAGE_PERMISSION,
    ACCESS_TOKEN_MANAGEMENT_PERMISSION,
    CREATE_AND_UPDATE_PACKAGE_PERMISSION,
  ],
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '/api/{group}/',
  userRole: VIEWER_USER_ROLE_ID,
  description: '',
}

export const PACKAGE_3_DTO: PackageDto = {
  packageId: 'package-3',
  kind: PACKAGE_KIND,
  name: 'Service',
  alias: 'SRVC',
  parentId: GROUP_1_DTO.packageId,
  parents: [
    {
      packageId: WORKSPACE_1_DTO.packageId,
      kind: WORKSPACE_1_DTO.kind,
      alias: WORKSPACE_1_DTO.alias,
      name: WORKSPACE_1_DTO.name,
    },
    {
      packageId: GROUP_2_DTO.packageId,
      kind: GROUP_2_DTO.kind,
      alias: GROUP_2_DTO.alias,
      name: GROUP_2_DTO.name,
    },
  ],
  defaultVersion: VERSION_1_0,
  defaultVersionDetails: PUBLISHED_VERSION_CONTENTS[VERSION_1_0],
  isFavorite: true,
  permissions: [
    READ_PERMISSION,
  ],
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  userRole: VIEWER_USER_ROLE_ID,
  description: 'Some long text for example',
}

export const PACKAGE_4_DTO: PackageDto = {
  packageId: 'package-4',
  kind: PACKAGE_KIND,
  name: 'Package 4',
  alias: '',
  parentId: GROUP_2_DTO.packageId,
  parents: [],
  description: 'Some long text for example',
  defaultVersion: VERSION_1_0,
  defaultVersionDetails: PUBLISHED_VERSION_CONTENTS[VERSION_1_0],
  isFavorite: false,
  permissions: [
    READ_PERMISSION,
  ],
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  userRole: VIEWER_USER_ROLE_ID,
}

export const PACKAGE_5_DTO: PackageDto = {
  packageId: 'package-5',
  kind: PACKAGE_KIND,
  name: 'Load Balancer',
  alias: 'LB',
  parentId: GROUP_3_DTO.packageId,
  parents: [],
  description: 'Some long text for example',
  defaultVersion: VERSION_2_6_3,
  defaultVersionDetails: PUBLISHED_VERSION_CONTENTS[VERSION_2_6_1],
  isFavorite: false,
  permissions: [
    READ_PERMISSION,
  ],
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  userRole: VIEWER_USER_ROLE_ID,
}

export const PACKAGE_6_DTO: PackageDto = {
  packageId: 'package-6',
  kind: PACKAGE_KIND,
  name: 'Catalog',
  alias: 'CTLG',
  parentId: GROUP_2_DTO.packageId,
  parents: [],
  defaultVersion: VERSION_2_2,
  defaultVersionDetails: PUBLISHED_VERSION_CONTENTS[VERSION_2_2],
  isFavorite: false,
  permissions: [
    READ_PERMISSION,
  ],
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  userRole: VIEWER_USER_ROLE_ID,
}

export const DASHBOARD_1_DTO: PackageDto = {
  packageId: 'dashboard-1',
  kind: DASHBOARD_KIND,
  name: 'Some Dashboard',
  alias: 'SMDSHB',
  parents: [
    {
      packageId: WORKSPACE_1_DTO.packageId,
      alias: WORKSPACE_1_DTO.alias,
      name: WORKSPACE_1_DTO.name,
      kind: WORKSPACE_1_DTO.kind,
    },
  ],
  parentId: WORKSPACE_1_DTO.packageId,
  defaultVersion: VERSION_1_0,
  defaultVersionDetails: PUBLISHED_VERSION_CONTENTS[VERSION_1_0],
  isFavorite: true,
  permissions: [
    READ_PERMISSION,
    CREATE_AND_UPDATE_PACKAGE_PERMISSION,
    DELETE_PACKAGE_PERMISSION,
    MANAGE_RELEASE_VERSION_PERMISSION,
    MANAGE_DRAFT_VERSION_PERMISSION,
    USER_ACCESS_MANAGEMENT_PERMISSION,
    ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  ],
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  userRole: VIEWER_USER_ROLE_ID,
}
export const DASHBOARD_2_DTO: PackageDto = {
  packageId: 'dashboard-2',
  kind: DASHBOARD_KIND,
  name: 'Dashboard [No Version]',
  alias: 'DSHBNV',
  parentId: WORKSPACE_1_DTO.packageId,
  parents: [
    {
      packageId: WORKSPACE_1_DTO.packageId,
      alias: WORKSPACE_1_DTO.alias,
      name: WORKSPACE_1_DTO.name,
      kind: WORKSPACE_1_DTO.kind,
    },
  ],
  defaultVersion: VERSION_1_0,
  defaultVersionDetails: PUBLISHED_VERSION_CONTENTS[VERSION_1_0],
  isFavorite: true,
  permissions: [
    READ_PERMISSION,
    CREATE_AND_UPDATE_PACKAGE_PERMISSION,
    DELETE_PACKAGE_PERMISSION,
    MANAGE_RELEASE_VERSION_PERMISSION,
    MANAGE_DRAFT_VERSION_PERMISSION,
    USER_ACCESS_MANAGEMENT_PERMISSION,
    ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  ],
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  userRole: VIEWER_USER_ROLE_ID,
}
export const DASHBOARD_3_DTO: PackageDto = {
  packageId: 'dashboard-3',
  kind: DASHBOARD_KIND,
  name: 'Test Dashboard 3',
  alias: 'tstdsh3',
  parentId: GROUP_2_DTO.packageId,
  parents: [
    {
      packageId: GROUP_2_DTO.packageId,
      name: GROUP_2_DTO.name,
      alias: GROUP_2_DTO.name,
      kind: GROUP_2_DTO.kind,
    },
  ],
  defaultVersion: VERSION_1_0,
  defaultVersionDetails: PUBLISHED_VERSION_CONTENTS[VERSION_1_0],
  isFavorite: true,
  permissions: [
    READ_PERMISSION,
    CREATE_AND_UPDATE_PACKAGE_PERMISSION,
    DELETE_PACKAGE_PERMISSION,
    MANAGE_RELEASE_VERSION_PERMISSION,
    MANAGE_DRAFT_VERSION_PERMISSION,
    USER_ACCESS_MANAGEMENT_PERMISSION,
    ACCESS_TOKEN_MANAGEMENT_PERMISSION,
  ],
  defaultRole: PUBLIC_PACKAGE_ROLE,
  defaultReleaseVersion: '',
  releaseVersionPattern: '',
  restGroupingPrefix: '',
  userRole: VIEWER_USER_ROLE_ID,
}

export const PACKAGES: Writeable<PackagesDto> = {
  packages: [
    WORKSPACE_1_DTO,
    PACKAGE_NISK_DTO,
    GROUP_1_DTO,
    GROUP_2_DTO,
    GROUP_3_DTO,
    GROUP_4_DTO,
    PACKAGE_0_DTO,
    PACKAGE_1_DTO,
    PACKAGE_2_DTO,
    PACKAGE_3_DTO,
    PACKAGE_4_DTO,
    PACKAGE_5_DTO,
    PACKAGE_6_DTO,
    DASHBOARD_1_DTO,
    DASHBOARD_2_DTO,
    DASHBOARD_3_DTO,
  ],
}

// Package Members

export const JW1234_MEMBER: PackageMember = {
  user: {
    id: 'JW_1234',
    email: 'john.williams@example.com',
    name: 'John Williams',
    avatarUrl: 'https://example.com/avatars/jw1234.jpg',
  },
  role: 'Editor',
}

export const RJ5678_MEMBER: PackageMember = {
  user: {
    id: 'RJ_5678',
    email: 'robert.johnson@example.com',
    name: 'Robert Johnson',
    avatarUrl: 'https://example.com/avatars/rj6789.jpg',
  },
  role: 'Admin',
}

export const PACKAGE_MEMBERS: Writeable<PackageMembers> = {
  members: [
    JW1234_MEMBER,
    RJ5678_MEMBER,
  ],
}
