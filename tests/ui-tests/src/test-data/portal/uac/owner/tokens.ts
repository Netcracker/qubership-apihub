import type { PackageApiKey } from '@shared/entities'
import { TEST_USER_1 } from '@test-data'

export const TOKEN_OWNER_GROUP: PackageApiKey = {
  name: 'Group UAC Key',
  roles: ['owner'],
  createdFor: TEST_USER_1.id,
} as const

export const TOKEN_OWNER_PACKAGE: PackageApiKey = {
  ...TOKEN_OWNER_GROUP,
  name: 'Package UAC Key',
} as const

export const TOKEN_OWNER_DASHBOARD: PackageApiKey = {
  ...TOKEN_OWNER_GROUP,
  name: 'Dashboard UAC Key',
} as const
