import type { Version } from '@test-data/props'
import { DSH_P_OWNER_EDITING_N, DSH_P_OWNER_N } from './dashboards'
import { V_P_PKG_CHANGELOG_REST_BASE_R, V_P_PKG_CHANGELOG_REST_CHANGED_R } from '../../changelog/versions'
import { PKG_P_OWNER_EDITING_N, PKG_P_OWNER_N } from './packages'

export const V_P_PKG_UAC_OWNER_BASE_N: Version = {
  ...V_P_PKG_CHANGELOG_REST_BASE_R,
  pkg: PKG_P_OWNER_N,
  version: '0000.1',
} as const

export const V_P_PKG_UAC_OWNER_CHANGED_N: Version = {
  ...V_P_PKG_CHANGELOG_REST_CHANGED_R,
  pkg: PKG_P_OWNER_N,
  version: 'uac-owner',
  status: 'draft',
  previousVersion: V_P_PKG_UAC_OWNER_BASE_N.version,
} as const

export const V_P_PKG_UAC_OWNER_EDITING_RELEASE_N: Version = {
  ...V_P_PKG_UAC_OWNER_BASE_N,
  pkg: PKG_P_OWNER_N,
  version: '1000.1',
} as const

export const V_P_PKG_UAC_OWNER_EDITING_DRAFT_N: Version = {
  ...V_P_PKG_UAC_OWNER_BASE_N,
  pkg: PKG_P_OWNER_N,
  version: 'editing-draft',
  status: 'draft',
} as const

export const V_P_PKG_UAC_OWNER_EDITING_ARCHIVED_N: Version = {
  ...V_P_PKG_UAC_OWNER_BASE_N,
  pkg: PKG_P_OWNER_N,
  version: 'editing-archived',
  status: 'archived',
} as const

export const V_P_PKG_UAC_OWNER_DELETING_N: Version = {
  ...V_P_PKG_UAC_OWNER_EDITING_DRAFT_N,
  pkg: PKG_P_OWNER_N,
  version: 'editing-deleting',
} as const

export const V_P_PKG_UAC_OWNER_EDIT_PKG_DEF_RELEASE_N: Version = {
  ...V_P_PKG_UAC_OWNER_BASE_N,
  pkg: PKG_P_OWNER_EDITING_N,
} as const

export const V_P_DSH_UAC_OWNER_BASE_N: Version = {
  pkg: DSH_P_OWNER_N,
  version: '0000.1',
  status: 'release',
  refs: [
    { refId: PKG_P_OWNER_N.packageId, version: V_P_PKG_UAC_OWNER_BASE_N.version },
  ],
} as const

export const V_P_DSH_UAC_OWNER_CHANGED_N: Version = {
  pkg: DSH_P_OWNER_N,
  version: 'uac-owner',
  previousVersion: V_P_DSH_UAC_OWNER_BASE_N.version,
  status: 'draft',
  refs: [
    { refId: PKG_P_OWNER_N.packageId, version: V_P_PKG_UAC_OWNER_CHANGED_N.version },
  ],
} as const

export const V_P_DSH_UAC_OWNER_EDITING_RELEASE_N: Version = {
  ...V_P_DSH_UAC_OWNER_BASE_N,
  pkg: DSH_P_OWNER_N,
  version: '1000.1',
} as const

export const V_P_DSH_UAC_OWNER_EDITING_DRAFT_N: Version = {
  ...V_P_DSH_UAC_OWNER_BASE_N,
  pkg: DSH_P_OWNER_N,
  version: 'editing-draft',
  status: 'draft',
} as const

export const V_P_DSH_UAC_OWNER_EDITING_ARCHIVED_N: Version = {
  ...V_P_DSH_UAC_OWNER_BASE_N,
  pkg: DSH_P_OWNER_N,
  version: 'editing-archived',
  status: 'archived',
} as const

export const V_P_DSH_UAC_OWNER_DELETING_N: Version = {
  ...V_P_DSH_UAC_OWNER_EDITING_DRAFT_N,
  pkg: DSH_P_OWNER_N,
  version: 'editing-deleting',
} as const

export const V_P_DSH_UAC_OWNER_EDIT_DSH_DEF_RELEASE_N: Version = {
  ...V_P_DSH_UAC_OWNER_BASE_N,
  pkg: DSH_P_OWNER_EDITING_N,
} as const
