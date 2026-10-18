import type { Page } from '@playwright/test'
import { Content } from '@shared/components/base'
import { OverviewSummaryContent } from './OverviewSummaryTabBody/OverviewSummaryContent'
import { OverviewValidationsContent } from './OverviewSummaryTabBody/OverviewValidationsContent'

export class OverviewSummaryTabBody {

  readonly labels = new Content(this.page.getByTestId('VersionLabels'), 'Version labels')
  readonly summary = new OverviewSummaryContent(this.page)
  readonly graphQl = new OverviewValidationsContent(this.page.getByTestId('ValidationsContent-graphql'))
  readonly restApi = new OverviewValidationsContent(this.page.getByTestId('ValidationsContent-rest'))

  constructor(private readonly page: Page) { }
}
