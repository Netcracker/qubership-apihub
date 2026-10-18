import type { Page } from '@playwright/test'
import { DocumentsOasOverview } from './DocumentsOasView/DocumentsOasOverview'
import { DocumentsOperationsTable } from './DocumentsOasView/DocumentsOperationsTable'

export class DocumentsOasView {

  readonly overview = new DocumentsOasOverview({
    locator: this.page.getByTestId('OverviewContent'),
    componentName: 'Overview',
  })
  readonly table = new DocumentsOperationsTable(this.page)

  constructor(protected readonly page: Page) { }
}
