import type { Locator } from '@playwright/test'
import { Tab } from '@shared/components/base'
import { OverviewSummaryTabBody } from './OverviewSummaryTab/OverviewSummaryTabBody'

export class OverviewSummaryTab extends Tab {
  readonly body = new OverviewSummaryTabBody(this.page)

  constructor(readonly rootLocator: Locator) {
    super(rootLocator.getByTestId('SummaryButton'), 'Summary')
  }
}
