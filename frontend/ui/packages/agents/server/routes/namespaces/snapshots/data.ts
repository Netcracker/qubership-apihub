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

import { generateRandomDigit } from '../../../utils'
import type { Writeable } from '../../../types'
import { COMPLETE_SERVICES_DTO } from '../services/data'
import type { SnapshotPublishInfoDto, SnapshotsDto } from './types'

export const SNAPSHOTS_DTO: Writeable<SnapshotsDto> = {
  packageId: 'MYPKG',
  snapshots: [
    {
      version: '2.7.0',
      previousVersion: '2.6.0',
      publishedAt: '2022-10-25T06:47:58.446681Z',
    },
    {
      version: '2.6.0',
      previousVersion: '2.5.0',
      publishedAt: '2022-10-25T06:47:58.446681Z',
    },
    {
      version: '2.5.0',
      previousVersion: '',
      publishedAt: '2022-10-25T06:47:58.446681Z',
    },
    {
      version: '2.4.0',
      previousVersion: '2.3.2',
      publishedAt: '2022-10-25T06:47:58.446681Z',
    },
    {
      version: '2.3.2',
      previousVersion: '2.3.1',
      publishedAt: '2022-10-25T06:47:58.446681Z',
    },
    {
      version: '2.3.1',
      previousVersion: '2.3.0',
      publishedAt: '2022-10-25T06:47:58.446681Z',
    },
    {
      version: '2.3.0',
      previousVersion: '2.2.0',
      publishedAt: '2022-10-25T06:47:58.446681Z',
    },
    {
      version: '2.2.0',
      previousVersion: '2.1.0',
      publishedAt: '2022-10-25T06:47:58.446681Z',
    },
    {
      version: '2.1.0',
      previousVersion: '2.0.0',
      publishedAt: '2022-10-25T06:47:58.446681Z',
    },
    {
      version: '2.0.0',
      previousVersion: '1.0.0',
      publishedAt: '2022-10-25T06:47:58.446681Z',
    },
    {
      version: '1.0.0',
      previousVersion: '0.99.0',
      publishedAt: '2022-10-25T06:47:58.446681Z',
    },
  ],
}

export const SNAPSHOT_PUBLISH_INFO_DTO: Record<string, SnapshotPublishInfoDto> = {
  '2.7.0': {
    services: [
      {
        id: 'service-id-1',
        packageId: 'MYPKG',
        viewChangesUrl: 'https://apihub.example.com',
        viewSnapshotUrl: 'https://apihub.example.com',
        viewBaselineUrl: 'https://apihub.example.com',
        changes: {
          breaking: generateRandomDigit(),
          semiBreaking: generateRandomDigit(),
          deprecate: generateRandomDigit(),
          nonBreaking: generateRandomDigit(),
          annotation: generateRandomDigit(),
          unclassified: generateRandomDigit(),
        },
      },
      {
        id: 'service-id-2',
        packageId: 'MYPKG',
        viewChangesUrl: 'https://apihub.example.com',
        viewSnapshotUrl: 'https://apihub.example.com',
        viewBaselineUrl: 'https://apihub.example.com',
        changes: {
          breaking: generateRandomDigit(),
          semiBreaking: generateRandomDigit(),
          deprecate: generateRandomDigit(),
          nonBreaking: generateRandomDigit(),
          annotation: generateRandomDigit(),
          unclassified: generateRandomDigit(),
        },
      },
    ],
  },
  '2.6.0': {
    services: [],
  },
  '2.5.0': {
    services: [
      {
        id: 'service-id-3',
        packageId: 'MYPKG',
        viewChangesUrl: 'https://apihub.example.com',
        viewSnapshotUrl: 'https://apihub.example.com',
        viewBaselineUrl: 'https://apihub.example.com',
      },
      {
        id: 'service-id-4',
        packageId: 'MYPKG',
        viewChangesUrl: 'https://apihub.example.com',
        viewSnapshotUrl: 'https://apihub.example.com',
        viewBaselineUrl: 'https://apihub.example.com',
      },
    ],
  },
  '2.4.0': {
    services: [],
  },
  '2.3.0': {
    services: [
      {
        id: 'service-id-5',
        packageId: 'MYPKG',
        viewChangesUrl: 'https://apihub.example.com',
        viewSnapshotUrl: 'https://apihub.example.com',
        viewBaselineUrl: 'https://apihub.example.com',
        changes: {
          breaking: generateRandomDigit(),
          semiBreaking: generateRandomDigit(),
          deprecate: generateRandomDigit(),
          nonBreaking: generateRandomDigit(),
          annotation: generateRandomDigit(),
          unclassified: generateRandomDigit(),
        },
      },
      {
        id: 'service-id-6',
        packageId: 'MYPKG',
        viewChangesUrl: 'https://apihub.example.com',
        viewSnapshotUrl: 'https://apihub.example.com',
        viewBaselineUrl: 'https://apihub.example.com',
        changes: {
          breaking: generateRandomDigit(),
          semiBreaking: generateRandomDigit(),
          deprecate: generateRandomDigit(),
          nonBreaking: generateRandomDigit(),
          annotation: generateRandomDigit(),
          unclassified: generateRandomDigit(),
        },
      },
    ],
  },
  '2.2.0': {
    services: [],
  },
  '2.0.0': {
    services: [
      {
        id: 'service-id-7',
        packageId: 'MYPKG',
        viewChangesUrl: 'https://apihub.example.com',
        viewSnapshotUrl: 'https://apihub.example.com',
        viewBaselineUrl: 'https://apihub.example.com',
      },
      {
        id: 'service-id-8',
        packageId: 'MYPKG',
        viewChangesUrl: 'https://apihub.example.com',
        viewSnapshotUrl: 'https://apihub.example.com',
        viewBaselineUrl: 'https://apihub.example.com',
      },
    ],
  },
  '1.0.0': {
    services: [],
  },
}

export const NEWLY_PUBLISHED_SNAPSHOT_PUBLISH_INFO_DTO: SnapshotPublishInfoDto = {
  // TODO: Ideally here we should use published services from request instead of `COMPLETE_SERVICES_DTO`
  services: COMPLETE_SERVICES_DTO.services.map((service) => ({
    id: service.id,
    packageId: 'MYPKG',
    viewChangesUrl: service.specs.length !== 0 ? 'https://apihub.example.com' : undefined,
    viewSnapshotUrl: 'https://apihub.example.com',
    viewBaselineUrl: 'https://apihub.example.com',
    changes: service.specs.length !== 0 ? {
      breaking: generateRandomDigit(),
      semiBreaking: generateRandomDigit(),
      deprecate: generateRandomDigit(),
      nonBreaking: generateRandomDigit(),
      annotation: generateRandomDigit(),
      unclassified: generateRandomDigit(),
    } : undefined,
  })),
}
