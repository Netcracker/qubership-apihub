import type { Page } from '@playwright/test'
import { BaseVersionPage } from '../BaseVersionPage'
import { OperationsDashboardTab } from './VersionDashboardPage/OperationsDashboardTab'
import { ApiChangesDashboardTab } from './VersionDashboardPage/ApiChangesDashboardTab'
import { DeprecatedDashboardTab } from './VersionDashboardPage/DeprecatedDashboardTab'
import { DocumentsDashboardTab } from './VersionDashboardPage/DocumentsDashboardTab'

export class VersionDashboardPage extends BaseVersionPage {

  readonly operationsTab = new OperationsDashboardTab(this.page)
  readonly apiChangesTab = new ApiChangesDashboardTab(this.page)
  readonly deprecatedTab = new DeprecatedDashboardTab(this.page)
  readonly documentsTab = new DocumentsDashboardTab(this.page)

  constructor(protected readonly page: Page) {
    super(page)
  }
}
