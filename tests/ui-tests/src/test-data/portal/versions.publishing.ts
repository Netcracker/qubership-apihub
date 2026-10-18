import type { Version } from '@test-data/props'
import { PK_PUB_IMM_1, PK_PUB_VAR_2 } from './packages'
import { FILE_P_MARKDOWN, FILE_P_PETSTORE20, FILE_P_PETSTORE30 } from './files'

export const V_P_PKG_EDITING_SEARCH_R: Version = {
  pkg: PK_PUB_IMM_1,
  version: 'editing-search',
  status: 'draft',
  files: [
    { file: FILE_P_PETSTORE30, labels: ['atui-label'] },
    { file: FILE_P_PETSTORE20 },
    { file: FILE_P_MARKDOWN },
  ],
} as const

export const V_P_PKG_EDITING_FOR_NEW_REVISION_N: Version = {
  pkg: PK_PUB_VAR_2,
  version: '2000.1',
  status: 'release',
  files: [{ file: FILE_P_PETSTORE30 }],
} as const

export const V_P_PKG_EDITING_FOR_NEW_VERSION_N: Version = {
  pkg: PK_PUB_VAR_2,
  version: '2000.2',
  status: 'release',
  files: [{ file: FILE_P_PETSTORE30 }],
} as const
