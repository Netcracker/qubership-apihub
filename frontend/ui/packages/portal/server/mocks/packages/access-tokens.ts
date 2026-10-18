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
import type { SystemTokensDto } from './types'

export const ACCESS_TOKENS_LIST: Writeable<SystemTokensDto> = {
  'apiKeys': [
    {
      id: '964eccbe-87f2-443d-8eed-665a750d6a69',
      packageId: 'CLDPKG',
      name: 'cloud',
      createdAt: '11.12.12',
      createdBy: {
        key: 'user001',
        name: 'Sergey',
        avatarUrl: 'edeeded',
      },
      roles: ['Admin'],
    },
    {
      id: '964ec5be-87f2-443d-8eed-668a750g6a59',
      packageId: 'CLDPKG',
      name: 'integration',
      createdAt: '12.12.12',
      createdBy: {
        key: 'user002',
        name: 'Ivan',
        avatarUrl: 'edeeded',
      },
      roles: ['Admin'],
    },
  ],
}
