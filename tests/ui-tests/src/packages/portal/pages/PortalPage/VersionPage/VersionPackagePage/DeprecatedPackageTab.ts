import type { Page } from '@playwright/test'
import { BasePackageTabWithOperations } from './BasePackageTabWithOperations'
import { DeprecatedPackageTabTable } from './DeprecatedPackageTab/DeprecatedPackageTabTable'
import { Content } from '@shared/components/base'

export class DeprecatedPackageTab extends BasePackageTabWithOperations {

  readonly mainLocator = this.page.getByTestId('DeprecatedButton')
  readonly content = new Content(this.rootLocator, 'Deprecated Tab')
  readonly table = new DeprecatedPackageTabTable(this.page)

  constructor(page: Page) {
    super(page.getByTestId('DeprecatedTab'), 'Deprecated')
  }
}
