import type { Page } from '@playwright/test'
import { DocumentsOpenapiViewToolbar } from './DocumentsOpenapiView/DocumentsOpenapiViewToolbar'
import { DocumentsOpenapiOverviewContent } from './DocumentsOpenapiView/DocumentsOpenapiOverviewContent'
import { DocumentsOperationsTable } from './DocumentsOpenapiView/DocumentsOperationsTable'

export class DocumentsOpenapiView {

  readonly toolbar = new DocumentsOpenapiViewToolbar(this.page)
  readonly overview = new DocumentsOpenapiOverviewContent({
    locator: this.page.getByTestId('OverviewContent'),
    componentName: 'Unsupported file',
  })
  readonly table = new DocumentsOperationsTable(this.page)

  constructor(protected readonly page: Page) { }
}
