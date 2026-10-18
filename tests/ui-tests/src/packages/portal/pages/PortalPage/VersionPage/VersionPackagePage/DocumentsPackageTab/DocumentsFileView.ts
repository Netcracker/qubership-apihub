import { type Page, test as report } from '@playwright/test'
import type { DownloadedTestFile } from '@shared/entities/files'
import { Button } from '@shared/components/base'
import { getDownloadedFile } from '@services/utils'

export class DocumentsFileView {

  readonly downloadBtn = new Button(this.page.getByTestId('UnsupportedFilePlaceholder').getByTestId('DownloadButton'), 'Download')

  constructor(protected readonly page: Page) { }

  async performDownload(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download source', async () => {
      const downloadPromise = this.page.waitForEvent('download')
      await this.downloadBtn.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }
}
