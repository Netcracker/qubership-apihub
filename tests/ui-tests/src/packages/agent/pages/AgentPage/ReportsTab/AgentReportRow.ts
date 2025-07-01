import { type Locator, test as report } from '@playwright/test'
import type { DownloadedTestFile } from '@shared/entities'
import { Button, TableCell, TableRow } from '@shared/components/base'
import { AgentDownloadReportMenu } from './AgentReportRow/AgentDownloadReportMenu'
import { getDownloadedFile } from '@services/utils'

export class AgentReportRow extends TableRow {

  readonly dateCell = new TableCell(this.mainLocator.getByTestId('Cell-date'), 'Date')
  readonly createByCell = new TableCell(this.mainLocator.getByTestId('Cell-created-by'), 'Created By')
  readonly statusCell = new TableCell(this.mainLocator.getByTestId('Cell-status'), 'Status')
  readonly totalServicesCell = new TableCell(this.mainLocator.getByTestId('Cell-total-number-of-services'), 'Total Number of Services')
  readonly processedServicesCell = new TableCell(this.mainLocator.getByTestId('Cell-number-of-processed-services'), 'Number of Processed Services')
  readonly downloadReportBtn = new Button(this.mainLocator.getByTestId('DownloadReportButton'), 'Download Report')
  readonly downloadMenu = new AgentDownloadReportMenu(this.mainLocator)

  constructor(rootLocator: Locator) {
    super(rootLocator, '', 'report row')
  }

  async downloadAuthReport(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download Authentication Check report', async () => {
      const downloadPromise = this.mainLocator.page().waitForEvent('download')
      await this.hover()
      await this.downloadReportBtn.click()
      file = await getDownloadedFile(await downloadPromise)
    })
    return file
  }

  async downloadGatewayReport(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download Gateway Routing report', async () => {
      const downloadPromise = this.mainLocator.page().waitForEvent('download')
      await this.hover()
      await this.downloadMenu.click()
      await this.downloadMenu.downloadReportItm.click()
      file = await getDownloadedFile(await downloadPromise)
    })
    return file
  }

  async downloadGatewaySources(): Promise<DownloadedTestFile> {
    let file!: DownloadedTestFile
    await report.step('Download Gateway Routing sources', async () => {
      const downloadPromise = this.mainLocator.page().waitForEvent('download')
      await this.hover()
      await this.downloadMenu.click()
      await this.downloadMenu.downloadSourcesItm.click()
      file = await getDownloadedFile(await downloadPromise)
    })
    return file
  }
}
