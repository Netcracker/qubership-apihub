import type { PackageApiKey } from '@shared/entities'
import { TEST_USER_1 } from '@test-data'

export const TOKEN_EDITOR_GROUP: PackageApiKey = {
  name: 'Group UAC Key',
  roles: ['editor'],
  createdFor: TEST_USER_1.id,
} as const

export const TOKEN_EDITOR_PACKAGE: PackageApiKey = {
  ...TOKEN_EDITOR_GROUP,
  name: 'Package UAC Key',
} as const

export const TOKEN_EDITOR_DASHBOARD: PackageApiKey = {
  ...TOKEN_EDITOR_GROUP,
  name: 'Dashboard UAC Key',
} as const
