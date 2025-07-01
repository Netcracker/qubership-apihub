import type { Version } from '@test-data/props'
import { P_DSH_CP_RELEASE, P_DSH_CP_SOURCE } from './dashboards'
import { P_PK_CP_RELEASE, P_PK_CP_SOURCE } from './packages'
import {
  V_P_DSH_CHANGELOG_REST_BASE_R,
  V_P_DSH_CHANGELOG_REST_CHANGED_R,
  V_P_PKG_CHANGELOG_REST_BASE_R,
  V_P_PKG_CHANGELOG_REST_CHANGED_R,
} from '../changelog/versions'

export const V_P_PKG_COPYING_SOURCE_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_CHANGED_R,
  pkg: P_PK_CP_SOURCE,
  previousVersion: '',
  status: 'draft',
  metadata: { versionLabels: ['source-label-1', 'source-label-2'] },
} as const

export const V_P_PKG_COPYING_RELEASE_N: Version = {
  ...V_P_PKG_CHANGELOG_REST_BASE_R,
  pkg: P_PK_CP_RELEASE,
  version: '2000.1',
  metadata: { versionLabels: ['release-label-1', 'release-label-2'] },
} as const
export const V_P_DSH_COPYING_SOURCE_R: Version = {
  ...V_P_DSH_CHANGELOG_REST_CHANGED_R,
  pkg: P_DSH_CP_SOURCE,
  previousVersion: '',
  metadata: { versionLabels: ['source-label-1', 'source-label-2'] },
} as const
export const V_P_DSH_COPYING_RELEASE_N: Version = {
  ...V_P_DSH_CHANGELOG_REST_BASE_R,
  pkg: P_DSH_CP_RELEASE,
  version: '2000.1',
  metadata: { versionLabels: ['release-label-1', 'release-label-2'] },
} as const
