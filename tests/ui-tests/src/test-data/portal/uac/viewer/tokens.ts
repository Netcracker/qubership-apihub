import type { PackageApiKey } from '@shared/entities'
import { TEST_USER_1 } from '@test-data'

export const TOKEN_VIEWER_GROUP: PackageApiKey = {
  name: 'Group UAC Key',
  roles: ['viewer'],
  createdFor: TEST_USER_1.id,
} as const

export const TOKEN_VIEWER_PACKAGE: PackageApiKey = {
  ...TOKEN_VIEWER_GROUP,
  name: 'Package UAC Key',
} as const

export const TOKEN_VIEWER_DASHBOARD: PackageApiKey = {
  ...TOKEN_VIEWER_GROUP,
  name: 'Dashboard UAC Key',
} as const
