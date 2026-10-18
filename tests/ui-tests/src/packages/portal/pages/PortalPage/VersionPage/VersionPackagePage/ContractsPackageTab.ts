import type { Page } from '@playwright/test'
import { Content } from '@shared/components/base'
import { ContractsPackageTabTable } from './ContractsPackageTab/ContractsPackageTabTable'
import { BasePackageTabWithOperations } from './BasePackageTabWithOperations'

export class ContractsPackageTab extends BasePackageTabWithOperations {
  readonly mainLocator = this.page.getByTestId('ContractsButton')
  readonly content = new Content(this.rootLocator, 'Contracts Tab')
  readonly table = new ContractsPackageTabTable(this.page)

  constructor(page: Page) {
    super(page.getByTestId('ContractsTab'), 'Contracts')
  }
}
