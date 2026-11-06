import type { Page } from '@playwright/test'
import { Content, Link } from '@shared/components/base'

export class OverviewSummaryContent {

  readonly currentVersion = new Content(this.page.getByTestId('CurrentVersionTypography'), 'Current Version')
  readonly revision = new Content(this.page.getByTestId('RevisionTypography'), 'Revision')
  readonly revisionLink = new Link(this.page.getByTestId('RevisionTypography').getByRole('link'), 'Revisions Count')
  readonly previousVersion = new Content(this.page.getByTestId('PreviousVersionTypography'), 'Previous Version')
  readonly publishedBy = new Content(this.page.getByTestId('PublishedByTypography'), 'Published by')
  readonly publicationDate = new Content(this.page.getByTestId('PublicationDateTypography'), 'Publication Date')

  constructor(private readonly page: Page) { }
}
