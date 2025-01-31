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

export const VERSIONS: Writeable<PackageVersionsDto> = {
  versions: [
    // @ts-expect-error // FIXME 24.01.25
    {
      version: '2.6',
      status: 'draft',
      publishedAt: '2022-03-27T14:15:22Z',
      versionLabels: [
        'version-label-1',
        'version-label-2',
      ],
    },
    // @ts-expect-error // FIXME 24.01.25
    {
      version: '2.2',
      status: 'release',
      publishedAt: '2022-03-26T13:14:21Z',
    },
    // @ts-expect-error // FIXME 24.01.25
    {
      version: '1.4',
      status: 'draft',
      publishedAt: '2022-03-25T12:13:20Z',
    },
    // @ts-expect-error // FIXME 24.01.25
    {
      version: '1.0',
      status: 'draft',
      publishedAt: '2022-03-24T11:12:19Z',
    },
    // @ts-expect-error // FIXME 24.01.25
    {
      version: '0.0',
      status: 'archived',
      publishedAt: '2022-03-24T11:12:19Z',
    },
  ],
}
