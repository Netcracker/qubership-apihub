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

import JSZip from 'jszip'
import { ZipTool } from './package'

export class JsZipTool implements ZipTool {
  zip: JSZip = new JSZip

  constructor(zip?: JSZip | null) {
    if (zip) {
      this.zip = zip
    }
  }

  async buildResult(options?: JSZip.JSZipGeneratorOptions | undefined): Promise<any> {
    options = { ...defaultZipOptions, ...options }
    return await this.zip.generateAsync(options)
  }

  async file(path: string, content: object | string | Blob): Promise<void> {
    if (content instanceof Blob) {
      this.zip.file(path, content.arrayBuffer())
      return
    }
    this.zip.file(path, typeof content === 'string' ? content : JSON.stringify(content))
  }

  folder(name: string): ZipTool {
    return new JsZipTool(this.zip.folder(name))
  }
}

const defaultZipOptions: JSZip.JSZipGeneratorOptions<'nodebuffer'> = {
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: {
    level: 9,
  },
}
