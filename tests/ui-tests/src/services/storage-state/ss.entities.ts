import { BASE_URL } from '@test-setup'
import { SYSADMIN, TEST_USER_1 } from '@test-data'

export const SS_PATH_PREFIX = './temp/storage-state/ss-'
export const SS_SYSADMIN_PATH = `${SS_PATH_PREFIX}${BASE_URL.hostname}-${SYSADMIN.email}.json`
export const SS_USER1_PATH = `${SS_PATH_PREFIX}${BASE_URL.hostname}-${TEST_USER_1.email}.json`

export type StorageStateDto = {
  cookies: Array<CookieItem>
  origins: Array<OriginItem>
}

export type CookieItem = {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite: 'Strict' | 'Lax' | 'None'
}

export type OriginItem = {
  origin: string
  localStorage: Array<LocalStorageItem>
}

export type LocalStorageItem = {
  name: string
  value: string
}

export type PreviewState = {
  hideFilters?: boolean
  operationsViewMode?: 'detailed' | 'list'
  previewSize?: number
}
