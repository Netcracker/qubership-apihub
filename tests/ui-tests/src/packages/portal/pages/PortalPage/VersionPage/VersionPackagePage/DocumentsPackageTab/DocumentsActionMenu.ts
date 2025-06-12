import { type Locator, test as report } from '@playwright/test'
import { DropdownMenu, ListItem } from '@shared/components/base'
import { MenuItem } from '@shared/components/base/list-items/MenuItem'
import { PUBLISH_TIMEOUT } from '@test-setup'
import type { DownloadedTestFile } from '@shared/entities'
import { getDownloadedFile } from '@services/utils'

export class DocumentsActionMenu extends DropdownMenu {

  readonly componentType: string = 'action menu'

  readonly previewItm = new MenuItem(this.page.getByTestId('PreviewMenuItem'), 'Preview')
  readonly exportItm = new MenuItem(this.page.getByTestId('ExportMenuItem'), 'Export')
  readonly downloadItm = new MenuItem(this.page.getByTestId('DownloadMenuItem'), 'Download')
  readonly copyPublicLinkItm = new ListItem(this.page.getByTestId('CopyPublicLinkMenuItem'), 'Copy public link to source')
  readonly copyPageTemplateItm = new ListItem(this.page.getByTestId('CopyPageTemplateMenuItem'), 'Copy page template')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }

  async performDownload(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download', async () => {
      const downloadPromise = this.page.waitForEvent('download', { timeout: PUBLISH_TIMEOUT })
      await this.downloadItm.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }

  async copyPublicLink(): Promise<string> {
    let str = ''
    await report.step('Copy public link to source', async () => {
      await this.copyPublicLinkItm.click()
      await this.page.waitForTimeout(2000)
      str = await this.mainLocator.evaluate('navigator.clipboard.readText()')
    })
    return str
  }

  async copyPageTemplate(): Promise<string> {
    let str = ''
    await report.step('Copy page template', async () => {
      await this.copyPageTemplateItm.click()
      await this.page.waitForTimeout(2000)
      str = await this.mainLocator.evaluate('navigator.clipboard.readText()')
    })
    return str
  }
}
