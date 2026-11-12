import type { Tokens } from '../../types/tokens'

export const TOKENS_LIST: Tokens = [
  {
    key: '1',
    packageKey: '1',
    name: 'cloud',
    createdAt: '11.12.12',
    createdBy: {
      key: '1',
      name: 'Sergey',
      avatarUrl: '',
    },
    createdFor: {
      key: '1',
      name: 'Sergey',
      avatarUrl: '',
    },
    roles: ['Admin'],
  },
  {
    key: '2',
    packageKey: '2',
    name: 'integration',
    createdAt: '11.12.12',
    createdBy: {
      key: '3',
      name: 'User 2',
      avatarUrl: '',
    },
    createdFor: {
      key: '1',
      name: 'User 3',
      avatarUrl: '',
    },
    roles: ['Admin'],
  },
  {
    key: '3',
    packageKey: '3',
    name: 'cloud',
    createdAt: '11.12.12',
    createdBy: {
      key: '3',
      name: 'Sergey',
      avatarUrl: '',
    },
    createdFor: {
      key: '1',
      name: 'Sergey',
      avatarUrl: '',
    },
    roles: ['Admin'],
  },
  {
    key: '4',
    packageKey: '4',
    name: 'test',
    createdAt: '11.12.12',
    createdBy: {
      key: '4',
      name: 'Sergey',
      avatarUrl: '',
    },
    createdFor: {
      key: '1',
      name: 'User 44',
      avatarUrl: '',
    },
    roles: ['Admin'],
  },
]
