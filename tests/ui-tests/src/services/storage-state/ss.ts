import type { CookieItem, LocalStorageItem, PreviewState, StorageStateDto } from './ss.entities'
import type { AuthData } from '@services/auth'
import { writeFile } from 'fs/promises'

export class StorageState {

  private cookies: Array<CookieItem>
  private origin: string
  private authorization: LocalStorageItem
  private previewState: LocalStorageItem

  constructor(storage: StorageStateDto = {
    cookies: [],
    origins: [
      {
        origin: '',
        localStorage: [],
      },
    ],
  }) {
    this.cookies = storage.cookies
    this.origin = storage.origins[0].origin || ''
    this.authorization = storage.origins[0].localStorage.find(el => el.name === 'authorization') || {
      name: '',
      value: '',
    }
    this.previewState = storage.origins[0].localStorage.find(el => el.name === 'preview-state') || {
      name: '',
      value: '',
    }
  }

  setOrigin(url: string): void {
    this.origin = url
  }

  setAuthData(auth: AuthData): void {
    this.authorization = {
      name: 'authorization',
      value: JSON.stringify(auth),
    }
  }

  setPreviewState(previewState: PreviewState): void {
    this.previewState = {
      name: 'page-settings',
      value: JSON.stringify(previewState),
    }
  }

  getOrigin(): string {
    return this.origin
  }

  getAuthData(): AuthData {
    if (this.authorization === undefined) {
      throw Error('Authorization data is undefined')
    }
    return JSON.parse(this.authorization.value)
  }

  async saveToFile(path: string): Promise<void> {
    const data = {
      cookies: this.cookies,
      origins: [
        {
          origin: this.origin,
          localStorage: [
            this.authorization,
            this.previewState,
          ],
        },
      ],
    }
    await writeFile(path, JSON.stringify(data, null, 2), 'utf8')
  }
}
