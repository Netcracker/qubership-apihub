import type { Page } from '@playwright/test'
import { BaseVersionPage } from '../BaseVersionPage'
import { RulesetInfoDialog } from './VersionOverviewTab/OverviewSummaryTab/components/RulesetInfoDialog'
import { ApiChangesPackageTab } from './VersionPackagePage/ApiChangesPackageTab'
import { ApiQualityTab } from './VersionPackagePage/ApiQualityTab/ApiQualityTab'
import { DeprecatedPackageTab } from './VersionPackagePage/DeprecatedPackageTab'
import { DocumentsPackageTab } from './VersionPackagePage/DocumentsPackageTab'
import { ContractsPackageTab } from './VersionPackagePage/ContractsPackageTab'

export class VersionPackagePage extends BaseVersionPage {
  readonly contractsTab = new ContractsPackageTab(this.page)
  readonly apiChangesTab = new ApiChangesPackageTab(this.page)
  readonly apiQualityTab = new ApiQualityTab(this.page)
  readonly deprecatedTab = new DeprecatedPackageTab(this.page)
  readonly documentsTab = new DocumentsPackageTab(this.page)
  readonly rulesetInfoDialog = new RulesetInfoDialog(this.page)

  constructor(protected readonly page: Page) {
    super(page)
  }
}
