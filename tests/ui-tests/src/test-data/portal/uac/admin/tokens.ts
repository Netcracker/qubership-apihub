import type { PackageApiKey } from '@shared/entities'
import { TEST_USER_1 } from '@test-data'

export const TOKEN_ADMIN_GROUP: PackageApiKey = {
  name: 'Group UAC Key',
  roles: ['admin'],
  createdFor: TEST_USER_1.id,
} as const

export const TOKEN_ADMIN_PACKAGE: PackageApiKey = {
  ...TOKEN_ADMIN_GROUP,
  name: 'Package UAC Key',
} as const

export const TOKEN_ADMIN_DASHBOARD: PackageApiKey = {
  ...TOKEN_ADMIN_GROUP,
  name: 'Dashboard UAC Key',
} as const
