import type { Page } from '@playwright/test'
import { ContractsTabSidebar } from '@portal/components'
import { ContractsPackageTab } from '../VersionPackagePage/ContractsPackageTab'
import { ContractsDashboardTabTable } from './ContractsDashboardTab/ContractsDashboardTabTable'

export class ContractsDashboardTab extends ContractsPackageTab {
  readonly sidebar = new ContractsTabSidebar(this.page.locator('body'))
  readonly table = new ContractsDashboardTabTable(this.page)

  constructor(page: Page) {
    super(page)
  }
}
