import type { DownloadedTestFile } from '@shared/entities/files'
import { type Locator, test as report } from '@playwright/test'
import { DropdownMenu, ListItem } from '@shared/components/base'
import { getDownloadedFile } from '@services/utils'

export class OpenapiDownloadMenu extends DropdownMenu {

  readonly downloadZipItm = new ListItem(this.page.getByTestId('InteractiveHtmlMenuItem'), 'HTML interactive')
  readonly downloadYamlItm = new ListItem(this.page.getByTestId('DownloadYamlMenuItem'), 'Download as yaml')
  readonly downloadJsonItm = new ListItem(this.page.getByTestId('DownloadJsonMenuItem'), 'Download as json')
  readonly downloadYamlInlineRefsItm = new ListItem(this.page.getByTestId('DownloadYamlInlineRefsMenuItem'), 'Download as yaml (inline refs)')
  readonly downloadJsonInlineRefsItm = new ListItem(this.page.getByTestId('DownloadJsonInlineRefsMenuItem'), 'Download as json (inline refs)')

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType)
  }

  async downloadZip(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download document as zip', async () => {
      const downloadPromise = this.page.waitForEvent('download')
      await this.downloadZipItm.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }

  async downloadYaml(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download document as yaml', async () => {
      const downloadPromise = this.page.waitForEvent('download')
      await this.downloadYamlItm.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }

  async downloadJson(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download document as json', async () => {
      const downloadPromise = this.page.waitForEvent('download')
      await this.downloadJsonItm.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }

  async downloadYamlInlineRefs(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download document as yaml (inline refs)', async () => {
      const downloadPromise = this.page.waitForEvent('download')
      await this.downloadYamlInlineRefsItm.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }

  async downloadJsonInlineRefs(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download document as json (inline refs)', async () => {
      const downloadPromise = this.page.waitForEvent('download')
      await this.downloadJsonInlineRefsItm.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }
}
