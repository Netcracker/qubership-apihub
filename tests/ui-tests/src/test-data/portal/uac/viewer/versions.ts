import type { Version } from '@test-data/props'
import { DSH_P_VIEWER_R } from './dashboards'
import { V_P_PKG_CHANGELOG_REST_BASE_R, V_P_PKG_CHANGELOG_REST_CHANGED_R } from '../../changelog/versions'
import { PKG_P_VIEWER_R } from './packages'

export const V_P_PKG_UAC_VIEWER_BASE_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_BASE_R,
  pkg: PKG_P_VIEWER_R,
  version: '2000.1',
} as const

export const V_P_PKG_UAC_VIEWER_CHANGED_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_CHANGED_R,
  pkg: PKG_P_VIEWER_R,
  version: 'uac-viewer',
  status: 'draft',
  previousVersion: V_P_PKG_UAC_VIEWER_BASE_R.version,
} as const

export const V_P_DSH_UAC_VIEWER_BASE_R: Version = {
  pkg: DSH_P_VIEWER_R,
  version: '2000.1',
  status: 'release',
  refs: [
    { refId: PKG_P_VIEWER_R.packageId, version: V_P_PKG_UAC_VIEWER_BASE_R.version },
  ],
} as const

export const V_P_DSH_UAC_VIEWER_CHANGED_R: Version = {
  pkg: DSH_P_VIEWER_R,
  version: 'uac-viewer',
  previousVersion: V_P_DSH_UAC_VIEWER_BASE_R.version,
  status: 'draft',
  refs: [
    { refId: PKG_P_VIEWER_R.packageId, version: V_P_PKG_UAC_VIEWER_CHANGED_R.version },
  ],
} as const
