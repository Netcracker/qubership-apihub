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

import type { SearchResultsDto } from './types'
import { DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS } from '../packages/version-statuses'

export const PACKAGES_SEARCH_RESULT: SearchResultsDto = {
  packages: [
    {
      packageId: 'group-1',
      name: 'Service 1',
      parentPackages: ['Workspace', 'Parent Group 1', 'Parent Group 2'],
      version: '2.6',
      status: DRAFT_VERSION_STATUS,
      createdAt: '2022-03-25T07:02:00.943324181+03:00',
      serviceName: 'test-qs-name',
      labels: ['first', 'second', 'last'],
    },
    {
      packageId: 'group',
      name: 'Service with extra looooooong looooooong  looooooong name',
      parentPackages: ['Workspace', 'Parent Group 1', 'Parent Group 2', 'Parent Group 3', 'Parent Group 4', 'Parent Group 5', 'Parent Group 6'],
      version: '2.6',
      status: DRAFT_VERSION_STATUS,
      createdAt: '2022-03-25T07:02:00.943324181+03:00',
      serviceName: 'test',
      labels: ['test'],
    },
    {
      packageId: 'group-3',
      name: 'Service 3',
      parentPackages: ['Workspace', 'Parent Group 1', 'Parent Group 2', 'Parent Group 3', 'Parent Group 4', 'Parent Group 5', 'Parent Group 6'],
      version: '2.2',
      status: RELEASE_VERSION_STATUS,
      createdAt: '2022-03-25T07:02:00.943324181+03:00',
      labels: ['label'],
    },
  ],
}

export const DOCUMENTS_SEARCH_RESULT: SearchResultsDto = {
  documents: [
    {
      packageId: 'group-1',
      name: 'Service',
      parentPackages: ['Workspace', 'Parent Group 1', 'Parent Group 2'],
      version: '2.6',
      status: DRAFT_VERSION_STATUS,
      title: '1st Service',
      slug: 'openapi-v3-json',
      type: 'openapi-3-1',
      labels: ['label', 'API'],
      content: ['Example file content'],
      showMoreOption: false,
    },
    {
      packageId: 'group-1',
      name: 'Service',
      parentPackages: ['Workspace', 'Parent Group 1', 'Parent Group 2'],
      version: '2.6',
      status: DRAFT_VERSION_STATUS,
      title: '2nd Service',
      slug: 'openapi-v1-json',
      type: 'json-schema',
      labels: ['api', 'API'],
      content: ['Example file content'],
      showMoreOption: false,
    },
  ],
}

export const OPERATIONS_SEARCH_RESULT: SearchResultsDto = {
  operations: [
    {
      packageId: 'group-1',
      name: 'Service',
      parentPackages: ['Workspace', 'Parent Group 1', 'Parent Group 2'],
      version: '2.6',
      status: DRAFT_VERSION_STATUS,
      operationId: 'get-pets',
      title: 'Get Pets',
      deprecated: true,
      path: '/v1/pets',
      method: 'get',
    },
    {
      packageId: 'group-1',
      name: 'Service',
      parentPackages: ['Workspace', 'Parent Group 1', 'Parent Group 2'],
      version: '2.2',
      status: RELEASE_VERSION_STATUS,
      operationId: 'get-fruit',
      title: 'Get Fruit',
      deprecated: true,
      path: '/v1/fruit',
      method: 'get',
    },
  ],
}
