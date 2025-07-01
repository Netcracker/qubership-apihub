import type { Page } from '@playwright/test'
import { OperationsTabSidebar } from '@portal/components'
import { OperationsPackageTab } from '../VersionPackagePage/OperationsPackageTab'
import { OperationsDashboardTabTable } from './OperationsDashboardTab/OperationsDashboardTabTable'

export class OperationsDashboardTab extends OperationsPackageTab {

  readonly sidebar = new OperationsTabSidebar(this.page.locator('body'))
  readonly table = new OperationsDashboardTabTable(this.page)

  constructor(page: Page) {
    super(page)
  }
}
