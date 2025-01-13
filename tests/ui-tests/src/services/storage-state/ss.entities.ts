/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
