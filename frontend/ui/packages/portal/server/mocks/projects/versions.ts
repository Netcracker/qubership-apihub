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
import type { PackageVersionsDto } from './types'
import {
  VERSION_0_0,
  VERSION_1_0,
  VERSION_1_4,
  VERSION_2_2,
  VERSION_2_6_1,
  VERSION_2_6_2,
  VERSION_2_6_3,
} from '../packages/version-contents'
import { ARCHIVED_VERSION_STATUS, DRAFT_VERSION_STATUS, RELEASE_VERSION_STATUS } from '../packages/version-statuses'
import { TOKEN_SAMPLE, USER_SAMPLE } from '../packages/principal'

export const VERSIONS: Writeable<PackageVersionsDto> = {
  versions: [
    {
      version: VERSION_2_6_1,
      status: DRAFT_VERSION_STATUS,
      createdBy: USER_SAMPLE,
      createdAt: '2022-03-27T14:15:22Z',
      versionLabels: ['serviceName: app'],
      previousVersion: '2.6.1',
      summary: {
        breaking: 0,
        semiBreaking: 0,
        deprecated: 0,
        nonBreaking: 0,
        annotation: 0,
        unclassified: 0,
      },
      notLatestRevision: true,
    },
    {
      version: VERSION_2_6_2,
      status: DRAFT_VERSION_STATUS,
      createdBy: USER_SAMPLE,
      createdAt: '2022-03-27T14:15:22Z',
      versionLabels: ['serviceName: app'],
      previousVersion: '2.6.1',
      summary: {
        breaking: 0,
        semiBreaking: 0,
        deprecated: 0,
        nonBreaking: 0,
        annotation: 0,
        unclassified: 0,
      },
      notLatestRevision: true,
    },
    {
      version: VERSION_2_6_3,
      status: DRAFT_VERSION_STATUS,
      createdBy: USER_SAMPLE,
      createdAt: '2022-03-27T14:15:22Z',
      versionLabels: ['serviceName: app'],
      previousVersion: '2.6.1',
      summary: {
        breaking: 0,
        semiBreaking: 0,
        deprecated: 0,
        nonBreaking: 0,
        annotation: 0,
        unclassified: 0,
      },
      notLatestRevision: false,
    },
    {
      version: VERSION_2_2,
      status: RELEASE_VERSION_STATUS,
      createdBy: TOKEN_SAMPLE,
      createdAt: '2022-03-26T13:14:21Z',
      previousVersion: '2.2.1',
      summary: {
        breaking: 4,
        semiBreaking: 0,
        deprecated: 2,
        nonBreaking: 0,
        annotation: 0,
        unclassified: 0,
      },
    },
    {
      version: VERSION_1_4,
      status: DRAFT_VERSION_STATUS,
      createdBy: TOKEN_SAMPLE,
      createdAt: '2022-03-25T12:13:20Z',
      previousVersion: '1.4.1',
    },
    {
      version: VERSION_1_0,
      status: DRAFT_VERSION_STATUS,
      createdBy: TOKEN_SAMPLE,
      createdAt: '2022-03-24T11:12:19Z',
    },
    {
      version: VERSION_0_0,
      status: ARCHIVED_VERSION_STATUS,
      createdBy: TOKEN_SAMPLE,
      createdAt: '2022-03-24T11:12:19Z',
    },
  ],
}
