import type { Page } from '@playwright/test'
import { BasePackageTabWithOperations } from './BasePackageTabWithOperations'
import { ApiChangesPackageTabTable } from './ApiChangesPackageTab/ApiChangesPackageTabTable'
import { Content } from '@shared/components/base'

export class ApiChangesPackageTab extends BasePackageTabWithOperations {

  readonly mainLocator = this.page.getByTestId('ApiChangesButton')
  readonly content = new Content(this.rootLocator, 'API Changes Tab')
  readonly table = new ApiChangesPackageTabTable(this.page)

  constructor(page: Page) {
    super(page.getByTestId('ApiChangesTab'), 'API Changes')
  }
}
