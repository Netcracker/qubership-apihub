import { type Locator, test as report } from '@playwright/test'
import { getDownloadedFile } from '@services/utils'
import { Button, Icon, TableCell, TableRow } from '@shared/components/base'
import type { DownloadedTestFile } from '@shared/entities'
import { ActivationHistoryTooltip } from './ActivationHistoryTooltip'

export class RulesetTableRow extends TableRow {
  readonly nameCell = new TableCell(
    this.mainLocator.getByTestId('Cell-ruleset-name'),
    this.componentName,
    'ruleset name cell',
  )
  readonly activationHistoryCell = new TableCell(
    this.mainLocator.getByTestId('Cell-activation-history'),
    this.componentName,
    'activation history cell',
  )
  readonly statusCell = new TableCell(this.mainLocator.getByTestId('Cell-status'), this.componentName, 'status cell')
  readonly createdAtCell = new TableCell(
    this.mainLocator.getByTestId('Cell-created-at'),
    this.componentName,
    'created at cell',
  )

  readonly infoIcon = new Icon(
    this.activationHistoryCell.mainLocator.getByTestId('InfoIcon'),
    this.componentName,
    'info icon',
  )

  private readonly controlsCellLocator = this.mainLocator.getByTestId('Cell-controls')
  readonly activateBtn = new Button(
    this.controlsCellLocator.getByTestId('ActivateButton'),
    this.componentName,
    'activate button',
  )
  readonly downloadBtn = new Button(
    this.controlsCellLocator.getByTestId('DownloadButton'),
    this.componentName,
    'download button',
  )
  readonly copyPublicUrlBtn = new Button(
    this.controlsCellLocator.getByTestId('CopyPublicUrlButton'),
    this.componentName,
    'copy public URL button',
  )
  readonly deleteBtn = new Button(
    this.controlsCellLocator.getByTestId('DeleteButton'),
    this.componentName,
    'delete button',
  )

  readonly activationHistoryTooltip = new ActivationHistoryTooltip(this.mainLocator.page(), this.componentName)

  constructor(rootLocator: Locator, componentName?: string, componentType?: string) {
    super(rootLocator, componentName, componentType || 'ruleset row')
  }

  async openActivateRulesetDialog(): Promise<void> {
    await report.step(`Open "Activate ruleset" dialog for the "${this.componentName}" ruleset`, async () => {
      await this.hover()
      await this.activateBtn.click()
    })
  }

  async downloadRuleset(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step(`Download the "${this.componentName}" ruleset`, async () => {
      const downloadPromise = this.page.waitForEvent('download')
      await this.hover()
      await this.downloadBtn.click()
      const download = await downloadPromise
      file = await getDownloadedFile(download)
    })
    return file
  }

  async copyPublicUrl(): Promise<string> {
    let str = ''
    await this.hover()
    await this.copyPublicUrlBtn.click()
    await report.step(`Copy public URL for the "${this.componentName}" ruleset`, async () => {
      await this.page.waitForTimeout(2000)
      str = await this.page.evaluate(async () => {
        return await navigator.clipboard.readText()
      })
    })
    return str
  }

  async openDeleteRulesetDialog(): Promise<void> {
    await report.step(`Open "Delete ruleset" dialog for the "${this.componentName}" ruleset`, async () => {
      await this.hover()
      await this.deleteBtn.click()
    })
  }
}
