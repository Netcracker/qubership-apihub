import type { Page } from '@playwright/test'
import { DocumentsPackageTabSidebar } from './DocumentsPackageTab/DocumentsPackageTabSidebar'
import { DocumentsFileView } from './DocumentsPackageTab/DocumentsFileView'
import { DocumentsOasView } from './DocumentsPackageTab/DocumentsOasView'
import { Tab } from '@shared/components/base'
import { DocumentsViewToolbar } from './DocumentsPackageTab/DocumentsViewToolbar'
import { JsonSchemaView, MdView } from '@shared/components/custom'

export class DocumentsPackageTab extends Tab {

  readonly mainLocator = this.page.getByTestId('DocumentsButton')
  readonly toolbar = new DocumentsViewToolbar(this.page)
  readonly sidebar = new DocumentsPackageTabSidebar(this.page)
  readonly oasView = new DocumentsOasView(this.page)
  readonly jsonSchemaView = new JsonSchemaView(this.page)
  readonly mdView = new MdView(this.page)
  readonly fileView = new DocumentsFileView(this.page)

  constructor(page: Page) {
    super(page.getByTestId('DocumentsTab'), 'Documents')
  }
}
