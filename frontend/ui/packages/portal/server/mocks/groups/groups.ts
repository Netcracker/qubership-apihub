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
