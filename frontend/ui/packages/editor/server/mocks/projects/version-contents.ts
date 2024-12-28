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

import type { ProjectVersionContentDto } from '../../../src/entities'
import { generateRandomDigit } from '../../utils'

const SUMMARY = {
  breaking: generateRandomDigit(),
  semiBreaking: generateRandomDigit(),
  deprecate: generateRandomDigit(),
  nonBreaking: generateRandomDigit(),
  annotation: generateRandomDigit(),
  unclassified: generateRandomDigit(),
}
export const PUBLISHED_VERSION_CONTENT_2_6: ProjectVersionContentDto = {
  status: 'draft',
  publishedAt: '2022-03-25T07:02:00.943324181+03:00',
  publishedBy: 'User',
  versionLabels: [
    'version-label-1',
    'version-label-2',
  ],
  previousVersion: '2022.2',
  previousVersionPackageId: 'package-1',
  summary: SUMMARY,
  files: [
    {
      fileId: 'full-openapi.example.yaml',
      slug: 'full-openapi.example-yaml',
      title: 'Petstore OpeenApi',
      type: 'openapi-3-0',
      format: 'yaml',
    },
    {
      fileId: 'sample.postman_collection.yaml',
      slug: 'sample-postman_collection-yaml',
      title: 'Sample Postman_collection',
      type: 'openapi-3-0',
      format: 'yaml',
    },
    {
      fileId: 'readme.md',
      slug: 'readme-md',
      title: 'Readme',
      type: 'unknown',
      format: 'md',
      labels: ['API', 'MYORG'],
    },
  ],
  refs: [
    {
      refId: 'project-1',
      version: '2.2',
      versionStatus: 'release',
      name: 'Service 1',
      type: 'depend',
      kind: 'project',
      refUrl: '',
    },
    {
      refId: 'project-2',
      version: '2.2',
      versionStatus: 'release',
      name: 'Service 2',
      type: 'import',
      kind: 'project',
      refUrl: '',
    },
    {
      refId: 'group-4',
      version: '1.0',
      versionStatus: 'archived',
      name: 'Group 4',
      type: 'depend',
      kind: 'group',
      refUrl: '',
    },
    {
      refId: 'group-5',
      version: '1.0',
      versionStatus: 'archived',
      name: 'Group 5',
      type: 'import',
      kind: 'group',
      refUrl: '',
    },
  ],
}

export const PUBLISHED_VERSION_CONTENT_2_2: ProjectVersionContentDto = {
  status: 'release',
  publishedAt: '2022-03-25T07:02:00.943324181+03:00',
  publishedBy: 'User',
  versionLabels: [
    'version-label-1',
    'version-label-2',
  ],
  previousVersion: '2022.2',
  previousVersionPackageId: 'package-1',
  summary: SUMMARY,
  files: [
    {
      fileId: 'full-openapi.example.yaml',
      slug: 'full-openapi.example-yaml',
      title: 'Petstore OpeenApi',
      type: 'openapi-3-0',
      format: 'yaml',
      labels: [],
    },
    {
      fileId: 'sample.postman_collection.yaml',
      slug: 'sample-postman_collection-yaml',
      title: 'Sample Postman_collection',
      type: 'openapi-3-0',
      format: 'yaml',
      labels: [
        'MyOrganization',
        'ServiceExample',
      ],
    },
  ],
  refs: [
    {
      refId: 'project-1',
      version: '1.4',
      versionStatus: 'release',
      name: 'Service 1',
      type: 'depend',
      kind: 'project',
      refUrl: '',
    },
    {
      refId: 'project-2',
      version: '1.4',
      versionStatus: 'release',
      name: 'Service 2',
      type: 'import',
      kind: 'project',
      refUrl: '',
    },
    {
      refId: 'group-4',
      version: '1.0',
      versionStatus: 'archived',
      name: 'Group 4',
      type: 'depend',
      kind: 'group',
      refUrl: '',
    },
    {
      refId: 'group-5',
      version: '1.0',
      versionStatus: 'archived',
      name: 'Group 5',
      type: 'import',
      kind: 'group',
      refUrl: '',
    },
  ],
}

export const PUBLISHED_VERSION_CONTENT_1_4: ProjectVersionContentDto = {
  status: 'deprecated',
  publishedAt: '2022-03-25T07:02:00.943324181+03:00',
  publishedBy: 'User',
  versionLabels: ['MyOrganization'],
  previousVersion: '2022.2',
  previousVersionPackageId: 'package-1',
  summary: SUMMARY,
  files: [
    {
      fileId: 'full-openapi.example.yaml',
      slug: 'full-openapi.example-yaml',
      title: 'Petstore OpeenApi',
      type: 'openapi-3-0',
      format: 'yaml',
    },
    {
      fileId: 'sample.postman_collection.yaml',
      slug: 'sample-postman_collection-yaml',
      title: 'Sample Postman_collection',
      type: 'openapi-3-0',
      format: 'yaml',
    },
  ],
  refs: [
    {
      refId: 'project-1',
      version: '1.0',
      versionStatus: 'release',
      name: 'Service 1',
      type: 'depend',
      kind: 'project',
      refUrl: '',
    },
    {
      refId: 'project-2',
      version: '1.0',
      versionStatus: 'release',
      name: 'Service 2',
      type: 'import',
      kind: 'project',
      refUrl: '',
    },
    {
      refId: 'group-4',
      version: '1.0',
      versionStatus: 'archived',
      name: 'Group 4',
      type: 'depend',
      kind: 'group',
      refUrl: '',
    },
    {
      refId: 'group-5',
      version: '1.0',
      versionStatus: 'archived',
      name: 'Group 5',
      type: 'import',
      kind: 'group',
      refUrl: '',
    },
  ],
}

export const PUBLISHED_VERSION_CONTENT_1_0: ProjectVersionContentDto = {
  status: 'deprecated',
  publishedAt: '2022-03-25T07:02:00.943324181+03:00',
  publishedBy: 'User',
  versionLabels: ['MyOrganization'],
  previousVersion: '2022.2',
  previousVersionPackageId: 'package-1',
  summary: SUMMARY,
  files: [
    {
      fileId: 'sample.postman_collection.yaml',
      slug: 'sample-postman_collection-yaml',
      title: 'Sample Postman_collection',
      type: 'openapi-3-0',
      format: 'yaml',
    },
  ],
  refs: [
    {
      refId: 'project-1',
      version: '2.6',
      versionStatus: 'release',
      name: 'Service 1',
      type: 'depend',
      kind: 'project',
      refUrl: '',
    },
    {
      refId: 'project-2',
      version: '2.6',
      versionStatus: 'release',
      name: 'Service 2',
      type: 'import',
      kind: 'project',
      refUrl: '',
    },
    {
      refId: 'group-4',
      version: '1.0',
      versionStatus: 'archived',
      name: 'Group 4',
      type: 'depend',
      kind: 'group',
      refUrl: '',
    },
    {
      refId: 'group-5',
      version: '1.0',
      versionStatus: 'archived',
      name: 'Group 5',
      type: 'import',
      kind: 'group',
      refUrl: '',
    },
  ],
}

export const PUBLISHED_VERSION_CONTENT_0_0: ProjectVersionContentDto = {
  status: 'archived',
  publishedAt: '2022-03-25T07:02:00.943324181+03:00',
  previousVersion: '22.2',
  publishedBy: 'User',
  versionLabels: [
    'version-label-1',
    'version-label-2',
  ],
  summary: SUMMARY,
  files: [],
  refs: [],
}

export const PUBLISHED_VERSION_CONTENTS = new Map([
  ['2.2', PUBLISHED_VERSION_CONTENT_2_2],
  ['2.6', PUBLISHED_VERSION_CONTENT_2_6],
  ['1.4', PUBLISHED_VERSION_CONTENT_1_4],
  ['1.0', PUBLISHED_VERSION_CONTENT_1_0],
  ['0.0', PUBLISHED_VERSION_CONTENT_0_0],
])
