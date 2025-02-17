import { type Locator, test as report } from '@playwright/test'
import { ListItem } from '@shared/components/base'
import { OpenapiDownloadMenu } from '../../OpenapiDownloadMenu'

export class DocumentsOpenapiActionMenu extends OpenapiDownloadMenu {

  readonly componentType: string = 'action menu'

  readonly previewDocItm = new ListItem(this.page.getByTestId('PreviewDocumentMenuItem'), 'Preview document')
  readonly downloadZipItm = new ListItem(this.page.getByTestId('DownloadZipMenuItem'), 'Download (zip)')
  readonly shareSourceLinkItm = new ListItem(this.page.getByTestId('ShareSourceLinkMenuItem'), 'Public link to source')
  readonly shareDocPageItm = new ListItem(this.page.getByTestId('ShareDocumentLinkMenuItem'), 'Link to document page')
  readonly sharePageTemplateItm = new ListItem(this.page.getByTestId('ShareTemplateMenuItem'), 'Page template')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }

  async shareSourceLink(): Promise<string> {
    let str = ''
    await report.step('Get public link to source', async () => {
      await this.shareSourceLinkItm.click()
      await this.page.waitForTimeout(2000)
      str = await this.mainLocator.evaluate('navigator.clipboard.readText()')
    })
    return str
  }

  async shareDocPageLink(): Promise<string> {
    let str = ''
    await report.step('Get link to the document', async () => {
      await this.shareDocPageItm.click()
      await this.page.waitForTimeout(2000)
      str = await this.mainLocator.evaluate('navigator.clipboard.readText()')
    })
    return str
  }

  async sharePageTemplate(): Promise<string> {
    let str = ''
    await report.step('Get link to the page template', async () => {
      await this.sharePageTemplateItm.click()
      await this.page.waitForTimeout(2000)
      str = await this.mainLocator.evaluate('navigator.clipboard.readText()')
    })
    return str
  }
}
