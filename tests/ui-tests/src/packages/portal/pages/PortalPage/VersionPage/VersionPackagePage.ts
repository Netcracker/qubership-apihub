import type { Page } from '@playwright/test'
import { BaseVersionPage } from '../BaseVersionPage'
import { OperationsPackageTab } from './VersionPackagePage/OperationsPackageTab'
import { ApiChangesPackageTab } from './VersionPackagePage/ApiChangesPackageTab'
import { DeprecatedPackageTab } from './VersionPackagePage/DeprecatedPackageTab'
import { DocumentsPackageTab } from './VersionPackagePage/DocumentsPackageTab'

export class VersionPackagePage extends BaseVersionPage {

  readonly operationsTab = new OperationsPackageTab(this.page)
  readonly apiChangesTab = new ApiChangesPackageTab(this.page)
  readonly deprecatedTab = new DeprecatedPackageTab(this.page)
  readonly documentsTab = new DocumentsPackageTab(this.page)

  constructor(protected readonly page: Page) {
    super(page)
  }
}
