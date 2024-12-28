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

import type { BranchConfigDto, BranchConflictsDto, BranchesDto } from '../../../src/entities'
import type { Writeable } from '../../types'
import type { ChangeStatus } from './types'

export const BRANCH_CONFIG: Writeable<BranchConfigDto> = {
  editors: [],
  changeType: 'updated',
  configFileId: 'apihub-config.json',
  files: [
    {
      fileId: 'sample.postman_collection.yaml',
      name: 'sample.postman_collection.yaml',
      publish: true,
      labels: ['openapi'],
      status: 'included',
    },
    {
      fileId: 'full-openapi.example.yaml',
      name: 'full-openapi.example.yaml',
      publish: true,
      labels: ['openapi', 'full-navigation'],
      status: 'included',
    },
    {
      fileId: 'readme.md',
      name: 'readme.md',
      publish: true,
      labels: ['text-api'],
      status: 'unmodified',
    },
  ],
  refs: [
    {
      refId: 'project-1',
      version: '2.6',
      versionStatus: 'draft',
      name: 'Service 1',
      refUrl: '',
      status: 'excluded',
    },
    {
      refId: 'project-2',
      version: '2.6',
      versionStatus: 'release',
      name: 'Service 2',
      refUrl: '',
      status: 'moved',
    },
    {
      refId: 'project-3',
      version: '1.4',
      versionStatus: 'deprecated',
      name: 'Service 3',
      refUrl: '',
      status: 'included',
    },
    {
      refId: 'project-4',
      version: '1.0',
      versionStatus: 'archived',
      name: 'Service 4',
      refUrl: '',
      status: 'modified',
    },
    {
      refId: 'project-5',
      version: '1.0',
      versionStatus: 'archived',
      name: 'Service 5',
      refUrl: '',
      status: 'unmodified',
    },
  ],
  permissions: ['all'],
}

export const BRANCH_CONFLICTS: Writeable<BranchConflictsDto> = {
  files: [
    'readme.md',
    'full-openapi.example.yaml',
  ],
}

export const BRANCHES: Writeable<BranchesDto> = {
  branches: [
    {
      name: 'main',
      status: 'release',
      publishedAt: '2022-04-15T14:48:20.199829914+03:00',
      version: 'v1',
      permissions: [],
    },
    {
      name: 'develop',
      status: 'deprecated',
      publishedAt: '2021-03-15T14:48:20.199829914+03:00',
      version: 'v2',
      permissions: ['all'],
    },
    {
      name: 'feature/bugfix',
      status: 'draft',
      publishedAt: '2021-03-15T14:48:20.199829914+03:00',
      version: 'v3',
      permissions: ['edit', 'save'],
    },
    {
      name: 'bugfix/hard-fix-by-production-version-37745454',
      status: 'deprecated',
      publishedAt: '2022-04-15T14:48:20.199829914+03:00',
      version: 'refs-v.080d04f9-2a59-4972-9d64-c43c1f78dca3',
      permissions: [],
    },
  ],
}

export const LAST_FILE_CHANGE_STATUSES = new Map<string, ChangeStatus>(
  BRANCH_CONFIG.files.map(file => [file.fileId, file.status]),
)
