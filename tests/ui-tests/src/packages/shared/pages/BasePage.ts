import { type Page, test as report } from '@playwright/test'
import { BaseComponent, Link } from '@shared/components/base'
import type { CloseOptions, DownloadedTestFile, GotoOptions, ReloadOptions } from '@shared/entities'
import { BASE_ORIGIN } from '@test-setup'
import { getDownloadedFile } from '@services/utils'

export class BasePage {

  readonly tooltip = new BaseComponent(this.page.getByRole('tooltip'), '', 'tooltip')

  constructor(protected readonly page: Page) { }

  async goto(url: string, options?: GotoOptions): Promise<void> {
    const _url = new URL(url, BASE_ORIGIN).toString()
    await report.step(`Go to "${url}"`, async () => {
      await this.page.goto(_url, { waitUntil: 'networkidle', ...options })
    })
  }

  async reload(options?: ReloadOptions): Promise<void> {
    await report.step(`Reload page with URL: "${this.page.url()}"`, async () => {
      await this.page.reload(options)
    })
  }

  async close(options?: CloseOptions): Promise<void> {
    await report.step('Close Page', async () => {
      await this.page.close(options)
    })
  }

  async waitForTimeout(timeout: number): Promise<void> {
    await report.step(`Wait for ${timeout / 1000} sec`, async () => {
      await this.page.waitForTimeout(timeout)
    })
  }

  getLinkByName(linkName: string, options = { exact: true }): Link {
    return new Link(this.page.getByRole('link', { name: linkName, ...options }), linkName)
  }

  async downloadFile(linkToFile: string): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step(`Download file from ${linkToFile}`, async () => {
      const downloadPromise = this.page.waitForEvent('download')
      try {
        await this.goto(linkToFile)
      } catch (e) {
        // do nothing
      }
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }

  protected async navigationStep(title: string, path: string, options?: GotoOptions): Promise<void> {
    await report.step(title, async () => {
      await this.goto(path, options)
    }, { box: true })
  }
}
