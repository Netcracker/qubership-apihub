import { BASE_URL } from '@test-setup'

export interface StorageState {
  cookies: CookieItem[]
  origins: OriginItem[]
}

interface CookieItem {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite: 'Strict' | 'Lax' | 'None'
}

interface OriginItem {
  origin: string
  localStorage: LocalStorageItem[]
}

interface LocalStorageItem {
  name: string
  value: string
}

export const getStorageStatePath = (login: string): string => {
  return `./temp/storage-state/ss-${BASE_URL.hostname}-${login}.json`
}
