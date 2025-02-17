import type { Locator } from '@playwright/test'
import { DropdownMenu, ListItem } from '@shared/components/base'

export class AgentDownloadReportMenu extends DropdownMenu {

  readonly downloadReportItm = new ListItem(this.mainLocator.page().getByTestId('Option-download-report'), 'Download Report')
  readonly downloadSourcesItm = new ListItem(this.mainLocator.page().getByTestId('Option-download-sources'), 'Download Sources')

  constructor(rootLocator: Locator) {
    super(rootLocator.getByTestId('DownloadMenuButton'), 'Download Report')
  }
}
