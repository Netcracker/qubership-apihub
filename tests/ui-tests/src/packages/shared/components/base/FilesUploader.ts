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
