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

import { type Locator, test as report } from '@playwright/test'
import { BaseComponent } from './BaseComponent'
import type { SetInputFilesOptions, UploadedTestFile } from '@shared/entities'
import { quoteName } from '@services/utils'

export class FilesUploader extends BaseComponent {

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'files uploader')
  }

  async setInputFiles(file: UploadedTestFile, options?: SetInputFilesOptions): Promise<void>
  async setInputFiles(files: Array<UploadedTestFile>, options?: SetInputFilesOptions): Promise<void>
  async setInputFiles(fileOrFiles: UploadedTestFile | Array<UploadedTestFile>, options?: SetInputFilesOptions): Promise<void> {
    if (!(fileOrFiles instanceof Array)) {
      await report.step(`Set ${quoteName(fileOrFiles.name || fileOrFiles.path)} file for upload`, async () => {
        await this.mainLocator.setInputFiles(fileOrFiles.path, options)
      }, { box: true })
    } else {
      const fileNames = fileOrFiles.map((file) => quoteName(file.name) || quoteName(file.path))
      const filePaths = fileOrFiles.map((file) => file.path)
      await report.step(`Set ${fileNames.join(', ')} files for upload`, async () => {
        await this.mainLocator.setInputFiles(filePaths, options)
      }, { box: true })
    }
  }
}
