import type { DownloadedTestFile } from '@shared/entities/files'
import { type Page, test as report } from '@playwright/test'
import { DropdownMenu, ListItem } from '@shared/components/base'
import { getDownloadedFile } from '@services/utils'

export class PackageTabExportMenu extends DropdownMenu {

  readonly allItm = new ListItem(this.mainLocator.page().getByTestId('DownloadAllMenuItem'), 'All items')
  readonly filteredItm = new ListItem(this.mainLocator.page().getByTestId('DownloadFilteredMenuItem'), 'Filtered items')

  constructor(page: Page) {
    super(page.getByTestId('ExportMenuButton'), 'Export')
  }

  async downloadAll(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download All items', async () => {
      const downloadPromise = this.mainLocator.page().waitForEvent('download')
      await this.mainLocator.click()
      await this.allItm.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }

  async downloadFiltered(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download Filtered items', async () => {
      const downloadPromise = this.mainLocator.page().waitForEvent('download')
      await this.mainLocator.click()
      await this.filteredItm.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }
}
