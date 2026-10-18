import { type Page, test as report } from '@playwright/test'
import { createItemGetter, getDownloadedFile, type ItemGetterConfig } from '@services/utils'
import { BaseComponent, Button, Chip, Content } from '@shared/components/base'
import { BaseDialog } from '@shared/components/custom/dialogs/base/BaseDialog'
import type { DownloadedTestFile } from '@shared/entities'

export class RulesetInfoDialog extends BaseDialog {
  readonly closeBtn = new Button(this.rootLocator.getByTestId('CloseRulesetInfoDialogButton'), 'Close')
  readonly apiTypeChip = new Chip(this.rootLocator.getByTestId('ValidationRulesetApiTypeChip'), 'API type')
  readonly statusChip = new Chip(this.rootLocator.getByTestId('ValidationRulesetStatusChip'), 'Status')
  readonly rulesetFile = new Content(this.rootLocator.getByTestId('RulesetFileNameContainer'), 'Ruleset file')
  readonly downloadBtn = new Button(this.rootLocator.getByTestId('DownloadButton'), 'Download')
  readonly copyPublicUrlBtn = new Button(this.rootLocator.getByTestId('CopyPublicUrlButton'), 'Copy public URL')

  private readonly activationRecordConfig: ItemGetterConfig<BaseComponent> = {
    constructor: BaseComponent,
    rootLocator: this.rootLocator.getByTestId('Cell-activationHistory'),
    componentTypes: {
      singular: 'activation record',
      plural: 'activation records',
    },
  }

  readonly getActivationRecord = createItemGetter(this.activationRecordConfig)

  constructor(page: Page) {
    super(page)
  }

  async downloadRuleset(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download ruleset file', async () => {
      const downloadPromise = this.page.waitForEvent('download')
      await this.downloadBtn.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }

  async copyPublicUrl(): Promise<string> {
    let url = ''
    await report.step('Copy public URL to clipboard', async () => {
      await this.copyPublicUrlBtn.click()
      await this.page.waitForTimeout(500)
      url = await this.page.evaluate(async () => {
        return await navigator.clipboard.readText()
      })
    })
    return url
  }
}
