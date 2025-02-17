import type { Page } from '@playwright/test'
import { OperationsTabSidebar } from '@portal/components'
import { DeprecatedPackageTab } from '../VersionPackagePage/DeprecatedPackageTab'
import { DeprecatedDashboardTabTable } from './DeprecatedDashboardTab/DeprecatedDashboardTabTable'

export class DeprecatedDashboardTab extends DeprecatedPackageTab {

  readonly sidebar = new OperationsTabSidebar(this.page.locator('body'))
  readonly table = new DeprecatedDashboardTabTable(this.page)

  constructor(page: Page) {
    super(page)
  }
}
