import type { Page } from '@playwright/test'
import { Content, Tab } from '@shared/components/base'
import { OverviewSummaryTab } from './VersionOverviewTab/OverviewSummaryTab'
import { OverviewRevisionsTab } from './VersionOverviewTab/OverviewRevisionsTab'
import { OverviewPackagesTab } from './VersionOverviewTab/OverviewPackagesTab'
import { OverviewGroupsTab } from './VersionOverviewTab/OverviewGroupsTab'
import { OverviewActivityHistoryTab } from './VersionOverviewTab/OverviewActivityHistoryTab'

export class VersionOverviewTab extends Tab {

  readonly mainLocator = this.page.getByTestId('OverviewButton')
  readonly content = new Content(this.rootLocator, 'Overview Tab')
  readonly summaryTab = new OverviewSummaryTab(this.rootLocator)
  readonly activityHistoryTab = new OverviewActivityHistoryTab(this.rootLocator)
  readonly revisionsTab = new OverviewRevisionsTab(this.rootLocator)
  readonly groupsTab = new OverviewGroupsTab(this.rootLocator)
  readonly packagesTab = new OverviewPackagesTab(this.page)

  constructor(page: Page) {
    super(page.getByTestId('OverviewTab'), 'Overview')
  }
}
