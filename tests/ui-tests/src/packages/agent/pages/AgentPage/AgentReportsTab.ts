import { type Page } from '@playwright/test'
import { Button, Tab, TabButton } from '@shared/components/base'
import { RunGatewayReportDialog } from './ReportsTab/RunGatewayReportDialog'
import { AgentReportRow } from './ReportsTab/AgentReportRow'

export class AgentReportsTab extends Tab {

  readonly authReportTabBtn = new TabButton(this.page.getByTestId('TabButton-authentication-report'), 'Authentication Check Report')
  readonly gatewayReportTabBtn = new TabButton(this.page.getByTestId('TabButton-routing-report'), 'Gateway Routing Report')
  readonly runReportBtn = new Button(this.page.getByTestId('RunReportButton'), 'Run Report')
  readonly runGatewayReportDialog = new RunGatewayReportDialog(this.page)

  constructor(page: Page) {
    super(page.getByTestId('SecurityReportsTabButton'), 'Security Reports')
  }

  getReportRow(nth?: number): AgentReportRow {
    if (nth) {
      return new AgentReportRow(this.page.getByTestId('Cell-date').locator('..').nth(nth - 1))
    }
    return new AgentReportRow(this.page.getByTestId('Cell-date').locator('..'))
  }
}
