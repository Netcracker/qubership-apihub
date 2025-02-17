import type { Locator } from '@playwright/test'
import { OverviewSummaryTabBody } from './OverviewSummaryTab/OverviewSummaryTabBody'
import { Tab } from '@shared/components/base'

export class OverviewSummaryTab extends Tab {

  readonly body = new OverviewSummaryTabBody(this.page)

  constructor(readonly rootLocator: Locator) {
    super(rootLocator.getByTestId('SummaryButton'), 'Summary')
  }
}
