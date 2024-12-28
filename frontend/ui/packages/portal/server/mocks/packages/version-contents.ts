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

import { generateRandomDigit } from '../../utils'
import type {
  ChangesSummaryDto,
  OperationGroupWithApiTypeDto,
  OperationTypeSummaryDto,
  PackageVersionContentDto,
} from './types'
import { GRAPHQL_API_TYPE, REST_API_TYPE } from './types'
import { ARCHIVED_VERSION_STATUS, DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS } from './version-statuses'
import { TOKEN_SAMPLE, USER_SAMPLE } from './principal'

export const RELEASE_VERSION_2022_1 = '2022.1@1'
export const RELEASE_VERSION_2022_2 = '2022.2@1'
export const RELEASE_VERSION_2022_3 = '2022.3@1'
export const VERSION_2_6_1 = '2.6@1'
export const VERSION_2_6_2 = '2.6@2'
export const VERSION_2_6_3 = '2.6@3'
export const VERSION_2_6 = '2.6'
export const VERSION_2_2 = '2.2@1'
export const VERSION_1_4 = '1.4@1'
export const VERSION_1_0 = '1.0@1'
export const VERSION_0_0 = '0.0@1'

export function getChangesSummary(): ChangesSummaryDto {
  return {
    breaking: generateRandomDigit(),
    semiBreaking: generateRandomDigit(),
    deprecated: generateRandomDigit(),
    nonBreaking: generateRandomDigit(),
    annotation: generateRandomDigit(),
    unclassified: generateRandomDigit(),
  }
}

const OPERATION_TYPES: OperationTypeSummaryDto[] = [
  {
    apiType: 'rest',
    operationsCount: 15,
    changesSummary: getChangesSummary(),
    deprecatedCount: 3,
  },
  {
    apiType: 'graphql',
    operationsCount: 27,
    changesSummary: getChangesSummary(),
    deprecatedCount: 10,
  },
]

const OPERATION_GROUPS: OperationGroupWithApiTypeDto[] = [
  {
    groupName: 'Group1',
    isPrefixGroup: true,
    apiType: REST_API_TYPE,
    description: 'Group contains operations that are used in x-x integration',
    operationsCount: 7,
  },
  {
    groupName: 'Group2',
    isPrefixGroup: false,
    apiType: REST_API_TYPE,
    description: 'Manual Group contains operations that user adds self',
    operationsCount: 13,
  },
  {
    groupName: 'Group3',
    isPrefixGroup: false,
    apiType: GRAPHQL_API_TYPE,
    description: 'GrapQL Manual Group',
    operationsCount: 45,
  },
  {
    groupName: 'Group4',
    isPrefixGroup: true,
    apiType: GRAPHQL_API_TYPE,
    operationsCount: 200,
  },
  {
    groupName: 'Group4',
    isPrefixGroup: false,
    description: 'Empty group',
    apiType: GRAPHQL_API_TYPE,
  },
]

export const PUBLISHED_VERSION_CONTENT_2_6: PackageVersionContentDto = {
  version: VERSION_2_6_3,
  packageId: 'package-2',
  status: DRAFT_VERSION_STATUS,
  createdAt: '2022-03-25T07:02:00.943324181+03:00',
  createdBy: TOKEN_SAMPLE,
  versionLabels: [
    'version-label-1',
    'version-label-2',
  ],
  previousVersion: RELEASE_VERSION_2022_3,
  previousVersionPackageId: 'package-2',
  operationTypes: OPERATION_TYPES,
  revisionsCount: 3,
  notLatestRevision: false,
}

export const PUBLISHED_VERSION_CONTENT_2_6_1: PackageVersionContentDto = {
  version: VERSION_2_6_1,
  packageId: 'package-2',
  status: DRAFT_VERSION_STATUS,
  createdAt: '2022-03-25T07:02:00.943324181+03:00',
  createdBy: TOKEN_SAMPLE,
  versionLabels: [
    'version-label-1',
    'version-label-2',
  ],
  previousVersion: RELEASE_VERSION_2022_3,
  previousVersionPackageId: 'package-2',
  operationTypes: OPERATION_TYPES,
  revisionsCount: 3,
}

export const PUBLISHED_VERSION_CONTENT_2_6_2: PackageVersionContentDto = {
  version: VERSION_2_6_2,
  packageId: 'package-2',
  status: DRAFT_VERSION_STATUS,
  createdAt: '2022-03-25T07:02:00.943324181+03:00',
  createdBy: USER_SAMPLE,
  versionLabels: [
    'version-label-1',
    'version-label-2',
  ],
  previousVersion: RELEASE_VERSION_2022_3,
  previousVersionPackageId: 'package-2',
  operationTypes: OPERATION_TYPES,
  operationGroups: OPERATION_GROUPS,
  revisionsCount: 3,
  notLatestRevision: true,
}

export const PUBLISHED_VERSION_CONTENT_2_2: PackageVersionContentDto = {
  version: VERSION_2_2,
  packageId: 'package-0',
  status: RELEASE_VERSION_STATUS,
  createdAt: '2022-03-25T07:02:00.943324181+03:00',
  createdBy: USER_SAMPLE,
  versionLabels: [
    'version-label-1',
    'version-label-2',
  ],
  previousVersion: RELEASE_VERSION_2022_2,
  previousVersionPackageId: 'package-0',
  operationTypes: OPERATION_TYPES,
  notLatestRevision: false,
}

export const PUBLISHED_VERSION_CONTENT_1_4: PackageVersionContentDto = {
  version: VERSION_1_4,
  packageId: 'package-0',
  status: RELEASE_VERSION_STATUS,
  createdAt: '2022-03-25T07:02:00.943324181+03:00',
  createdBy: USER_SAMPLE,
  versionLabels: ['MyOrganization'],
  previousVersion: RELEASE_VERSION_2022_1,
  previousVersionPackageId: 'package-0',
  operationTypes: OPERATION_TYPES,
  operationGroups: OPERATION_GROUPS,
}

export const PUBLISHED_VERSION_CONTENT_1_0: PackageVersionContentDto = {
  version: VERSION_1_0,
  packageId: 'package-0',
  status: DRAFT_VERSION_STATUS,
  createdAt: '2022-03-25T07:02:00.943324181+03:00',
  createdBy: TOKEN_SAMPLE,
  versionLabels: ['MyOrganization'],
  previousVersion: RELEASE_VERSION_2022_1,
  previousVersionPackageId: 'package-0',
  operationTypes: OPERATION_TYPES,
  operationGroups: OPERATION_GROUPS,
}

export const PUBLISHED_VERSION_CONTENT_0_0: PackageVersionContentDto = {
  version: VERSION_0_0,
  packageId: 'package-0',
  status: ARCHIVED_VERSION_STATUS,
  createdAt: '2022-03-25T07:02:00.943324181+03:00',
  previousVersion: RELEASE_VERSION_2022_1,
  createdBy: TOKEN_SAMPLE,
  versionLabels: [
    'version-label-1',
    'version-label-2',
  ],
  operationTypes: OPERATION_TYPES,
  operationGroups: OPERATION_GROUPS,
  revisionsCount: 0,
}

export const PUBLISHED_VERSION_CONTENTS: Record<string, PackageVersionContentDto> = {
  [VERSION_2_6_1]: PUBLISHED_VERSION_CONTENT_2_6_1,
  [VERSION_2_6_2]: PUBLISHED_VERSION_CONTENT_2_6_2,
  [VERSION_2_6]: PUBLISHED_VERSION_CONTENT_2_6,
  [VERSION_2_6_3]: PUBLISHED_VERSION_CONTENT_2_6,
  [VERSION_2_2]: PUBLISHED_VERSION_CONTENT_2_2,
  [VERSION_1_4]: PUBLISHED_VERSION_CONTENT_1_4,
  [VERSION_1_0]: PUBLISHED_VERSION_CONTENT_1_0,
  [VERSION_0_0]: PUBLISHED_VERSION_CONTENT_0_0,
}
