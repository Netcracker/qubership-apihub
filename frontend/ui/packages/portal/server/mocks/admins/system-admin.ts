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
