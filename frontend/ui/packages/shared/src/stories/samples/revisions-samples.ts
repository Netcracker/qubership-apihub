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

import type { Revisions } from '../../entities/revisions'
import { DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS } from '../../entities/version-status'
import { USER } from '../../entities/principals'

export const revisions: Revisions = [
  {
    revision: 2,
    version: '2.6@2',
    latestRevision: false,
    status: RELEASE_VERSION_STATUS,
    createdBy: {
      type: USER,
      id: 'user1221',
      name: 'Name Surname',
      email: 'name.surname@example.com',
      avatarUrl: 'string',
    },
    createdAt: '2023-10-06T14:33:44.550622Z',
    revisionLabels: [
      'my-cloud-label',
    ],
    publishMeta: {
      commitKey: 'a5d45af7',
      repositoryUrl: 'https://git.example.com/APIHUB/apihub-registry',
      cloudName: 'my-cloud',
      cloudUrl: 'https://cloud.example.com',
      namespace: 'my-cloud-release2',
    },
  },
  {
    revision: 3,
    version: '2.6@3',
    latestRevision: true,
    status: DRAFT_VERSION_STATUS,
    createdBy: {
      type: USER,
      id: 'user1221',
      name: 'Name Surname',
      email: 'name.surname@example.com',
      avatarUrl: 'string',
    },
    createdAt: '2023-10-05T14:33:44.550622Z',
    revisionLabels: [
      'my-cloud-label',
    ],
    publishMeta: {
      commitKey: 'a5d45af7',
      repositoryUrl: 'https://git.example.com/APIHUB/apihub-registry',
      cloudName: 'my-cloud',
      cloudUrl: 'https://cloud.example.com',
      namespace: 'my-cloud-namespace',
    },
  },
]
