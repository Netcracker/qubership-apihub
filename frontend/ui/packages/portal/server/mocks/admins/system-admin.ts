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
import type { SystemAdminsDto } from './types'

export const SYSTEM_ADMINS_LIST: Writeable<SystemAdminsDto> = {
  admins: [
    {
      id: '12121',
      name: 'User 123',
      avatarUrl: 'https://placeholder/300',
    },
    {
      id: '344334',
      name: 'User 228',
      avatarUrl: 'https://placeholder/300',
    },
    {
      id: '655656',
      name: 'User 343',
      avatarUrl: 'https://placeholder/300',
    },
    {
      id: '655456',
      name: 'User 422',
      avatarUrl: 'https://placeholder/300',
    },
    {
      id: '44333',
      name: 'User 543',
      avatarUrl: 'https://placeholder/300',
    },
  ],
}
