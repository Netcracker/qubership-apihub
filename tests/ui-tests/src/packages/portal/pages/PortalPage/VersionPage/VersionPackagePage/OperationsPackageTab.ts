import type { Page } from '@playwright/test'
import { BasePackageTabWithOperations } from './BasePackageTabWithOperations'
import { OperationsPackageTabTable } from './OperationsPackageTab/OperationsPackageTabTable'
import { Content } from '@shared/components/base'

export class OperationsPackageTab extends BasePackageTabWithOperations {

  readonly mainLocator = this.page.getByTestId('OperationsButton')
  readonly content = new Content(this.rootLocator, 'Operations Tab')
  readonly table = new OperationsPackageTabTable(this.page)

  constructor(page: Page) {
    super(page.getByTestId('OperationsTab'), 'Operations')
  }
}
