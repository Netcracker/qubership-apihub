import type { Page } from '@playwright/test'
import { DocumentsPackageTabSidebar } from './DocumentsPackageTab/DocumentsPackageTabSidebar'
import { DocumentsMdView } from './DocumentsPackageTab/DocumentsPackageTabViews/DocumentsMdView'
import { DocumentsJsonSchemaView } from './DocumentsPackageTab/DocumentsPackageTabViews/DocumentsJsonSchemaView'
import { DocumentsFileView } from './DocumentsPackageTab/DocumentsPackageTabViews/DocumentsFileView'
import { DocumentsOpenapiView } from './DocumentsPackageTab/DocumentsPackageTabViews/DocumentsOpenapiView'
import { Content, Tab } from '@shared/components/base'

export class DocumentsPackageTab extends Tab {

  readonly mainLocator = this.page.getByTestId('DocumentsButton')
  readonly content = new Content(this.rootLocator, 'Documents Tab')
  readonly sidebar = new DocumentsPackageTabSidebar(this.page)
  readonly openapiView = new DocumentsOpenapiView(this.page)
  readonly mdView = new DocumentsMdView(this.page)
  readonly jsonSchemaView = new DocumentsJsonSchemaView(this.page)
  readonly fileView = new DocumentsFileView(this.page)

  constructor(page: Page) {
    super(page.getByTestId('DocumentsTab'), 'Documents')
  }
}
