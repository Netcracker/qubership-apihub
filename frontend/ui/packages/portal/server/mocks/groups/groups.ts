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
import type { GroupsDto } from './types'

export const GROUPS: Writeable<GroupsDto> = {
  groups: [
    {
      groupId: 'group-1',
      alias: 'CLOUD',
      name: 'Group 1',
      lastVersion: '2.6',
      isFavorite: false,
    },
    {
      groupId: 'group-2',
      alias: 'CLOUD',
      name: 'Group 2',
      parentId: 'group-1',
      lastVersion: '2.2',
      isFavorite: true,
    },
    {
      groupId: 'group-3',
      alias: 'CLOUD',
      name: 'Group 3',
      parentId: 'group-2',
      isFavorite: false,
    },
    {
      groupId: 'group-4',
      alias: 'CLOUD',
      name: 'Group 4',
      isFavorite: false,
    },
    {
      groupId: 'group-5',
      alias: 'CLOUD',
      name: 'Group 5',
      isFavorite: true,
    },
    {
      groupId: 'group-6',
      alias: 'CLOUD',
      name: 'Group 6',
      parentId: 'group-4',
      isFavorite: true,
    },
  ],
}
