import type { Version } from '@test-data/props'
import { PK11, PK12, PK14, PK15 } from '../packages'
import { D11 } from '../dashboards'
import {
  FILE_P_GQL_SMALL_CHANGELOG_BASE,
  FILE_P_GQL_SMALL_CHANGELOG_CHANGED,
  FILE_P_PET30_CHANGELOG_BASE,
  FILE_P_PET30_CHANGELOG_CHANGED,
  FILE_P_PETSTORE20,
  FILE_P_PETSTORE20_CHANGELOG_BASE,
  FILE_P_PETSTORE20_CHANGELOG_CHANGED,
  FILE_P_PETSTORE30_CHANGELOG_ANNOTUNCLAS,
  FILE_P_PETSTORE30_CHANGELOG_BASE,
  FILE_P_PETSTORE30_CHANGELOG_CHANGED,
  FILE_P_PETSTORE30_CHANGELOG_DIFF_OPERATIONS,
  FILE_P_STORE30_CHANGELOG_BASE,
  FILE_P_USER30_CHANGELOG_BASE,
  FILE_P_USER30_CHANGELOG_CHANGED,
} from '../files'

export const V_P_PKG_CHANGELOG_MULTI_BASE_R: Version = {
  pkg: PK11,
  version: '2220.1',
  status: 'release',
  files: [
    { file: FILE_P_PETSTORE30_CHANGELOG_BASE },
    { file: FILE_P_GQL_SMALL_CHANGELOG_BASE },
  ],
} as const

export const V_P_PKG_CHANGELOG_MULTI_INTERMEDIATE_R: Version = {
  ...V_P_PKG_CHANGELOG_MULTI_BASE_R,
  version: '2220.2',
  status: 'release',
  previousVersion: V_P_PKG_CHANGELOG_MULTI_BASE_R.version,
} as const

export const V_P_PKG_CHANGELOG_REST_BASE_R: Version = {
  pkg: PK11,
  version: '2221.1',
  status: 'release',
  files: [{ file: FILE_P_PETSTORE30_CHANGELOG_BASE }],
} as const

export const V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_BASE_R,
  version: '0000.1',
  previousVersion: V_P_PKG_CHANGELOG_REST_BASE_R.version,
} as const

export const V_P_PKG_CHANGELOG_REST_NO_CHANGES_R: Version = {
  pkg: PK11,
  version: 'changelog-rest-no-changes',
  previousVersion: V_P_PKG_CHANGELOG_REST_BASE_R.version,
  status: 'draft',
  files: [{ file: FILE_P_PETSTORE30_CHANGELOG_BASE }],
} as const

export const V_P_PKG_CHANGELOG_REST_TWO_DOCS_R: Version = {
  pkg: PK11,
  version: 'changelog-rest-two-docs',
  previousVersion: V_P_PKG_CHANGELOG_REST_BASE_R.version,
  status: 'draft',
  files: [
    { file: FILE_P_PETSTORE20 },
    { file: FILE_P_PETSTORE30_CHANGELOG_CHANGED, fileId: FILE_P_PETSTORE30_CHANGELOG_BASE.name },
  ],
} as const

export const V_P_PKG_CHANGELOG_REST_CHANGED_R: Version = {
  pkg: PK11,
  version: '0000.2',
  previousVersion: V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R.version,
  status: 'release',
  files: [{ file: FILE_P_PETSTORE30_CHANGELOG_CHANGED, fileId: FILE_P_PETSTORE30_CHANGELOG_BASE.name }],
} as const

export const V_P_PKG_CHANGELOG_REST_CHANGED_PK12_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_CHANGED_R,
  pkg: PK12,
  previousVersion: '',
} as const

export const V_P_PKG_CHANGELOG_REST_ANNOTUNCLAS_R: Version = {
  pkg: PK11,
  version: 'changelog-rest-annotunclas',
  previousVersion: V_P_PKG_CHANGELOG_REST_BASE_R.version,
  status: 'draft',
  files: [{ file: FILE_P_PETSTORE30_CHANGELOG_ANNOTUNCLAS }],
} as const

export const V_P_PKG_CHANGELOG_REST_DIFF_OPERATIONS_R: Version = {
  pkg: PK11,
  version: 'changelog-rest-different-operations',
  status: 'draft',
  files: [{ file: FILE_P_PETSTORE30_CHANGELOG_DIFF_OPERATIONS }],
} as const

export const V_P_PKG_CHANGELOG_MULTI_CHANGED_R: Version = {
  pkg: PK11,
  version: 'changelog-multi',
  previousVersion: V_P_PKG_CHANGELOG_MULTI_INTERMEDIATE_R.version,
  status: 'draft',
  files: [
    { file: FILE_P_PETSTORE30_CHANGELOG_CHANGED, fileId: FILE_P_PETSTORE30_CHANGELOG_BASE.name },
    { file: FILE_P_GQL_SMALL_CHANGELOG_CHANGED, fileId: FILE_P_GQL_SMALL_CHANGELOG_BASE.name },
  ],
} as const

export const V_P_PKG_FOR_DASHBOARDS_REST_BASE_R: Version = {
  pkg: PK12,
  version: '2300.1',
  status: 'release',
  files: [{ file: FILE_P_PETSTORE20_CHANGELOG_BASE }],
} as const

export const V_P_PKG_FOR_DASHBOARDS_GQL_R: Version = {
  pkg: PK14,
  version: '1000.1',
  status: 'release',
  files: [{ file: FILE_P_GQL_SMALL_CHANGELOG_BASE }],
} as const

export const V_P_PKG_FOR_DASHBOARDS_REST_CHANGED_R: Version = {
  pkg: PK12,
  version: 'pkg-for-dash-changelog-rest',
  previousVersion: V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.version,
  status: 'draft',
  files: [{ file: FILE_P_PETSTORE20_CHANGELOG_CHANGED }],
} as const

export const V_P_PKG_FOR_DASHBOARDS_GQL_CHANGED_R: Version = {
  pkg: PK14,
  version: '1000.2',
  previousVersion: V_P_PKG_FOR_DASHBOARDS_GQL_R.version,
  status: 'release',
  files: [{ file: FILE_P_GQL_SMALL_CHANGELOG_CHANGED }],
} as const

export const V_P_DSH_CHANGELOG_REST_BASE_R: Version = {
  pkg: D11,
  version: '2321.1',
  status: 'release',
  refs: [
    { refId: PK11.packageId, version: V_P_PKG_CHANGELOG_REST_INTERMEDIATE_R.version },
    { refId: PK12.packageId, version: V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.version },
  ],
} as const

export const V_P_DSH_CHANGELOG_REST_CHANGED_R: Version = {
  pkg: D11,
  version: 'dash-changelog-rest',
  previousVersion: V_P_DSH_CHANGELOG_REST_BASE_R.version,
  status: 'draft',
  refs: [
    { refId: PK11.packageId, version: V_P_PKG_CHANGELOG_REST_CHANGED_R.version },
    { refId: PK12.packageId, version: V_P_PKG_FOR_DASHBOARDS_REST_CHANGED_R.version },
  ],
} as const

export const V_P_DSH_COMPARISON_BASE_R: Version = {
  pkg: D11,
  version: '2340.1',
  status: 'release',
  refs: [
    { refId: PK11.packageId, version: V_P_PKG_CHANGELOG_MULTI_INTERMEDIATE_R.version },
    { refId: PK12.packageId, version: V_P_PKG_FOR_DASHBOARDS_REST_BASE_R.version },
    { refId: PK14.packageId, version: V_P_PKG_FOR_DASHBOARDS_GQL_R.version },
  ],
} as const

export const V_P_DSH_COMPARISON_CHANGED_R: Version = {
  pkg: D11,
  version: 'dash-comparison',
  status: 'draft',
  refs: [
    { refId: PK11.packageId, version: V_P_PKG_CHANGELOG_MULTI_CHANGED_R.version },
    { refId: PK12.packageId, version: V_P_PKG_FOR_DASHBOARDS_REST_CHANGED_R.version },
    { refId: PK14.packageId, version: V_P_PKG_FOR_DASHBOARDS_GQL_CHANGED_R.version },
  ],
} as const

export const V_P_PKG_REST_PREV_AFTER_CUR_BASE: Version = {
  ...V_P_PKG_CHANGELOG_REST_BASE_R,
  pkg: PK15,
  version: '0000.1',
  status: 'release',
} as const

export const V_P_PKG_REST_PREV_AFTER_CUR_CHANGED: Version = {
  ...V_P_PKG_CHANGELOG_REST_CHANGED_R,
  pkg: PK15,
  version: 'previous-after-current',
  previousVersion: V_P_PKG_REST_PREV_AFTER_CUR_BASE.version,
  status: 'draft',
} as const

export const V_P_PKG_CHANGELOG_REST_THREE_DOCS_BASE_R: Version = {
  pkg: PK15,
  version: '0003.1',
  status: 'release',
  files: [
    { file: FILE_P_PET30_CHANGELOG_BASE },
    { file: FILE_P_USER30_CHANGELOG_BASE },
    { file: FILE_P_STORE30_CHANGELOG_BASE },
  ],
} as const

export const V_P_PKG_CHANGELOG_REST_THREE_DOCS_CHANGED_R: Version = {
  ...V_P_PKG_CHANGELOG_REST_THREE_DOCS_BASE_R,
  version: 'changelog-rest-three-docs',
  previousVersion: V_P_PKG_CHANGELOG_REST_THREE_DOCS_BASE_R.version,
  status: 'draft',
  files: [
    { file: FILE_P_PET30_CHANGELOG_CHANGED },
    { file: FILE_P_USER30_CHANGELOG_CHANGED },
    { file: FILE_P_STORE30_CHANGELOG_BASE },
  ],
} as const

export const V_P_PKG_CHANGELOG_MULTI_DEL_GQL_R: Version = {
  ...V_P_PKG_CHANGELOG_MULTI_BASE_R,
  version: 'changelog-del-graphql',
  previousVersion: V_P_PKG_CHANGELOG_MULTI_BASE_R.version,
  status: 'draft',
  files: [
    { file: FILE_P_PETSTORE30_CHANGELOG_BASE },
  ],
} as const
