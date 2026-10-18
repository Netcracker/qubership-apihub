import type { PackageApiKey } from '@shared/entities'
import { TEST_USER_1 } from '@test-data'

export const TOKEN_GEN_DEFAULT: PackageApiKey = {
  name: 'Default token',
  roles: ['viewer'],
  createdFor: TEST_USER_1.id,
} as const

export const TOKEN_GEN_DEL: PackageApiKey = {
  ...TOKEN_GEN_DEFAULT,
  name: 'Token for deletion',
} as const
