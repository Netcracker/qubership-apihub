import type { ComponentParams } from '@shared/components/types'
import type { DownloadedTestFile } from '@shared/entities/files'
import { Button, Content } from '@shared/components/base'
import { test as report } from '@playwright/test'
import { getDownloadedFile } from '@services/utils'

export class DocumentsFileContent extends Content {

  readonly downloadBtn = new Button(this.mainLocator.getByTestId('DownloadButton'), 'Download')

  constructor(protected readonly params: ComponentParams) {
    super(params.locator, params.componentName, params.componentType)
  }

  async download(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download source', async () => {
      const downloadPromise = this.mainLocator.page().waitForEvent('download')
      await this.downloadBtn.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }
}
