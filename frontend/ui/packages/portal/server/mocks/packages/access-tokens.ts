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
