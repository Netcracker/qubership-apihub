import type { Page } from '@playwright/test'
import { ContractsTabSidebar } from '@portal/components'
import { ApiChangesPackageTab } from '../VersionPackagePage/ApiChangesPackageTab'
import { ApiChangesDashboardTabTable } from './ApiChangesDashboardTab/ApiChangesDashboardTabTable'

export class ApiChangesDashboardTab extends ApiChangesPackageTab {

  readonly sidebar = new ContractsTabSidebar(this.page.locator('body'))
  readonly table = new ApiChangesDashboardTabTable(this.page)

  constructor(page: Page) {
    super(page)
  }
}
