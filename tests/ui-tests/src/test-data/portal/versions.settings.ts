import type { Version } from '@test-data/props'
import { PK_SETTINGS_1, PK_SETTINGS_2 } from './packages'
import { V_P_PKG_OPERATIONS_REST_R } from './versions.general'

export const V_P_PKG_SET_N: Version = {
  ...V_P_PKG_OPERATIONS_REST_R,
  pkg: PK_SETTINGS_1,
  version: '2000.1',
  status: 'release',
  metadata: { versionLabels: [] },
} as const

export const V_P_PKG_SET_FOR_DEF_RELEASE_N: Version = {
  ...V_P_PKG_SET_N,
  pkg: PK_SETTINGS_2,
} as const

export const V_P_PKG_SET_FOR_SET_RELEASE_N: Version = {
  ...V_P_PKG_SET_FOR_DEF_RELEASE_N,
  version: '2000.2',
} as const

export const V_P_PKG_SET_FOR_UPDATE_N: Version = {
  ...V_P_PKG_SET_FOR_DEF_RELEASE_N,
  version: '2000.3',
} as const

export const V_P_PKG_SET_FOR_DELETE_N: Version = {
  ...V_P_PKG_SET_FOR_DEF_RELEASE_N,
  version: '2000.4',
} as const
