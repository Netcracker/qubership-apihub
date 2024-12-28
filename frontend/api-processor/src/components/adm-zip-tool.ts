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

import { ZipTool } from './package'
import AdmZip from 'adm-zip'

export class AdmZipTool implements ZipTool {
  zip: AdmZip = new AdmZip()
  folderName: string

  constructor(folderName: string = '', zip?: AdmZip | null) {
    if (zip) {
      this.zip = zip
    }
    this.folderName = folderName
  }

  async buildResult(): Promise<any> {
    return await this.zip.toBufferPromise()
  }

  async file(path: string, content: object | string | Blob): Promise<void> {
    const pathWithFolder = this.folderName ? `${this.folderName}/${path}` : path
    if (content instanceof Blob) {
      this.zip.addFile(
        pathWithFolder,
        Buffer.from(await content.arrayBuffer()),
      )
      return
    }
    this.zip.addFile(
      pathWithFolder,
      Buffer.from(typeof content === 'string' ? content : JSON.stringify(content)),
    )
  }

  folder(name: string): ZipTool {
    return new AdmZipTool(name, this.zip)
  }
}
