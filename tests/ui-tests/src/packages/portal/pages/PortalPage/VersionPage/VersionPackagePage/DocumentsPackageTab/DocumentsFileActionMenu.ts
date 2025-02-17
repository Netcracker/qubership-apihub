import { type Locator, test as report } from '@playwright/test'
import type { DownloadedTestFile } from '@shared/entities/files'
import { DropdownMenu, ListItem } from '@shared/components/base'
import { getDownloadedFile } from '@services/utils'

export class DocumentsFileActionMenu extends DropdownMenu {

  readonly downloadItm = new ListItem(this.page.getByTestId('DownloadMenuItem'), 'HTML interactive')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'action menu')
  }

  async download(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download source', async () => {
      const downloadPromise = this.page.waitForEvent('download')
      await this.downloadItm.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }
}
