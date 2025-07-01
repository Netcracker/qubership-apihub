import { type Page, test as report } from '@playwright/test'
import { Button, Icon } from '@shared/components/base'
import { BaseDialog } from '@shared/components/custom/dialogs/base/BaseDialog'
import type { DownloadedTestFile } from '@shared/entities'
import { PUBLISH_TIMEOUT } from '@test-setup'
import { getDownloadedFile } from '@services/utils'
import { RadioButton } from '@shared/components/base/buttons/RadioButton'

export class ExportSettingsDialog extends BaseDialog {

  readonly reducedBtn = new RadioButton(this.rootLocator.locator('input[type="radio"][value="reducedSourceSpecifications"]'), 'Reduced source specifications')
  readonly combinedBtn = new RadioButton(this.rootLocator.locator('input[type="radio"][value="mergedSpecification"]'), 'Combined specification')
  readonly yamlBtn = new RadioButton(this.rootLocator.locator('input[type="radio"][value="yaml"]'), 'YAML')
  readonly jsonBtn = new RadioButton(this.rootLocator.locator('input[type="radio"][value="json"]'), 'JSON')
  readonly htmlBtn = new RadioButton(this.rootLocator.locator('input[type="radio"][value="html"]'), 'Interactive HTML')
  readonly preserveBtn = new RadioButton(this.rootLocator.locator('input[type="radio"][value="preserve"]'), 'Preserve all OAS extensions')
  readonly removeBtn = new RadioButton(this.rootLocator.locator('input[type="radio"][value="remove"]'), 'Remove OAS extensions')
  readonly exportBtn = new Button(this.rootLocator.getByTestId('ExportButton'), 'Export')
  readonly closeBtn = new Button(this.rootLocator.getByTestId('CloseButton'), 'Close')
  readonly infoIcon = new Icon(this.rootLocator.getByTestId('InfoIcon'), 'Info')

  constructor(protected readonly page: Page) {
    super(page)
  }

  async fillForm(params: ExportParams): Promise<void> {
    const { specType, fileFormat, OasExtensions } = params
    if (specType) {
      await report.step(`Set Specification type with "${specType}"`, async () => {
        switch (specType) {
          case 'reduced': {
            await this.reducedBtn.click()
            break
          }
          case 'combined': {
            await this.combinedBtn.click()
            break
          }
        }
      })
    }
    if (fileFormat) {
      await report.step(`Set File format with "${fileFormat}"`, async () => {
        switch (fileFormat) {
          case 'yaml': {
            await this.yamlBtn.click()
            break
          }
          case 'json': {
            await this.jsonBtn.click()
            break
          }
          case 'html': {
            await this.htmlBtn.click()
            break
          }
        }
      })
    }
    if (OasExtensions) {
      await report.step(`Set OpenAPI extensions with "${OasExtensions}"`, async () => {
        switch (OasExtensions) {
          case 'preserve': {
            await this.preserveBtn.click()
            break
          }
          case 'remove': {
            await this.removeBtn.click()
            break
          }
        }
      })
    }
  }

  async performExport(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Export', async () => {
      const downloadPromise = this.page.waitForEvent('download', { timeout: PUBLISH_TIMEOUT })
      await this.exportBtn.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }
}

export type ExportParams = {
  specType?: 'reduced' | 'combined'
  fileFormat?: 'yaml' | 'json' | 'html'
  OasExtensions?: 'preserve' | 'remove'
}
