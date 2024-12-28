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

import type { ProjectFileHistoryDto } from './types'

export const FILE_HISTORY: ProjectFileHistoryDto = {
  changes: [
    {
      commitId: '1',
      modifiedBy: {
        id: 'john.williams@example.com',
        name: 'John Williams',
        avatarUrl: '<base64-encoded image>',
      },
      modifiedAt: '2022-04-12T06:14:26-04:00',
      version: '1.8',
      publishedAt: '2022-04-14T15:50:22.834278282+03:00',
      comment: '[APIHUB] 1.5',
    },
    {
      commitId: '2',
      modifiedBy: {
        id: 'john.williams@example.com',
        name: 'John Williams',
        avatarUrl: '<base64-encoded image>',
      },
      modifiedAt: '2022-04-07T12:21:47+04:00',
      version: '1.3',
      publishedAt: '2022-04-12T09:38:38.468867767+03:00',
      comment: 'APIHUB Test Project\n',
    },
    {
      commitId: '3',
      modifiedBy: {
        id: 'petr.ivanov@example.com',
        name: 'Petr Ivanov',
        avatarUrl: '<base64-encoded image>',
      },
      modifiedAt: '2022-04-07T12:21:47+04:00',
      publishedAt: '2022-04-12T09:38:38.468867767+03:00',
      comment: 'Fix some very baaaaaaaaaaaaad bugs',
    },
  ],
}
