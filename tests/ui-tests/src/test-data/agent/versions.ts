import {
  FILE_A_ANNOTUNCLAS,
  FILE_A_MULTI_CHANGES,
  FILE_A_NO_CHANGES,
  FILE_A_NON_BREAKING,
} from '@test-data/agent/files'
import type { Version } from '@test-data/props'
import { TEST_SERVICE_1_IMM } from './packages'

export const V_A_NO_CHANGES: Version = {
  pkg: TEST_SERVICE_1_IMM,
  version: '0001.1',
  status: 'release',
  files: [{ file: FILE_A_NO_CHANGES }],
} as const

export const V_A_MULTI_CHANGES: Version = {
  pkg: TEST_SERVICE_1_IMM,
  version: '0002.1',
  status: 'release',
  files: [{ file: FILE_A_MULTI_CHANGES }],
} as const

export const V_A_NON_BREAKING: Version = {
  pkg: TEST_SERVICE_1_IMM,
  version: '0003.1',
  status: 'release',
  files: [{ file: FILE_A_NON_BREAKING }],
} as const

export const V_A_ANNOTUNCLAS: Version = {
  pkg: TEST_SERVICE_1_IMM,
  version: '0004.1',
  status: 'release',
  files: [{ file: FILE_A_ANNOTUNCLAS }],
} as const
