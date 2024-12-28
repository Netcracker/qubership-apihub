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
import type { PackageVersionsDto } from '../../../src/entities'

export const VERSIONS: Writeable<PackageVersionsDto> = {
  versions: [
    {
      version: '2.6',
      status: 'draft',
      publishedAt: '2022-03-27T14:15:22Z',
      versionLabels: [
        'version-label-1',
        'version-label-2',
      ],
    },
    {
      version: '2.2',
      status: 'release',
      publishedAt: '2022-03-26T13:14:21Z',
    },
    {
      version: '1.4',
      status: 'deprecated',
      publishedAt: '2022-03-25T12:13:20Z',
    },
    {
      version: '1.0',
      status: 'deprecated',
      publishedAt: '2022-03-24T11:12:19Z',
    },
    {
      version: '0.0',
      status: 'archived',
      publishedAt: '2022-03-24T11:12:19Z',
    },
  ],
}
