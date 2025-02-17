import type { Page } from '@playwright/test'
import { OperationsTabSidebar } from '@portal/components'
import { ApiChangesPackageTab } from '../VersionPackagePage/ApiChangesPackageTab'
import { ApiChangesDashboardTabTable } from './ApiChangesDashboardTab/ApiChangesDashboardTabTable'

export class ApiChangesDashboardTab extends ApiChangesPackageTab {

  readonly sidebar = new OperationsTabSidebar(this.page.locator('body'))
  readonly table = new ApiChangesDashboardTabTable(this.page)

  constructor(page: Page) {
    super(page)
  }
}
